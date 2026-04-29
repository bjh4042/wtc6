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
import { RotateCcw, Timer as TimerIcon } from "lucide-react";

interface GameScreenProps {
  players: Array<{ hue: HueKey }>;
  timerEnabled: boolean;
  timerSeconds: number;
  onExit: () => void;
}

const PLAYER_LABELS = ["플레이어 1", "플레이어 2", "플레이어 3"] as const;

export const GameScreen = ({ players, timerEnabled, timerSeconds, onExit }: GameScreenProps) => {
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  const [current, setCurrent] = useState<PlayerId>(0);
  const [winner, setWinner] = useState<WinResult | null>(null);
  const [draw, setDraw] = useState(false);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);
  const [remaining, setRemaining] = useState(timerSeconds);
  const intervalRef = useRef<number | null>(null);

  const gameOver = winner !== null || draw;

  const advanceTurn = (next?: PlayerId) => {
    setCurrent((p) => (next !== undefined ? next : (((p + 1) % 3) as PlayerId)));
    setRemaining(timerSeconds);
  };

  // Timer
  useEffect(() => {
    if (!timerEnabled || gameOver) return;
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          // turn pass
          window.setTimeout(() => advanceTurn(), 0);
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

  const handlePlace = (r: number, c: number) => {
    if (gameOver) return;
    if (board[r][c] !== null) return;

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
    advanceTurn();
  };

  const reset = () => {
    setBoard(createEmptyBoard());
    setCurrent(0);
    setWinner(null);
    setDraw(false);
    setLastMove(null);
    setRemaining(timerSeconds);
  };

  const winLineSet = useMemo(() => {
    if (!winner) return new Set<string>();
    return new Set(winner.line.map(([r, c]) => `${r},${c}`));
  }, [winner]);

  const currentHue = players[current].hue;
  const timerPct = timerEnabled ? Math.max(0, (remaining / timerSeconds) * 100) : 0;

  return (
    <main className="min-h-screen w-full px-2 py-4 md:px-6 md:py-8 animate-fade-in">
      <div className="mx-auto w-full max-w-6xl flex flex-col lg:flex-row gap-4 lg:gap-6 items-center lg:items-start">
        {/* Sidebar */}
        <aside className="w-full lg:w-72 flex flex-col gap-4 order-2 lg:order-1">
          {/* Current turn */}
          <div className="rounded-3xl border-2 border-border bg-card p-5 shadow-md">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">현재 턴</p>
            <div className="mt-2 flex items-center gap-3">
              <Stone hue={currentHue} size={40} animated key={`turn-${current}`} />
              <div>
                <p className="font-display text-xl">{PLAYER_LABELS[current]}</p>
                <p className="text-xs text-muted-foreground">
                  {HUES.find((h) => h.key === currentHue)?.label}
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
                  <span className="text-sm font-bold flex-1">{PLAYER_LABELS[idx]}</span>
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
  disabled: boolean;
  onPlace: (r: number, c: number) => void;
}

const BoardGrid = ({ board, players, lastMove, winLineSet, disabled, onPlace }: BoardGridProps) => {
  // The board is rendered as a CSS grid of (BOARD_SIZE) cells where lines pass through cell centers.
  // Outer padding equals half a cell so the outermost lines/stones sit nicely inside.
  return (
    <div
      className="wood-board rounded-3xl p-3 sm:p-5 w-full"
      style={{ maxWidth: "min(92vh, 720px)" }}
    >
      <div
        className="relative w-full aspect-square"
        style={{
          // Draw grid lines using gradients — exactly BOARD_SIZE-1 gaps.
          // We position them so they pass through the centers of the cells.
        }}
      >
        {/* Grid lines */}
        <GridLines />

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
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={`${r + 1}행 ${c + 1}열`}
                  disabled={disabled || cell !== null}
                  onClick={() => onPlace(r, c)}
                  className={[
                    "relative flex items-center justify-center group",
                    "focus:outline-none focus-visible:z-10",
                    cell === null && !disabled ? "cursor-pointer" : "cursor-default",
                  ].join(" ")}
                >
                  {cell !== null && playerHue && (
                    <Stone
                      hue={playerHue}
                      animated={!!isLast}
                      highlight={inWin}
                      // Stone fits ~92% of cell
                      size={undefined as unknown as number}
                      className="!w-[92%] !h-[92%]"
                    />
                  )}
                  {cell === null && !disabled && (
                    <span className="absolute inset-[18%] rounded-full opacity-0 group-hover:opacity-40 bg-foreground/20 transition-opacity" />
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
