// 육목 "보통" 난이도 AI — 후보 생성 → 단일 수 평가 → 상위 후보 2수 조합 탐색
// 모두 순수 함수. 게임 규칙(보드/승리 판정/착수 개수)은 기존 로직을 그대로 재사용한다.

import {
  BOARD_SIZE,
  checkWinAt,
  type Board,
  type PlayerId,
} from "@/game/types";
import { scoreFor } from "./evaluate";

export type Control = "human" | "ai";
export type AiDifficulty = "normal";

export type Move = [number, number];

const WIN_BONUS = 1e9;
/** 2수 조합 탐색에 사용할 상위 후보 수 */
const TOP_K = 12;
/** 기존 돌 주변 탐색 반경 */
const RADIUS = 2;

const clone = (board: Board): Board => board.map((row) => row.slice());

/** 기존 돌 주변의 빈칸만 후보로 생성. 보드가 비어 있으면 중앙 부근. */
export function generateCandidates(board: Board): Move[] {
  const out: Move[] = [];
  const seen = new Set<number>();
  let hasStone = false;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) continue;
      hasStone = true;
      for (let dr = -RADIUS; dr <= RADIUS; dr++) {
        for (let dc = -RADIUS; dc <= RADIUS; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
          if (board[nr][nc] !== null) continue;
          const key = nr * BOARD_SIZE + nc;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push([nr, nc]);
        }
      }
    }
  }

  if (!hasStone) {
    const mid = Math.floor(BOARD_SIZE / 2);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) out.push([mid + dr, mid + dc]);
    }
  }
  return out;
}

/** 한 수를 둔 뒤의 보드 점수 (승리면 압도적 보너스) */
function scoreAfter(
  board: Board,
  move: Move,
  me: PlayerId,
  opponents: PlayerId[],
): { score: number; win: boolean; next: Board } {
  const next = clone(board);
  next[move[0]][move[1]] = me;
  const win = checkWinAt(next, move[0], move[1]) !== null;
  const score = (win ? WIN_BONUS : 0) + scoreFor(next, me, opponents);
  return { score, win, next };
}

/** 현재 턴 순서에서 me 다음으로 두는 상대들을 순서대로 반환 */
export function opponentsInTurnOrder(
  order: readonly PlayerId[],
  me: PlayerId,
): PlayerId[] {
  const pos = order.indexOf(me);
  const start = pos < 0 ? 0 : pos;
  const res: PlayerId[] = [];
  for (let i = 1; i < order.length; i++) {
    const p = order[(start + i) % order.length];
    if (p !== me) res.push(p);
  }
  return res;
}

interface Scored {
  move: Move;
  score: number;
  win: boolean;
  next: Board;
}

function rankSingles(
  board: Board,
  me: PlayerId,
  opponents: PlayerId[],
): Scored[] {
  const cands = generateCandidates(board);
  const scored: Scored[] = cands.map((move) => {
    const { score, win, next } = scoreAfter(board, move, me, opponents);
    return { move, score, win, next };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/** 점수가 거의 같은 상위 후보들 중에서만 소량의 다양성을 허용 */
function pickWithVariety(scored: Scored[]): Move {
  const best = scored[0];
  // 전술적 상황(승리/차단 등 큰 점수 차)에서는 무작위 금지
  if (Math.abs(best.score) >= 50000) return best.move;
  const tolerance = Math.max(1, Math.abs(best.score) * 0.02);
  const pool = scored.filter((s) => best.score - s.score <= tolerance).slice(0, 4);
  return pool[Math.floor(Math.random() * pool.length)].move;
}

/**
 * 이번 턴에 둘 돌 전체를 계산한다.
 * stonesToPlace 는 기존 게임 규칙이 정한 값(첫 턴 1, 이후 2)을 그대로 받는다.
 * 첫 돌로 이미 승리하면 두 번째 돌은 반환하지 않는다.
 */
export function chooseTurnMoves(
  board: Board,
  me: PlayerId,
  order: readonly PlayerId[],
  stonesToPlace: number,
): Move[] {
  if (stonesToPlace <= 0) return [];
  const opponents = opponentsInTurnOrder(order, me);
  const singles = rankSingles(board, me, opponents);
  if (singles.length === 0) return [];

  if (stonesToPlace === 1) return [pickWithVariety(singles)];

  // 즉시 1수 승리가 있으면 그것부터
  const instantWin = singles.find((s) => s.win);
  if (instantWin) return [instantWin.move];

  // 상위 K 후보만 2수 조합 탐색 (자기 돌 4 + 빈칸 2 → 한 턴 승리 포함)
  const top = singles.slice(0, TOP_K);
  let bestPair: { moves: Move[]; score: number } | null = null;

  for (const first of top) {
    const secondCands = top.filter(
      (s) => s.move[0] !== first.move[0] || s.move[1] !== first.move[1],
    );
    for (const second of secondCands) {
      const { score } = scoreAfter(first.next, second.move, me, opponents);
      if (!bestPair || score > bestPair.score) {
        bestPair = { moves: [first.move, second.move], score };
      }
    }
  }

  if (!bestPair) return [top[0].move];
  return bestPair.moves;
}

/** 이번 턴에 실제로 둘 "다음 한 수"만 계산 (stale state 방지: 매 착수마다 재계산) */
export function chooseNextMove(
  board: Board,
  me: PlayerId,
  order: readonly PlayerId[],
  stonesLeft: number,
): Move | null {
  const moves = chooseTurnMoves(board, me, order, stonesLeft);
  return moves.length > 0 ? moves[0] : null;
}
