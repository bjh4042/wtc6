// AI 난이도 계층 — 쉬움 / 보통 / 어려움
// 게임 규칙(첫 턴 1수, 이후 2수)은 호출부가 정하며 여기서는 "다음 한 수"만 고른다.

import type { Board, PlayerId } from "@/game/types";
import {
  chooseNextMove,
  generateCandidates,
  opponentsInTurnOrder,
  type Move,
  type SearchOptions,
} from "./normalAi";
import { criticalCells, winningWindows } from "./evaluate";

export type Difficulty = "easy" | "normal" | "hard";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "쉬움",
  normal: "보통",
  hard: "어려움",
};

const SEARCH: Record<Exclude<Difficulty, "easy">, SearchOptions> = {
  normal: { topK: 12, pairPool: 18, variety: true },
  hard: { topK: 18, pairPool: 26, variety: false },
};

const pickRandom = <T,>(list: T[]): T | null =>
  list.length ? list[Math.floor(Math.random() * list.length)] : null;

/**
 * 쉬움: 확정 승리는 놓치지 않고, 상대의 즉시 승리도 가끔(35%)만 막는다.
 * 그 외에는 기존 돌 주변 임의의 빈칸에 둔다.
 */
function chooseEasyMove(
  board: Board,
  me: PlayerId,
  order: readonly PlayerId[],
  stonesLeft: number,
): Move | null {
  // 1) 이번 턴에 바로 완성할 수 있으면 둔다
  const mine = winningWindows(board, me, stonesLeft)
    .filter((w) => w.empties.length > 0 && w.empties.length <= stonesLeft)
    .sort((a, b) => a.empties.length - b.empties.length);
  if (mine.length > 0) return mine[0].empties[0] as Move;

  // 2) 가끔만 상대의 즉시 승리를 차단
  if (Math.random() < 0.35) {
    const opponents = opponentsInTurnOrder(order, me);
    const blocks: Move[] = [];
    opponents.forEach((opp) =>
      criticalCells(board, opp, 2).forEach(([r, c]) => blocks.push([r, c])),
    );
    const block = pickRandom(blocks.filter(([r, c]) => board[r][c] === null));
    if (block) return block;
  }

  // 3) 나머지는 무작위
  const cands = generateCandidates(board).filter(([r, c]) => board[r][c] === null);
  return pickRandom(cands);
}

/** 난이도에 따라 다음 한 수를 계산한다. */
export function chooseMoveByDifficulty(
  board: Board,
  me: PlayerId,
  order: readonly PlayerId[],
  stonesLeft: number,
  difficulty: Difficulty,
): Move | null {
  if (stonesLeft <= 0) return null;
  if (difficulty === "easy") {
    return (
      chooseEasyMove(board, me, order, stonesLeft) ??
      chooseNextMove(board, me, order, stonesLeft, SEARCH.normal)
    );
  }
  return chooseNextMove(board, me, order, stonesLeft, SEARCH[difficulty]);
}
