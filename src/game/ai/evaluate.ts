// 육목 AI — 6칸 윈도우 기반 보드 평가 + 전술 위협 탐지 (React 비의존 순수 함수)

import { BOARD_SIZE, WIN_LENGTH, type Board, type PlayerId } from "@/game/types";

const DIRS: Array<[number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

/** 6칸 윈도우 안에 한 플레이어의 돌이 k개 있을 때의 잠재력 점수 */
const POTENTIAL = [0, 2, 30, 400, 6000, 100000, 10000000];

export type Potentials = [number, number, number];

export interface Window {
  owner: PlayerId;
  count: number;
  empties: Array<[number, number]>;
}

/** 한 플레이어만 점유한(= 아직 완성 가능한) 모든 6칸 윈도우를 순회한다. */
function forEachWindow(board: Board, cb: (w: Window) => void): void {
  for (const [dr, dc] of DIRS) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const endR = r + dr * (WIN_LENGTH - 1);
        const endC = c + dc * (WIN_LENGTH - 1);
        if (endR < 0 || endR >= BOARD_SIZE || endC < 0 || endC >= BOARD_SIZE) continue;

        let owner: PlayerId | null = null;
        let count = 0;
        let mixed = false;
        const empties: Array<[number, number]> = [];
        for (let k = 0; k < WIN_LENGTH; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          const cell = board[rr][cc];
          if (cell === null) {
            empties.push([rr, cc]);
            continue;
          }
          if (owner === null) {
            owner = cell;
            count = 1;
          } else if (owner === cell) {
            count++;
          } else {
            mixed = true;
            break;
          }
        }
        if (mixed || owner === null) continue;
        cb({ owner, count, empties });
      }
    }
  }
}

/**
 * 보드 전체를 훑어 각 플레이어의 "육목 완성 잠재력"을 계산한다.
 * 다른 플레이어의 돌이 섞인 윈도우는 그 누구도 완성할 수 없으므로 0점.
 */
export function computePotentials(board: Board): Potentials {
  const pot: Potentials = [0, 0, 0];
  forEachWindow(board, (w) => {
    pot[w.owner] += POTENTIAL[w.count];
  });
  return pot;
}

/**
 * `player` 가 자기 턴에 `stones` 개를 두어 즉시 육목을 완성할 수 있는 윈도우들.
 * 5+빈칸1, 4+빈칸2 모두 (stones=2 기준) 즉시 승리 상태다.
 */
export function winningWindows(
  board: Board,
  player: PlayerId,
  stones: number,
): Window[] {
  const res: Window[] = [];
  forEachWindow(board, (w) => {
    if (w.owner !== player) return;
    if (w.count >= WIN_LENGTH) {
      res.push(w);
      return;
    }
    if (w.empties.length <= stones && w.count + w.empties.length >= WIN_LENGTH) {
      res.push(w);
    }
  });
  return res;
}

/** `player` 가 다음 자기 턴(돌 stones개)에 즉시 승리 가능한가 */
export function hasImmediateWin(
  board: Board,
  player: PlayerId,
  stones = 2,
): boolean {
  return winningWindows(board, player, stones).length > 0;
}

/** 즉시 승리 윈도우들의 빈칸(= 반드시 막아야 할 자리) 집합 */
export function criticalCells(
  board: Board,
  player: PlayerId,
  stones = 2,
): Array<[number, number]> {
  const seen = new Set<number>();
  const out: Array<[number, number]> = [];
  winningWindows(board, player, stones).forEach((w) => {
    w.empties.forEach(([r, c]) => {
      const key = r * BOARD_SIZE + c;
      if (seen.has(key)) return;
      seen.add(key);
      out.push([r, c]);
    });
  });
  return out;
}

/**
 * 전술적으로 의미 있는 자리(모든 플레이어의 3개 이상 연결 윈도우의 빈칸).
 * 단순 점수 순 top-K 밖으로 밀려나면 안 되는 차단/확장 지점들이다.
 */
export function tacticalCells(board: Board, minCount = 3): Array<[number, number]> {
  const seen = new Set<number>();
  const out: Array<[number, number]> = [];
  forEachWindow(board, (w) => {
    if (w.count < minCount) return;
    if (w.count + w.empties.length < WIN_LENGTH) return;
    w.empties.forEach(([r, c]) => {
      const key = r * BOARD_SIZE + c;
      if (seen.has(key)) return;
      seen.add(key);
      out.push([r, c]);
    });
  });
  return out;
}

/**
 * fork 위험도: `player` 가 돌 1개를 두어 "즉시 승리 윈도우"를 여러 개 만들 수 있는 자리 수.
 * (한 단계만 본다 — 깊은 fork 탐색은 하지 않는다.)
 */
export function forkThreatCount(board: Board, player: PlayerId): number {
  let forks = 0;
  const cells = tacticalCells(board, 3);
  for (const [r, c] of cells) {
    board[r][c] = player;
    const wins = winningWindows(board, player, 2).length;
    board[r][c] = null;
    if (wins >= 2) forks++;
  }
  return forks;
}

/**
 * `me` 관점의 보드 점수.
 * 두 상대는 각각 독립적인 적으로 평가하며, 사람/AI 여부는 전혀 보지 않는다.
 * 턴 순서상 더 빨리 두는 상대의 (비즉시) 위협만 약간 더 긴급하게 본다.
 */
export function scoreFor(
  board: Board,
  me: PlayerId,
  opponentsInTurnOrder: PlayerId[],
): number {
  const pot = computePotentials(board);
  let score = pot[me];
  opponentsInTurnOrder.forEach((opp, i) => {
    // 먼저 두는 상대 1.15배, 그 다음 상대 1.0배
    const urgency = i === 0 ? 1.15 : 1.0;
    score -= pot[opp] * urgency;
  });
  return score;
}
