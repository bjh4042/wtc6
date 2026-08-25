import { useEffect, useMemo, useRef, useState } from "react";
import {
  BOARD_SIZE,
  HUES,
  checkWinAllAt,
  createEmptyBoard,
  isBoardFull,
  type Board,
  type HueKey,
  type PlayerId,
  type WinResult,
} from "@/game/types";
import { Stone, StoneFlat } from "@/components/Stone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ResultModal } from "@/components/ResultModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RotateCcw, Timer as TimerIcon, TimerOff, Undo2, Bot } from "lucide-react";
import { type Control } from "@/game/ai/normalAi";
import { chooseMoveByDifficulty, DIFFICULTY_LABELS, type Difficulty } from "@/game/ai/difficulty";

// hue 키 → CSS hsl() 문자열
const hueToHsl = (hue: HueKey) =>
  `hsl(var(--hue-${hue}-h) var(--hue-${hue}-s) var(--hue-${hue}-l))`;

interface GameScreenProps {
  players: Array<{ name: string; hue: HueKey; control?: Control }>;
  timerEnabled: boolean;
  timerSeconds: number;
  turnOrder: [PlayerId, PlayerId, PlayerId];
  aiDifficulty?: Difficulty;
  onExit: () => void;
}

export const GameScreen = ({ players, timerEnabled, timerSeconds, turnOrder, aiDifficulty = "normal", onExit }: GameScreenProps) => {
  const order = turnOrder ?? ([0, 1, 2] as [PlayerId, PlayerId, PlayerId]);
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  // turnPos: 순서 슬롯 (0/1/2). 실제 플레이어 = order[turnPos]
  const [turnPos, setTurnPos] = useState<0 | 1 | 2>(0);
  const current = order[turnPos];
  // Connect6: 첫 턴 1수, 이후 매 턴 2수
  const [stonesLeft, setStonesLeft] = useState<number>(1);
  const [turnIndex, setTurnIndex] = useState<number>(0); // 0이면 첫 턴
  const [winner, setWinner] = useState<WinResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [winFlash, setWinFlash] = useState(false);
  const [draw, setDraw] = useState(false);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);
  // 같은 턴 안에서 둔 돌들의 좌표 (Undo 용). 턴이 넘어가면 비워짐.
  const [turnMoves, setTurnMoves] = useState<Array<[number, number]>>([]);
  // setState 클로저에서도 최신 turnMoves 를 읽기 위한 ref (타이머 핸들러 등)
  const turnMovesRef = useRef<Array<[number, number]>>([]);
  // 가장 최근에 완료된 턴에 놓인 돌들 (첫 턴 1개 / 일반 턴 2개 / 시간 초과 시 실제 놓인 수만큼)
  const [lastTurnMoves, setLastTurnMoves] = useState<Array<[number, number]>>([]);
  // 승리 라인 전체 (마지막 수로 여러 방향이 동시에 완성될 수 있음)
  const [winLines, setWinLines] = useState<Array<Array<[number, number]>>>([]);
  const [remaining, setRemaining] = useState(timerSeconds);
  const [timeoutBanner, setTimeoutBanner] = useState<{ from: string; to: string } | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const bannerTimerRef = useRef<number | null>(null);
  // 동일 턴에 타이머 핸들러가 두 번 발동되는 것을 막기 위한 가드
  const turnPassingRef = useRef(false);
  // 턴/게임이 바뀔 때마다 증가. 예약된 AI 작업의 유효성 검증에 사용.
  const turnTokenRef = useRef(0);
  const aiTimerRef = useRef<number | null>(null);

  const gameOver = winner !== null || draw;
  const isAiTurn = players[current]?.control === "ai";
  const inputLocked = gameOver || isAiTurn;


  // 턴을 넘긴다. completedMoves: 방금 끝난 턴에 실제로 놓인 돌들 (최근 턴 표시용)
  const advanceTurn = (completedMoves: Array<[number, number]> = []) => {
    setTurnPos((p) => (((p + 1) % 3) as 0 | 1 | 2));
    setTurnIndex((t) => t + 1);
    setStonesLeft(2); // 첫 턴 이후는 모두 2개씩
    setRemaining(timerSeconds);
    setLastTurnMoves(completedMoves);
    setTurnMoves([]);
    turnMovesRef.current = [];
    turnPassingRef.current = false;
  };

  const showTimeoutBanner = (fromPos: 0 | 1 | 2) => {
    const toPos = ((fromPos + 1) % 3) as 0 | 1 | 2;
    setTimeoutBanner({ from: players[order[fromPos]].name, to: players[order[toPos]].name });
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = window.setTimeout(() => setTimeoutBanner(null), 1800);
  };




  // Timer
  useEffect(() => {
    if (!timerEnabled || gameOver) return;
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          // 동일 턴 중복 발동 방지
          if (turnPassingRef.current) return timerSeconds;
          turnPassingRef.current = true;
          window.setTimeout(() => {
            setTurnPos((cur) => {
              showTimeoutBanner(cur);
              return ((cur + 1) % 3) as 0 | 1 | 2;
            });
            setTurnIndex((t) => t + 1);
            setStonesLeft(2);
            setRemaining(timerSeconds);
            // 시간 초과로 끝난 턴 — 실제로 놓인 돌(0~1개)만 최근 턴으로 표시
            setLastTurnMoves(turnMovesRef.current);
            setTurnMoves([]);
            turnMovesRef.current = [];
            turnPassingRef.current = false;
          }, 0);
          return timerSeconds;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerEnabled, gameOver, current, timerSeconds]);

  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
      if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
    };
  }, []);

  // ── AI 턴 처리 ──
  // 돌 1개를 둘 때마다 effect 가 다시 실행되며, 그때의 최신 board 로 다시 계산한다.
  // (stale state 방지) 턴이 바뀌거나 언마운트되면 예약된 착수를 취소한다.
  useEffect(() => {
    if (gameOver || !isAiTurn || stonesLeft <= 0) {
      setAiThinking(false);
      return;
    }
    const token = ++turnTokenRef.current;
    setAiThinking(true);

    // 타이머가 켜져 있으면 남은 시간 안에 반드시 두도록 지연을 줄인다.
    const budget = timerEnabled ? Math.max(0, remaining * 1000 - 800) : Infinity;
    const delay = Math.min(550, budget);

    aiTimerRef.current = window.setTimeout(() => {
      // 타이머 만료가 이미 확정된 턴(전환 대기 중)에는 착수하지 않는다.
      if (token !== turnTokenRef.current || turnPassingRef.current) return;
      const move = chooseNextMove(board, current, order, stonesLeft);
      if (token !== turnTokenRef.current || turnPassingRef.current) return;
      setAiThinking(false);
      if (!move) {
        advanceTurn();
        return;
      }
      handlePlace(move[0], move[1]);
    }, delay);

    return () => {
      turnTokenRef.current++;
      if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, current, stonesLeft, gameOver, isAiTurn, turnIndex]);


  const handlePlace = (r: number, c: number) => {
    if (gameOver) return;
    if (board[r][c] !== null) return;
    if (stonesLeft <= 0) return;

    const next = board.map((row) => row.slice());
    next[r][c] = current;
    setBoard(next);
    setLastMove([r, c]);
    const newTurnMoves = [...turnMovesRef.current, [r, c] as [number, number]];
    turnMovesRef.current = newTurnMoves;
    setTurnMoves(newTurnMoves);

    const wins = checkWinAllAt(next, r, c);
    if (wins.length > 0) {
      setWinner(wins[0]);
      setWinLines(wins.map((w) => w.line));
      setLastTurnMoves(newTurnMoves);
      setTurnMoves([]);
      turnMovesRef.current = [];
      setWinFlash(true);
      window.setTimeout(() => setWinFlash(false), 900);
      window.setTimeout(() => setShowResult(true), 1800);
      return;
    }
    if (isBoardFull(next)) {
      setDraw(true);
      setLastTurnMoves(newTurnMoves);
      setTurnMoves([]);
      turnMovesRef.current = [];
      window.setTimeout(() => setShowResult(true), 600);
      return;
    }
    // 같은 턴에 남은 돌이 더 있으면 같은 플레이어가 계속
    if (stonesLeft > 1) {
      setStonesLeft((s) => s - 1);
      return;
    }
    advanceTurn(newTurnMoves);
  };

  // 같은 턴에 둔 마지막 돌을 되돌린다 (턴 넘어간 뒤·AI 턴에는 불가)
  const canUndo = !gameOver && !isAiTurn && turnMoves.length > 0;

  const undo = () => {
    if (!canUndo) return;
    const moves = turnMoves;
    const [lr, lc] = moves[moves.length - 1];
    const next = board.map((row) => row.slice());
    next[lr][lc] = null;
    setBoard(next);
    const remainingMoves = moves.slice(0, -1);
    setTurnMoves(remainingMoves);
    setLastMove(remainingMoves.length > 0 ? remainingMoves[remainingMoves.length - 1] : null);
    setStonesLeft((s) => s + 1);
  };

  const reset = () => {
    setBoard(createEmptyBoard());
    setTurnPos(0);
    setTurnIndex(0);
    setStonesLeft(1);
    setWinner(null);
    setDraw(false);
    setShowResult(false);
    setWinFlash(false);
    setLastMove(null);
    setTurnMoves([]);
    setRemaining(timerSeconds);
    setTimeoutBanner(null);
    turnPassingRef.current = false;
    turnTokenRef.current++;
    setAiThinking(false);
    if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
  };


  const winLineSet = useMemo(() => {
    if (!winner) return new Set<string>();
    return new Set(winner.line.map(([r, c]) => `${r},${c}`));
  }, [winner]);

  const safeCurrent = (players[current] ? current : 0) as PlayerId;
  const currentHue = players[safeCurrent]?.hue;
  const timerPct = timerEnabled ? Math.max(0, (remaining / timerSeconds) * 100) : 0;
  const winnerHue = winner && players[winner.player] ? players[winner.player].hue : null;

  if (!currentHue) return null;

  return (
    <main className="min-h-screen w-full px-2 py-2 md:px-4 md:py-3 animate-fade-in">
      {/* Timeout banner */}
      {timeoutBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-scale-in">
          <div className="flex items-center gap-3 rounded-2xl border-2 border-destructive/40 bg-card px-5 py-3 shadow-xl">
            <TimerOff className="w-5 h-5 text-destructive" />
            <div className="text-sm font-bold">
              <span className="text-destructive">⏰ {timeoutBanner.from}</span>
              <span className="text-muted-foreground"> 시간 초과! </span>
              <span className="text-foreground">{timeoutBanner.to}</span>
              <span className="text-muted-foreground">의 차례로 넘어갑니다.</span>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto w-full max-w-[1700px] flex flex-col lg:flex-row gap-3 lg:gap-5 items-center lg:items-start">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col gap-3 order-2 lg:order-1">

          {/* Current turn */}
          <div className="rounded-3xl border-2 border-border bg-card p-5 shadow-md">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">현재 턴</p>
            <div className="mt-2 flex items-center gap-3">
              <Stone hue={currentHue} size={40} animated key={`turn-${current}-${stonesLeft}`} />
              <div className="flex-1 min-w-0">
                <p className="font-display text-xl truncate inline-flex items-center gap-1.5">
                  {isAiTurn && <Bot className="w-4 h-4 text-primary shrink-0" />}
                  <span className="truncate">{players[current].name}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {aiThinking && !gameOver ? (
                    <span className="text-primary font-bold">AI 생각 중…</span>
                  ) : (
                    HUES.find((h) => h.key === currentHue)?.label
                  )}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">남은 돌</p>
                <p className="font-display text-2xl tabular-nums text-primary">
                  {stonesLeft}<span className="text-sm text-muted-foreground">/{turnIndex === 0 ? 1 : 2}</span>
                </p>
              </div>
            </div>

            {timerEnabled && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-muted-foreground inline-flex items-center gap-1">
                    <TimerIcon className="w-3.5 h-3.5" /> 남은 시간
                  </span>
                  <span className={`font-display text-lg tabular-nums ${remaining <= 5 ? "text-destructive animate-wiggle" : ""}`}>
                    {remaining}s
                  </span>
                </div>
                <Progress value={timerPct} className="h-2" />
              </div>
            )}
          </div>

          {/* Players list */}
          <div className="rounded-3xl border-2 border-border bg-card p-5 shadow-md">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">플레이어</p>
            <ul className="space-y-2">
              {players.map((p, idx) => (
                <li
                  key={idx}
                  className={[
                    "flex items-center gap-3 px-3 py-2 rounded-xl transition-colors",
                    current === idx && !gameOver ? "bg-secondary" : "bg-background",
                  ].join(" ")}
                >
                  <StoneFlat hue={p.hue} size={22} />
                  <span className="text-sm font-bold flex-1 truncate inline-flex items-center gap-1.5">
                    {p.control === "ai" && <Bot className="w-3.5 h-3.5 text-primary shrink-0" />}
                    <span className="truncate">{p.name}</span>
                  </span>
                  {current === idx && !gameOver && (
                    <span className="text-[10px] font-bold uppercase text-primary">차례</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <Button
            variant="outline"
            onClick={undo}
            disabled={!canUndo}
            className="btn-bounce rounded-2xl h-12 font-bold border-2"
          >
            <Undo2 className="w-4 h-4 mr-2" /> 무르기 (현재 턴)
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onExit}
              className="btn-bounce rounded-2xl h-12 font-bold border-2 flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-2" /> 게임 포기
            </Button>
            <ThemeToggle className="h-12 w-12" />
          </div>
        </aside>

        {/* Board */}
        <div className="flex-1 order-1 lg:order-2 w-full flex justify-center">
          <BoardGrid
            board={board}
            players={players}
            lastMove={lastMove}
            winLineSet={winLineSet}
            winLine={winner?.line ?? null}
            winnerHue={winnerHue}
            disabled={gameOver}
            locked={inputLocked}
            onPlace={handlePlace}
          />
        </div>
      </div>

      {/* 승리 연출: 화면 플래시 + 컨페티 */}
      {winner && winnerHue && (
        <WinCelebration flash={winFlash} hue={winnerHue} active={!showResult} />
      )}

      <ResultModal
        open={showResult}
        winner={winner}
        draw={draw}
        players={players}
        onPlayAgain={reset}
        onExit={onExit}
      />
    </main>
  );
};

/* --------------------- Win celebration overlay --------------------- */

const WinCelebration = ({
  flash,
  hue,
  active,
}: {
  flash: boolean;
  hue: HueKey;
  active: boolean;
}) => {
  const hueDef = HUES.find((h) => h.key === hue);
  const color = hueDef ? `hsl(var(--${hueDef.varName}))` : "hsl(var(--primary))";
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.2 + Math.random() * 0.9,
        rotate: Math.random() * 360,
        size: 8 + Math.random() * 10,
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {flash && (
        <div
          className="absolute inset-0 animate-fade-out"
          style={{ background: `radial-gradient(circle at 50% 50%, ${color}55, transparent 60%)` }}
        />
      )}
      {active &&
        pieces.map((p, i) => (
          <span
            key={i}
            className="absolute block rounded-sm"
            style={{
              left: `${p.left}%`,
              top: "-5%",
              width: p.size,
              height: p.size,
              backgroundColor: color,
              transform: `rotate(${p.rotate}deg)`,
              animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
              opacity: 0.9,
            }}
          />
        ))}
    </div>
  );
};

/* --------------------------- Board grid ---------------------------- */

interface BoardGridProps {
  board: Board;
  players: Array<{ hue: HueKey }>;
  lastMove: [number, number] | null;
  winLineSet: Set<string>;
  winLine: Array<[number, number]> | null;
  winnerHue: HueKey | null;
  /** 게임 종료 상태 (패배 돌 흐리게 처리에 사용) */
  disabled: boolean;
  /** 착수 입력 잠금 (게임 종료 또는 AI 차례) */
  locked: boolean;
  onPlace: (r: number, c: number) => void;
}

const BoardGrid = ({
  board, players, lastMove, winLineSet, winLine, winnerHue, disabled, locked, onPlace,
}: BoardGridProps) => {
  return (
    <div
      className="wood-board rounded-3xl p-2 sm:p-4 w-full"
      style={{ maxWidth: "min(100%, calc(100dvh - 2.5rem), 1100px)" }}
    >

      <div className="relative w-full aspect-square">
        {/* Grid lines */}
        <GridLines />

        {/* Win line overlay (SVG) */}
        {winLine && winnerHue && <WinLineOverlay line={winLine} hue={winnerHue} />}

        {/* Click + stone layer */}
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
          }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => {
              const key = `${r}-${c}`;
              const isLast = lastMove && lastMove[0] === r && lastMove[1] === c;
              const inWin = winLineSet.has(`${r},${c}`);
              const playerHue = cell !== null ? players[cell].hue : null;
              const isEmpty = cell === null;
              const isPlayable = isEmpty && !locked;
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={`${r + 1}행 ${c + 1}열${isEmpty ? "" : " (이미 놓임)"}`}
                  disabled={!isPlayable}
                  onClick={() => onPlace(r, c)}
                  className={[
                    "relative flex items-center justify-center group",
                    "focus:outline-none focus-visible:z-10",
                    isPlayable ? "cursor-pointer" : "cursor-not-allowed",
                  ].join(" ")}
                >
                  {!isEmpty && playerHue && (
                    <div className="relative w-[92%] h-[92%]">
                      <Stone
                        hue={playerHue}
                        animated={!!isLast}
                        highlight={inWin}
                        className={[
                          "!w-full !h-full",
                          // 비-승리 라인 돌은 게임 종료 시 흐리게 (시맨틱 유틸)
                          disabled && !inWin ? "stone-defeated" : "",
                        ].join(" ")}
                      />
                      {/* 직전 수 강조: 작은 링 마커 */}
                      {isLast && !disabled && <span className="last-move-ring" />}
                    </div>
                  )}
                  {isPlayable && (
                    <span className="absolute inset-[20%] rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-foreground/10 ring-2 ring-foreground/30 group-hover:scale-110 transform-gpu duration-150" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

/* 승리 라인 오버레이 — 6목을 굵게 강조 + draw 애니메이션 */
const WinLineOverlay = ({ line, hue }: { line: Array<[number, number]>; hue: HueKey }) => {
  const N = BOARD_SIZE;
  const step = 100 / N;
  const start = step / 2;
  const [r1, c1] = line[0];
  const [r2, c2] = line[line.length - 1];
  const x1 = start + c1 * step;
  const y1 = start + r1 * step;
  const x2 = start + c2 * step;
  const y2 = start + r2 * step;
  const color = hueToHsl(hue);
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {/* glow halo */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.35"
        vectorEffect="non-scaling-stroke"
        style={{ filter: "blur(2px)", animation: "win-pulse 0.9s ease-in-out infinite" }}
      />
      {/* main bold stroke with draw animation */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 1,
          animation: "win-line-draw 0.6s ease-out forwards, win-pulse 1.4s 0.6s ease-in-out infinite",
        }}
      />
    </svg>
  );
};

const GridLines = () => {
  // Lines go through cell centers; for N cells, there are N lines, with outer lines at 1/(2N) and 1 - 1/(2N).
  const N = BOARD_SIZE;
  const step = 100 / N;
  const start = step / 2;

  const verticals = Array.from({ length: N }, (_, i) => start + i * step);
  const horizontals = verticals;

  // Star points (화점) for 19x19
  const stars = [3, 9, 15];

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <g stroke="hsl(var(--board-line))" strokeWidth="0.18" strokeLinecap="round" opacity="0.85">
        {verticals.map((x, i) => (
          <line key={`v${i}`} x1={x} y1={start} x2={x} y2={100 - start} vectorEffect="non-scaling-stroke" />
        ))}
        {horizontals.map((y, i) => (
          <line key={`h${i}`} x1={start} y1={y} x2={100 - start} y2={y} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <g fill="hsl(var(--board-line))" opacity="0.85">
        {stars.map((r) =>
          stars.map((c) => (
            <circle key={`s-${r}-${c}`} cx={start + c * step} cy={start + r * step} r="0.55" />
          ))
        )}
      </g>
    </svg>
  );
};
