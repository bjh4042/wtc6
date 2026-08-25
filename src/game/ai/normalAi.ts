// 육목 "보통" 난이도 AI
// 계층: (1) 내 즉시 승리 → (2) 상대 즉시 승리 차단(SAFE 후보 우선) → (3) 보드 점수
// 모두 순수 함수. 게임 규칙(보드/승리 판정/착수 개수)은 기존 로직을 그대로 재사용한다.

import { BOARD_SIZE, type Board, type PlayerId } from "@/game/types";
import {
  analyzeBoard,
  criticalCells,
  forkThreatCount,
  scoreFor,
  tacticalCells,
  winningWindows,
} from "./evaluate";

export type Control = "human" | "ai";
export type AiDifficulty = "normal";

export type Move = [number, number];

/** 2수 조합 탐색에 사용할 상위 positional 후보 수 */
const TOP_K = 12;
/** 조합 탐색 대상(전술 후보 포함) 최대 크기 */
const PAIR_POOL = 18;
/** 상대는 다음 턴에 2수를 둔다고 가정한다 (5+1, 4+2 모두 즉시 승리) */
const OPP_STONES = 2;
/** 기존 돌 주변 탐색 반경 */
const RADIUS = 2;

const clone = (board: Board): Board => board.map((row) => row.slice());
const key = (r: number, c: number) => r * BOARD_SIZE + c;

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
          if (seen.has(key(nr, nc))) continue;
          seen.add(key(nr, nc));
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

/** 이번 턴 stones개로 육목을 완성할 수 있으면 그 자리들을 반환 */
function findWinningTurn(board: Board, me: PlayerId, stones: number): Move[] | null {
  const wins = winningWindows(board, me, stones).sort(
    (a, b) => a.empties.length - b.empties.length,
  );
  for (const w of wins) {
    if (w.empties.length === 0 || w.empties.length > stones) continue;
    return w.empties.map(([r, c]) => [r, c] as Move);
  }
  return null;
}

interface Evaluated {
  moves: Move[];
  /** 이 수 이후 즉시 승리 위협을 가진 상대 수 (0 = SAFE) */
  danger: number;
  /** 남은 상대 즉시 승리 윈도우 총 개수 */
  threats: number;
  score: number;
  next: Board;
}

/** 후보 적용 후의 보드를 평가 — 상대 즉시 승리 여부(tier)와 점수를 함께 계산 */
function evaluateMoves(
  board: Board,
  moves: Move[],
  me: PlayerId,
  opponents: PlayerId[],
): Evaluated {
  const next = clone(board);
  moves.forEach(([r, c]) => {
    next[r][c] = me;
  });
  const { pot, wins } = analyzeBoard(next, OPP_STONES);

  let danger = 0;
  let threats = 0;
  let score = pot[me];
  opponents.forEach((opp, i) => {
    if (wins[opp] > 0) danger++;
    threats += wins[opp];
    // 비즉시 위협에만 턴 순서 가중치를 적용한다 (즉시 위협은 tier 로 처리)
    score -= pot[opp] * (i === 0 ? 1.15 : 1.0);
  });
  return { moves, danger, threats, score, next };
}

const better = (a: Evaluated, b: Evaluated) =>
  a.danger !== b.danger
    ? a.danger - b.danger
    : a.threats !== b.threats
      ? a.threats - b.threats
      : b.score - a.score;

/** 전술 후보(모든 플레이어의 3+ 연결 빈칸)와 positional 후보를 합친 조합 탐색 풀 */
function buildPool(board: Board, players: PlayerId[]): Move[] {
  const seen = new Set<number>();
  const out: Move[] = [];
  const push = (m: Move) => {
    if (board[m[0]][m[1]] !== null) return;
    if (seen.has(key(m[0], m[1]))) return;
    seen.add(key(m[0], m[1]));
    out.push(m);
  };
  // 1) 상대 즉시 승리 차단점은 무조건 포함
  players.forEach((p) => criticalCells(board, p, OPP_STONES).forEach(push));
  // 2) 그 외 전술 후보
  tacticalCells(board, 3).forEach(push);
  return out;
}

/**
 * 이번 턴에 둘 돌 전체를 계산한다.
 * stonesToPlace 는 기존 게임 규칙이 정한 값(첫 턴 1, 이후 2)을 그대로 받는다.
 * 첫 돌로 이미 승리하면 두 번째 돌은 반환하지 않는다.
 */
export interface SearchOptions {
  /** 2수 조합 탐색에 포함할 positional 상위 후보 수 */
  topK?: number;
  /** 조합 탐색 풀 최대 크기 */
  pairPool?: number;
  /** 동점 후보 사이의 무작위 다양성 허용 여부 */
  variety?: boolean;
}

export function chooseTurnMoves(
  board: Board,
  me: PlayerId,
  order: readonly PlayerId[],
  stonesToPlace: number,
  opts: SearchOptions = {},
): Move[] {
  const topK = opts.topK ?? TOP_K;
  const pairPool = opts.pairPool ?? PAIR_POOL;
  const variety = opts.variety ?? true;
  if (stonesToPlace <= 0) return [];
  const opponents = opponentsInTurnOrder(order, me);

  // Priority 1 — 이번 턴 확정 승리
  const win = findWinningTurn(board, me, stonesToPlace);
  if (win) return win;

  // 후보: 전술 후보(강제 포함) + positional 상위 후보
  const positional = generateCandidates(board);
  if (positional.length === 0) return [];

  const singles = positional
    .map((m) => evaluateMoves(board, [m], me, opponents))
    .sort(better);

  const forced = buildPool(board, [me, ...opponents]);
  const poolSet = new Set<number>();
  const pool: Move[] = [];
  const add = (m: Move) => {
    if (poolSet.has(key(m[0], m[1]))) return;
    poolSet.add(key(m[0], m[1]));
    pool.push(m);
  };
  forced.forEach(add);
  singles.slice(0, TOP_K).forEach((s) => add(s.moves[0]));

  if (stonesToPlace === 1) {
    const cands = pool
      .slice(0, PAIR_POOL + TOP_K)
      .map((m) => evaluateMoves(board, [m], me, opponents))
      .sort(better);
    const best = cands[0] ?? singles[0];
    return [pickWithVariety(cands.length ? cands : singles, best)];
  }

  if (pool.length === 1) return [pool[0]];

  const limited = pool.slice(0, PAIR_POOL);
  let best: Evaluated | null = null;
  const tied: Evaluated[] = [];

  for (let i = 0; i < limited.length; i++) {
    for (let j = i + 1; j < limited.length; j++) {
      const e = evaluateMoves(board, [limited[i], limited[j]], me, opponents);
      if (!best || better(e, best) < 0) {
        best = e;
        tied.length = 0;
        tied.push(e);
      } else if (e.danger === best.danger && e.threats === best.threats) {
        tied.push(e);
      }
    }
  }

  if (!best) return [pool[0]];

  // 동점(안전성 동일) 후보들 사이에서만 fork 위험을 추가로 본다
  const refined = refineByFork(tied, best, opponents);
  return pickPairWithVariety(refined, best);
}

/** 안전성이 같은 상위 후보들 중 상대 fork 를 허용하지 않는 쪽을 고른다 */
function refineByFork(
  tied: Evaluated[],
  best: Evaluated,
  opponents: PlayerId[],
): Evaluated[] {
  const top = tied
    .filter((e) => best.score - e.score <= Math.max(1, Math.abs(best.score) * 0.05))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  if (top.length <= 1) return top.length ? top : [best];
  const withFork = top.map((e) => ({
    e,
    forks: opponents.reduce((n, opp) => n + forkThreatCount(e.next, opp), 0),
  }));
  const minForks = Math.min(...withFork.map((x) => x.forks));
  return withFork.filter((x) => x.forks === minForks).map((x) => x.e);
}

/** 전술적으로 동일한 후보 사이에서만 소량의 다양성을 허용 */
function pickWithVariety(scored: Evaluated[], best: Evaluated): Move {
  if (best.danger > 0 || Math.abs(best.score) >= 50000) return best.moves[0];
  const tolerance = Math.max(1, Math.abs(best.score) * 0.02);
  const pool = scored
    .filter(
      (s) =>
        s.danger === best.danger &&
        s.threats === best.threats &&
        best.score - s.score <= tolerance,
    )
    .slice(0, 4);
  return (pool.length ? pool : [best])[
    Math.floor(Math.random() * (pool.length || 1))
  ].moves[0];
}

function pickPairWithVariety(pool: Evaluated[], best: Evaluated): Move[] {
  if (best.danger > 0 || Math.abs(best.score) >= 50000) return best.moves;
  const cands = pool.filter(
    (s) => best.score - s.score <= Math.max(1, Math.abs(best.score) * 0.02),
  );
  const list = cands.length ? cands : [best];
  return list[Math.floor(Math.random() * list.length)].moves;
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
