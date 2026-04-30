import { useEffect, useMemo, useRef, useState } from "react";
import {
  BOARD_SIZE,
  HUES,
  checkWinAt,
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
import { RotateCcw, Timer as TimerIcon, TimerOff } from "lucide-react";

// hue 키 → CSS hsl() 문자열
const hueToHsl = (hue: HueKey) =>
  `hsl(var(--hue-${hue}-h) var(--hue-${hue}-s) var(--hue-${hue}-l))`;

interface GameScreenProps {
  players: Array<{ name: string; hue: HueKey }>;
  timerEnabled: boolean;
  timerSeconds: number;
  firstPlayer: PlayerId;
  onExit: () => void;
}

export const GameScreen = ({ players, timerEnabled, timerSeconds, firstPlayer, onExit }: GameScreenProps) => {
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  const [current, setCurrent] = useState<PlayerId>(firstPlayer);
  // Connect6: 첫 턴 1수, 이후 매 턴 2수
  const [stonesLeft, setStonesLeft] = useState<number>(1);
  const [turnIndex, setTurnIndex] = useState<number>(0); // 0이면 첫 턴
  const [winner, setWinner] = useState<WinResult | null>(null);
  const [draw, setDraw] = useState(false);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);
  const [remaining, setRemaining] = useState(timerSeconds);
  const [timeoutBanner, setTimeoutBanner] = useState<{ from: string; to: string } | null>(null);
  const intervalRef = useRef<number | null>(null);
  const bannerTimerRef = useRef<number | null>(null);

  const gameOver = winner !== null || draw;

  const advanceTurn = () => {
    setCurrent((p) => (((p + 1) % 3) as PlayerId));
    setTurnIndex((t) => t + 1);
    setStonesLeft(2); // 첫 턴 이후는 모두 2개씩
    setRemaining(timerSeconds);
  };

  const showTimeoutBanner = (fromIdx: PlayerId) => {
    const toIdx = ((fromIdx + 1) % 3) as PlayerId;
    setTimeoutBanner({ from: players[fromIdx].name, to: players[toIdx].name });
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
          // turn pass — 배너 표시 후 다음 턴으로 (남은 돌 수와 무관하게 턴 종료)
          window.setTimeout(() => {
            setCurrent((cur) => {
              showTimeoutBanner(cur);
              return ((cur + 1) % 3) as PlayerId;
            });
            setTurnIndex((t) => t + 1);
            setStonesLeft(2);
            setRemaining(timerSeconds);
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
    };
  }, []);

  const handlePlace = (r: number, c: number) => {
    if (gameOver) return;
    if (board[r][c] !== null) return;
    if (stonesLeft <= 0) return;

    const next = board.map((row) => row.slice());
    next[r][c] = current;
    setBoard(next);
    setLastMove([r, c]);

    const win = checkWinAt(next, r, c);
    if (win) {
      setWinner(win);
      return;
    }
    if (isBoardFull(next)) {
      setDraw(true);
      return;
    }
    // 같은 턴에 남은 돌이 더 있으면 같은 플레이어가 계속
    if (stonesLeft > 1) {
      setStonesLeft((s) => s - 1);
      return;
    }
    advanceTurn();
  };

  const reset = () => {
    setBoard(createEmptyBoard());
    setCurrent(firstPlayer);
    setTurnIndex(0);
    setStonesLeft(1);
    setWinner(null);
    setDraw(false);
    setLastMove(null);
    setRemaining(timerSeconds);
    setTimeoutBanner(null);
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
  };

  const winLineSet = useMemo(() => {
    if (!winner) return new Set<string>();
    return new Set(winner.line.map(([r, c]) => `${r},${c}`));
  }, [winner]);

  const currentHue = players[current].hue;
  const timerPct = timerEnabled ? Math.max(0, (remaining / timerSeconds) * 100) : 0;
  const winnerHue = winner ? players[winner.player].hue : null;

  return (
    <main className="min-h-screen w-full px-2 py-4 md:px-6 md:py-8 animate-fade-in">
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
      <div className="mx-auto w-full max-w-6xl flex flex-col lg:flex-row gap-4 lg:gap-6 items-center lg:items-start">
        {/* Sidebar */}
        <aside className="w-full lg:w-72 flex flex-col gap-4 order-2 lg:order-1">
          {/* Current turn */}
          <div className="rounded-3xl border-2 border-border bg-card p-5 shadow-md">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">현재 턴</p>
            <div className="mt-2 flex items-center gap-3">
              <Stone hue={currentHue} size={40} animated key={`turn-${current}-${stonesLeft}`} />
              <div className="flex-1 min-w-0">
                <p className="font-display text-xl truncate">{players[current].name}</p>
                <p className="text-xs text-muted-foreground">
                  {HUES.find((h) => h.key === currentHue)?.label}
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
                  <span className="text-sm font-bold flex-1 truncate">{p.name}</span>
                  {current === idx && !gameOver && (
                    <span className="text-[10px] font-bold uppercase text-primary">차례</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <Button
            variant="outline"
            onClick={onExit}
            className="btn-bounce rounded-2xl h-12 font-bold border-2"
          >
            <RotateCcw className="w-4 h-4 mr-2" /> 게임 포기 / 초기화
          </Button>
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
            onPlace={handlePlace}
          />
        </div>
      </div>

      <ResultModal
        open={gameOver}
        winner={winner}
        draw={draw}
        players={players}
        onPlayAgain={reset}
        onExit={onExit}
      />
    </main>
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
  disabled: boolean;
  onPlace: (r: number, c: number) => void;
}

const BoardGrid = ({
  board, players, lastMove, winLineSet, winLine, winnerHue, disabled, onPlace,
}: BoardGridProps) => {
  return (
    <div
      className="wood-board rounded-3xl p-3 sm:p-5 w-full"
      style={{ maxWidth: "min(92vh, 720px)" }}
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
              const isPlayable = isEmpty && !disabled;
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
                    <Stone
                      hue={playerHue}
                      animated={!!isLast}
                      highlight={inWin}
                      className={[
                        "!w-[92%] !h-[92%]",
                        // 비-승리 라인 돌은 게임 종료 시 살짝 흐리게
                        disabled && !inWin ? "opacity-55 saturate-75" : "",
                      ].join(" ")}
                    />
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
