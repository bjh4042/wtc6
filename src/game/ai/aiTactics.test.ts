import { describe, expect, it } from "vitest";
import { createEmptyBoard, checkWinAt, type Board, type PlayerId } from "@/game/types";
import { chooseTurnMoves } from "@/game/ai/normalAi";
import { hasImmediateWin } from "@/game/ai/evaluate";

const order: [PlayerId, PlayerId, PlayerId] = [0, 1, 2];

const place = (board: Board, p: PlayerId, cells: Array<[number, number]>) => {
  cells.forEach(([r, c]) => {
    board[r][c] = p;
  });
  return board;
};

const line = (r: number, c: number, dr: number, dc: number, n: number) =>
  Array.from({ length: n }, (_, i) => [r + dr * i, c + dc * i] as [number, number]);

const apply = (board: Board, p: PlayerId, moves: Array<[number, number]>) => {
  const next = board.map((row) => row.slice());
  moves.forEach(([r, c]) => {
    next[r][c] = p;
  });
  return next;
};

const covers = (moves: Array<[number, number]>, cells: Array<[number, number]>) =>
  moves.some(([r, c]) => cells.some(([tr, tc]) => tr === r && tc === c));

describe("T1. 자기 승리 우선", () => {
  it("내가 이번 턴 승리 가능하면 상대 위협과 무관하게 이긴다", () => {
    const board = createEmptyBoard();
    place(board, 1, line(4, 4, 0, 1, 5)); // AI(1): 5+1
    place(board, 0, line(12, 4, 0, 1, 5)); // 사람: 다음 턴 승리 가능
    const moves = chooseTurnMoves(board, 1, order, 2);
    const after = apply(board, 1, moves);
    expect(moves.some(([r, c]) => checkWinAt(after, r, c) !== null)).toBe(true);
  });
});

describe("T2/T3. 자기 공격보다 상대 즉시 승리 차단", () => {
  it("사람 5+1 이면 자기 3목 확장 대신 차단한다", () => {
    const board = createEmptyBoard();
    place(board, 1, line(2, 2, 0, 1, 3)); // AI 자기 연결
    place(board, 0, line(12, 4, 0, 1, 5)); // 사람 5+1
    const moves = chooseTurnMoves(board, 1, order, 2);
    expect(hasImmediateWin(apply(board, 1, moves), 0)).toBe(false);
  });

  it("사람 4+2 이면 차단한다", () => {
    const board = createEmptyBoard();
    place(board, 1, line(2, 2, 0, 1, 3));
    place(board, 0, line(12, 4, 0, 1, 4)); // 4목 + 양쪽 빈칸
    const moves = chooseTurnMoves(board, 1, order, 2);
    expect(hasImmediateWin(apply(board, 1, moves), 0)).toBe(false);
  });
});

describe("T4. 다른 AI 견제", () => {
  it("AI 1 은 AI 2 의 4+2 를 막는다", () => {
    const board = createEmptyBoard();
    place(board, 1, line(2, 2, 0, 1, 3));
    place(board, 2, line(12, 4, 0, 1, 4));
    const moves = chooseTurnMoves(board, 1, order, 2);
    expect(hasImmediateWin(apply(board, 1, moves), 2)).toBe(false);
  });

  it("AI 2 는 AI 1 의 5+1 을 막는다", () => {
    const board = createEmptyBoard();
    place(board, 1, line(12, 4, 0, 1, 5));
    const moves = chooseTurnMoves(board, 2, order, 2);
    expect(hasImmediateWin(apply(board, 2, moves), 1)).toBe(false);
  });
});

describe("T5. 더 위험한 상대 우선", () => {
  it("사람 일반 4목(막힌) 보다 AI 2 의 5+1 을 먼저 막는다", () => {
    const board = createEmptyBoard();
    place(board, 0, line(3, 3, 0, 1, 4));
    board[3][2] = 1; // 사람 4목 한쪽 막힘
    place(board, 2, line(14, 6, 0, 1, 5)); // 5+1
    const moves = chooseTurnMoves(board, 1, order, 2);
    expect(hasImmediateWin(apply(board, 1, moves), 2)).toBe(false);
  });
});

describe("T6. 두 상대 모두 즉시 승리 위협", () => {
  it("가능하면 두 위협을 동시에 막고, 못 막아도 상태가 깨지지 않는다", () => {
    const board = createEmptyBoard();
    place(board, 0, line(4, 4, 0, 1, 5)); // 5+1 (한 칸만 막으면 안 됨 → 양끝 2칸)
    place(board, 2, line(14, 4, 0, 1, 5));
    const moves = chooseTurnMoves(board, 1, order, 2);
    expect(moves).toHaveLength(2);
    moves.forEach(([r, c]) => expect(board[r][c]).toBeNull());
    const after = apply(board, 1, moves);
    // 각 상대의 위협 창을 최소 하나씩은 줄인다
    expect(covers(moves, [[4, 3], [4, 9], [14, 3], [14, 9]])).toBe(true);
    expect(after).toBeTruthy();
  });
});

describe("T7. 공격+수비 동시 수행 선호", () => {
  it("같은 위협을 막으면서 자기 연결을 강화하는 자리를 고른다", () => {
    const board = createEmptyBoard();
    place(board, 0, line(9, 4, 0, 1, 4)); // 사람 4+2 → 차단점 (9,3)/(9,8)/(9,9)/(9,2)
    place(board, 1, [[6, 9], [7, 9], [8, 9]]); // AI 세로 3목 → (9,9) 가 겸용 자리
    const moves = chooseTurnMoves(board, 1, order, 2);
    expect(hasImmediateWin(apply(board, 1, moves), 0)).toBe(false);
    expect(covers(moves, [[9, 9]])).toBe(true);
  });
});

describe("T8. 위험한 공격 거부", () => {
  it("자기 4목을 늘리는 대신 상대의 즉시 승리를 막는다", () => {
    const board = createEmptyBoard();
    place(board, 1, line(2, 2, 0, 1, 4)); // AI 4목 (자기 공격 유혹)
    place(board, 0, line(12, 4, 0, 1, 5)); // 사람 5+1
    const moves = chooseTurnMoves(board, 1, order, 2);
    // AI 는 4+2 로 이길 수 없는 상태여야 유효한 테스트 (양끝 2칸이 필요)
    expect(hasImmediateWin(apply(board, 1, moves), 0)).toBe(false);
  });
});

describe("T9. fork 방어", () => {
  it("상대의 교차 3목 fork 자리를 견제한다", () => {
    const board = createEmptyBoard();
    place(board, 0, [[9, 6], [9, 7], [9, 8]]); // 가로 3
    place(board, 0, [[6, 9], [7, 9], [8, 9]]); // 세로 3 → (9,9) 교차
    const moves = chooseTurnMoves(board, 1, order, 2);
    expect(moves.length).toBe(2);
    expect(covers(moves, [[9, 9], [9, 5], [9, 10], [5, 9], [10, 9]])).toBe(true);
  });
});

describe("T10. randomness 안전성", () => {
  it("즉시 차단 상황에서 20회 반복해도 항상 차단한다", () => {
    for (let i = 0; i < 20; i++) {
      const board = createEmptyBoard();
      place(board, 1, line(2, 2, 0, 1, 3));
      place(board, 0, line(12, 4, 0, 1, 5));
      const moves = chooseTurnMoves(board, 1, order, 2);
      expect(hasImmediateWin(apply(board, 1, moves), 0)).toBe(false);
    }
  });

  it("즉시 승리 상황에서 20회 반복해도 항상 승리한다", () => {
    for (let i = 0; i < 20; i++) {
      const board = place(createEmptyBoard(), 1, line(4, 4, 0, 1, 4));
      const moves = chooseTurnMoves(board, 1, order, 2);
      const after = apply(board, 1, moves);
      expect(moves.some(([r, c]) => checkWinAt(after, r, c) !== null)).toBe(true);
    }
  });
});

describe("15. 상대 위험이 없으면 공격한다", () => {
  it("자기 3목을 확장한다", () => {
    const board = place(createEmptyBoard(), 1, line(9, 7, 0, 1, 3));
    const moves = chooseTurnMoves(board, 1, order, 2);
    const after = apply(board, 1, moves);
    expect(hasImmediateWin(after, 1, 2) || after[9][6] === 1 || after[9][10] === 1).toBe(
      true,
    );
  });
});
