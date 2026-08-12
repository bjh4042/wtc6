// 육목 AI — 6칸 윈도우 기반 보드 평가 (React 비의존 순수 함수)

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

/**
 * 보드 전체를 훑어 각 플레이어의 "육목 완성 잠재력"을 계산한다.
 * 다른 플레이어의 돌이 섞인 윈도우는 그 누구도 완성할 수 없으므로 0점.
 */
export function computePotentials(board: Board): Potentials {
  const pot: Potentials = [0, 0, 0];

  for (const [dr, dc] of DIRS) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const endR = r + dr * (WIN_LENGTH - 1);
        const endC = c + dc * (WIN_LENGTH - 1);
        if (endR < 0 || endR >= BOARD_SIZE || endC < 0 || endC >= BOARD_SIZE) continue;

        let owner: PlayerId | null = null;
        let count = 0;
        let mixed = false;
        for (let k = 0; k < WIN_LENGTH; k++) {
          const cell = board[r + dr * k][c + dc * k];
          if (cell === null) continue;
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
        pot[owner] += POTENTIAL[count];
      }
    }
  }
  return pot;
}

/**
 * `me` 관점의 보드 점수.
 * 두 상대는 각각 독립적인 적으로 평가하며, 사람/AI 여부는 전혀 보지 않는다.
 * 턴 순서상 더 빨리 두는 상대의 위협만 아주 약간 더 긴급하게 본다.
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
