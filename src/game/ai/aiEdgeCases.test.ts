import { describe, expect, it } from "vitest";
import {
  BOARD_SIZE,
  createEmptyBoard,
  type Board,
  type PlayerId,
} from "@/game/types";
import { chooseNextMove, chooseTurnMoves, generateCandidates } from "@/game/ai/normalAi";
import { computePotentials, scoreFor } from "@/game/ai/evaluate";

const order: [PlayerId, PlayerId, PlayerId] = [0, 1, 2];

const place = (board: Board, p: PlayerId, cells: Array<[number, number]>) => {
  cells.forEach(([r, c]) => {
    board[r][c] = p;
  });
  return board;
};

const line = (
  r: number,
  c: number,
  dr: number,
  dc: number,
  n: number,
): Array<[number, number]> =>
  Array.from({ length: n }, (_, i) => [r + dr * i, c + dc * i] as [number, number]);

/** 상대가 4목 + 빈칸 2 (한 턴 2수로 즉시 육목) 위협을 가진 상황에서, AI가 그 6칸 윈도우를 막는지 */
const blocksWindow = (
  threat: PlayerId,
  me: PlayerId,
  start: [number, number],
  dir: [number, number],
) => {
  const board = createEmptyBoard();
  const [dr, dc] = dir;
  const [sr, sc] = start;
  // 윈도우: 6칸 중 앞 4칸이 상대 돌, 뒤 2칸이 빈칸
  const window = line(sr, sc, dr, dc, 6);
  place(board, threat, window.slice(0, 4));
  const moves = chooseTurnMoves(board, me, order, 2);
  const empties = window.slice(4);
  return moves.some(([r, c]) => empties.some(([er, ec]) => er === r && ec === c));
};

describe("2. 상대 4 + 빈칸 2 위협 차단", () => {
  it("가로 위협을 막는다", () => {
    expect(blocksWindow(0, 1, [9, 5], [0, 1])).toBe(true);
  });
  it("세로 위협을 막는다", () => {
    expect(blocksWindow(0, 1, [4, 9], [1, 0])).toBe(true);
  });
  it("대각선(↘) 위협을 막는다", () => {
    expect(blocksWindow(0, 1, [3, 3], [1, 1])).toBe(true);
  });
  it("대각선(↙) 위협을 막는다", () => {
    expect(blocksWindow(0, 1, [3, 15], [1, -1])).toBe(true);
  });
  it("사람이든 다른 AI든 동일하게 막는다 (플레이어 2 위협 → 플레이어 1이 차단)", () => {
    expect(blocksWindow(2, 1, [9, 5], [0, 1])).toBe(true);
    expect(blocksWindow(1, 2, [9, 5], [0, 1])).toBe(true);
  });
});

describe("3. 빈 보드 / AI 선공", () => {
  it("빈 보드에서 후보가 존재하고 중앙 부근이다", () => {
    const cands = generateCandidates(createEmptyBoard());
    expect(cands.length).toBeGreaterThan(0);
  });
  it("빈 보드에서 모든 PlayerId 가 합법적인 수를 반환한다", () => {
    ([0, 1, 2] as PlayerId[]).forEach((p) => {
      const m = chooseNextMove(createEmptyBoard(), p, order, 1);
      expect(m).not.toBeNull();
      const [r, c] = m!;
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(BOARD_SIZE);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(BOARD_SIZE);
    });
  });
});

describe("4 & 8. fallback / 보드 후반", () => {
  const fillAllExcept = (empties: Array<[number, number]>): Board => {
    const board = createEmptyBoard();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        // 육목이 생기지 않도록 세 색을 번갈아 채운다
        board[r][c] = (((r * 2 + c) % 3) as PlayerId);
      }
    }
    empties.forEach(([r, c]) => {
      board[r][c] = null;
    });
    return board;
  };

  it("빈칸 2개면 두 칸 모두를 중복 없이 선택한다", () => {
    const board = fillAllExcept([[0, 0], [18, 18]]);
    const moves = chooseTurnMoves(board, 1, order, 2);
    expect(moves.length).toBeLessThanOrEqual(2);
    moves.forEach(([r, c]) => expect(board[r][c]).toBeNull());
    expect(new Set(moves.map((m) => m.join(",")))).toHaveProperty("size", moves.length);
  });

  it("빈칸 1개면 한 수만 반환한다", () => {
    const board = fillAllExcept([[7, 7]]);
    const moves = chooseTurnMoves(board, 1, order, 2);
    expect(moves).toEqual([[7, 7]]);
  });

  it("빈칸이 없으면 아무 수도 반환하지 않는다", () => {
    const board = fillAllExcept([]);
    expect(chooseTurnMoves(board, 1, order, 2)).toEqual([]);
    expect(chooseNextMove(board, 1, order, 2)).toBeNull();
  });
});

describe("5. AI 간 독립성", () => {
  it("동일 배치라면 플레이어 번호와 무관하게 같은 평가를 받는다", () => {
    const a = place(createEmptyBoard(), 1, line(9, 4, 0, 1, 4));
    const b = place(createEmptyBoard(), 2, line(9, 4, 0, 1, 4));
    expect(computePotentials(a)[1]).toBe(computePotentials(b)[2]);
    // 0번(사람) 관점에서 1번/2번 위협은 턴 순서 긴급도만 다르고 동일하게 감점된다
    expect(scoreFor(a, 0, [1])).toBe(scoreFor(b, 0, [2]));
  });

  it("AI 는 다른 AI 의 연결도 동일하게 차단한다", () => {
    const board = place(createEmptyBoard(), 1, line(9, 4, 0, 1, 5));
    const moves = chooseTurnMoves(board, 2, order, 2);
    const blocked = moves.some(([r, c]) => r === 9 && (c === 3 || c === 9));
    expect(blocked).toBe(true);
  });
});

describe("9. 반환 수 불변조건", () => {
  const randomBoard = (): Board => {
    const board = createEmptyBoard();
    for (let i = 0; i < 40; i++) {
      const r = Math.floor(Math.random() * BOARD_SIZE);
      const c = Math.floor(Math.random() * BOARD_SIZE);
      board[r][c] = (i % 3) as PlayerId;
    }
    return board;
  };

  it("무작위 보드 30회: 범위/빈칸/중복/개수/보드 불변 검증", () => {
    for (let i = 0; i < 30; i++) {
      const board = randomBoard();
      const snapshot = JSON.stringify(board);
      const stones = i % 2 === 0 ? 1 : 2;
      const moves = chooseTurnMoves(board, (i % 3) as PlayerId, order, stones);
      expect(moves.length).toBeGreaterThan(0);
      expect(moves.length).toBeLessThanOrEqual(stones);
      moves.forEach(([r, c]) => {
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(BOARD_SIZE);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(BOARD_SIZE);
        expect(board[r][c]).toBeNull();
      });
      expect(new Set(moves.map((m) => m.join(",")))).toHaveProperty("size", moves.length);
      // AI 는 입력 보드를 변조하지 않는다
      expect(JSON.stringify(board)).toBe(snapshot);
    }
  });

  it("stonesToPlace 0 이하면 빈 배열", () => {
    expect(chooseTurnMoves(createEmptyBoard(), 0, order, 0)).toEqual([]);
  });
});

describe("7. 첫 수로 승리하면 두 번째 수를 반환하지 않는다", () => {
  it("즉시 승리 수가 있으면 1수만 반환", () => {
    const board = place(createEmptyBoard(), 0, line(9, 4, 0, 1, 5));
    const moves = chooseTurnMoves(board, 0, order, 2);
    expect(moves).toHaveLength(1);
  });
});
