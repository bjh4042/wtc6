// Connect-6 (육목) — 색상 팔레트 및 타입

export type HueKey =
  | "red" | "orange" | "yellow" | "lime" | "green"
  | "teal" | "blue" | "indigo" | "violet" | "magenta";

export interface HueDef {
  key: HueKey;
  label: string;
  // CSS variable name (without the leading --)
  varName: string;
}

export const HUES: HueDef[] = [
  { key: "red",     label: "빨강",   varName: "hue-red" },
  { key: "orange",  label: "주황",   varName: "hue-orange" },
  { key: "yellow",  label: "노랑",   varName: "hue-yellow" },
  { key: "lime",    label: "연두",   varName: "hue-lime" },
  { key: "green",   label: "초록",   varName: "hue-green" },
  { key: "teal",    label: "청록",   varName: "hue-teal" },
  { key: "blue",    label: "파랑",   varName: "hue-blue" },
  { key: "indigo",  label: "남색",   varName: "hue-indigo" },
  { key: "violet",  label: "보라",   varName: "hue-violet" },
  { key: "magenta", label: "자주",   varName: "hue-magenta" },
];

export const BOARD_SIZE = 19;
export const WIN_LENGTH = 6;

export type PlayerId = 0 | 1 | 2;
export type Cell = PlayerId | null;
export type Board = Cell[][];

export interface PlayerConfig {
  id: PlayerId;
  hue: HueKey | null;
}

export const createEmptyBoard = (): Board =>
  Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null as Cell)
  );

const DIRECTIONS: Array<[number, number]> = [
  [0, 1],   // horizontal
  [1, 0],   // vertical
  [1, 1],   // diag ↘
  [1, -1],  // diag ↙
];

export interface WinResult {
  player: PlayerId;
  line: Array<[number, number]>;
}

/**
 * 방금 놓인 (r,c) 위치 기준으로 4방향만 검사하여 6연속 여부 확인.
 */
export function checkWinAt(board: Board, r: number, c: number): WinResult | null {
  const player = board[r][c];
  if (player === null) return null;

  for (const [dr, dc] of DIRECTIONS) {
    const line: Array<[number, number]> = [[r, c]];

    // forward
    let i = r + dr, j = c + dc;
    while (
      i >= 0 && i < BOARD_SIZE &&
      j >= 0 && j < BOARD_SIZE &&
      board[i][j] === player
    ) {
      line.push([i, j]);
      i += dr; j += dc;
    }

    // backward
    i = r - dr; j = c - dc;
    while (
      i >= 0 && i < BOARD_SIZE &&
      j >= 0 && j < BOARD_SIZE &&
      board[i][j] === player
    ) {
      line.unshift([i, j]);
      i -= dr; j -= dc;
    }

    if (line.length >= WIN_LENGTH) {
      return { player: player as PlayerId, line: line.slice(0, WIN_LENGTH) };
    }
  }
  return null;
}

/**
 * 방금 놓인 (r,c) 기준 4방향을 모두 검사하여 완성된 승리 라인 전부를 반환한다.
 * (마지막 수로 가로+대각선이 동시에 완성되는 경우 등)
 * 승리 규칙은 checkWinAt 과 동일 — 6개 이상 연속이면 승리, 라인은 앞 6칸만 표시한다.
 */
export function checkWinAllAt(board: Board, r: number, c: number): WinResult[] {
  const player = board[r][c];
  if (player === null) return [];

  const results: WinResult[] = [];
  for (const [dr, dc] of DIRECTIONS) {
    const line: Array<[number, number]> = [[r, c]];

    let i = r + dr, j = c + dc;
    while (
      i >= 0 && i < BOARD_SIZE &&
      j >= 0 && j < BOARD_SIZE &&
      board[i][j] === player
    ) {
      line.push([i, j]);
      i += dr; j += dc;
    }

    i = r - dr; j = c - dc;
    while (
      i >= 0 && i < BOARD_SIZE &&
      j >= 0 && j < BOARD_SIZE &&
      board[i][j] === player
    ) {
      line.unshift([i, j]);
      i -= dr; j -= dc;
    }

    if (line.length >= WIN_LENGTH) {
      results.push({ player: player as PlayerId, line: line.slice(0, WIN_LENGTH) });
    }
  }
  return results;
}

export function isBoardFull(board: Board): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) return false;
    }
  }
  return true;
}
