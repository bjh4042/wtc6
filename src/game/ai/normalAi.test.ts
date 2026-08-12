import { describe, expect, it } from "vitest";
import { createEmptyBoard, checkWinAt, type Board, type PlayerId } from "@/game/types";
import { chooseTurnMoves, generateCandidates, opponentsInTurnOrder } from "@/game/ai/normalAi";

const order: [PlayerId, PlayerId, PlayerId] = [0, 1, 2];

const place = (board: Board, p: PlayerId, cells: Array<[number, number]>) => {
  cells.forEach(([r, c]) => {
    board[r][c] = p;
  });
  return board;
};

describe("AI 후보 생성", () => {
  it("빈 보드에서는 중앙 부근을 후보로 낸다", () => {
    const cands = generateCandidates(createEmptyBoard());
    expect(cands.length).toBeGreaterThan(0);
    cands.forEach(([r, c]) => {
      expect(Math.abs(r - 9)).toBeLessThanOrEqual(1);
      expect(Math.abs(c - 9)).toBeLessThanOrEqual(1);
    });
  });

  it("후보는 항상 빈 칸이다", () => {
    const board = place(createEmptyBoard(), 0, [[9, 9], [9, 10]]);
    const cands = generateCandidates(board);
    cands.forEach(([r, c]) => expect(board[r][c]).toBeNull());
  });
});

describe("턴 순서상 상대", () => {
  it("자신 다음에 두는 순서대로 반환한다", () => {
    expect(opponentsInTurnOrder([2, 0, 1], 2)).toEqual([0, 1]);
    expect(opponentsInTurnOrder([2, 0, 1], 0)).toEqual([1, 2]);
  });
});

describe("AI 착수 결정", () => {
  it("한 수로 육목을 완성할 수 있으면 그 자리에 둔다", () => {
    const board = place(createEmptyBoard(), 1, [[5, 3], [5, 4], [5, 5], [5, 6], [5, 7]]);
    const moves = chooseTurnMoves(board, 1, order, 1);
    board[moves[0][0]][moves[0][1]] = 1;
    expect(checkWinAt(board, moves[0][0], moves[0][1])).not.toBeNull();
  });

  it("돌 2개로 4+2 육목을 한 턴에 완성한다", () => {
    const board = place(createEmptyBoard(), 0, [[8, 4], [8, 5], [8, 6], [8, 7]]);
    const moves = chooseTurnMoves(board, 0, order, 2);
    moves.forEach(([r, c]) => {
      board[r][c] = 0;
    });
    const won = moves.some(([r, c]) => checkWinAt(board, r, c) !== null);
    expect(won).toBe(true);
  });

  it("상대가 다음 한 수로 이기는 자리를 막는다", () => {
    const board = place(createEmptyBoard(), 1, [[10, 2], [10, 3], [10, 4], [10, 5], [10, 6]]);
    // 살짝 떨어진 곳에 내 돌도 하나
    board[3][15] = 0;
    const moves = chooseTurnMoves(board, 0, order, 2);
    const blocked = moves.some(
      ([r, c]) => (r === 10 && c === 1) || (r === 10 && c === 7),
    );
    expect(blocked).toBe(true);
  });

  it("규칙이 정한 돌 수만큼만, 빈 칸에, 중복 없이 반환한다", () => {
    const board = place(createEmptyBoard(), 0, [[9, 9]]);
    const moves = chooseTurnMoves(board, 1, order, 2);
    expect(moves).toHaveLength(2);
    expect(new Set(moves.map((m) => m.join(",")))).toHaveProperty("size", 2);
    moves.forEach(([r, c]) => expect(board[r][c]).toBeNull());
  });

  it("첫 턴 1수 규칙에서는 한 수만 반환한다", () => {
    expect(chooseTurnMoves(createEmptyBoard(), 0, order, 1)).toHaveLength(1);
  });
});
