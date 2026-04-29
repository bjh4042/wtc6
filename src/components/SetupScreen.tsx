import { useState } from "react";
import { HUES, type HueKey, type PlayerConfig } from "@/game/types";
import { Stone } from "@/components/Stone";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";

interface SetupScreenProps {
  onStart: (opts: {
    players: Array<{ hue: HueKey }>;
    timerEnabled: boolean;
    timerSeconds: number;
  }) => void;
}

const PLAYER_LABELS = ["플레이어 1", "플레이어 2", "플레이어 3"] as const;

const ColorWheel = ({
  selectedByOthers,
  selected,
  onPick,
}: {
  selectedByOthers: HueKey[];
  selected: HueKey | null;
  onPick: (h: HueKey) => void;
}) => {
  const radius = 78;
  const cx = 100;
  const cy = 100;
  return (
    <div className="relative mx-auto" style={{ width: 200, height: 200 }}>
      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-background to-muted/60 shadow-inner" />
      {HUES.map((h, i) => {
        const angle = (i / HUES.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius - 18;
        const y = cy + Math.sin(angle) * radius - 18;
        const disabled = selectedByOthers.includes(h.key);
        const isSelected = selected === h.key;
        return (
          <button
            key={h.key}
            type="button"
            disabled={disabled}
            onClick={() => onPick(h.key)}
            aria-label={h.label}
            title={h.label + (disabled ? " (선택됨)" : "")}
            style={{ left: x, top: y }}
            className={[
              "absolute btn-bounce rounded-full",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              disabled ? "opacity-25 cursor-not-allowed grayscale" : "cursor-pointer",
              isSelected ? "ring-4 ring-foreground/70 scale-110" : "",
            ].join(" ")}
          >
            <Stone hue={h.key} size={36} />
          </button>
        );
      })}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-xs font-bold text-muted-foreground">먼셀 10색</span>
      </div>
    </div>
  );
};

export const SetupScreen = ({ onStart }: SetupScreenProps) => {
  const [players, setPlayers] = useState<PlayerConfig[]>([
    { id: 0, hue: null },
    { id: 1, hue: null },
    { id: 2, hue: null },
  ]);
  const [activePlayer, setActivePlayer] = useState<0 | 1 | 2>(0);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(30);

  const pick = (hue: HueKey) => {
    setPlayers((prev) => {
      const next = prev.map((p) => (p.id === activePlayer ? { ...p, hue } : p));
      return next;
    });
    // 자동으로 다음 미선택 플레이어로 이동
    const nextEmpty = players.findIndex((p, idx) => idx !== activePlayer && p.hue === null);
    if (nextEmpty !== -1 && players[activePlayer].hue === null) {
      setActivePlayer(nextEmpty as 0 | 1 | 2);
    }
  };

  const otherPicked = (idx: number) =>
    players.filter((_, i) => i !== idx).map((p) => p.hue).filter(Boolean) as HueKey[];

  const allChosen = players.every((p) => p.hue !== null);

  const handleStart = () => {
    if (!allChosen) return;
    onStart({
      players: players.map((p) => ({ hue: p.hue! })),
      timerEnabled,
      timerSeconds: Math.max(3, Math.min(600, timerSeconds || 30)),
    });
  };

  return (
    <main className="min-h-screen w-full px-4 py-8 md:py-12">
      <div className="mx-auto max-w-5xl animate-fade-in">
        <header className="text-center mb-8">
          <h1 className="font-display text-4xl md:text-5xl text-foreground inline-flex items-center gap-3">
            <Sparkles className="text-primary animate-wiggle" />
            3인 육목 <span className="text-primary">Connect 6</span>
          </h1>
          <p className="mt-3 text-muted-foreground font-semibold">
            가로·세로·대각선으로 같은 색 돌 6개를 먼저 잇는 플레이어가 승리해요!
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-[1fr_auto] items-start bg-card rounded-3xl p-6 md:p-8 shadow-[0_8px_32px_-12px_hsl(var(--board-shadow)/0.35)] border-2 border-border">
          {/* Players */}
          <div>
            <h2 className="font-display text-xl mb-4">플레이어 색상 선택</h2>
            <div className="grid grid-cols-3 gap-3">
              {players.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePlayer(idx as 0 | 1 | 2)}
                  className={[
                    "btn-bounce rounded-2xl p-3 border-2 flex flex-col items-center gap-2 bg-background",
                    activePlayer === idx ? "border-primary shadow-md" : "border-border",
                  ].join(" ")}
                >
                  <span className="text-sm font-bold">{PLAYER_LABELS[idx]}</span>
                  <div className="h-10 flex items-center justify-center">
                    {p.hue ? (
                      <Stone hue={p.hue} size={36} />
                    ) : (
                      <span className="text-xs text-muted-foreground">선택 대기</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-secondary/60 border border-border">
              <p className="text-sm font-semibold mb-3 text-center">
                <span className="text-primary">{PLAYER_LABELS[activePlayer]}</span>의 색상을 골라주세요
              </p>
              <ColorWheel
                selected={players[activePlayer].hue}
                selectedByOthers={otherPicked(activePlayer)}
                onPick={pick}
              />
            </div>
          </div>

          {/* Options */}
          <aside className="md:w-72 flex flex-col gap-5">
            <div className="rounded-2xl border-2 border-border p-5 bg-background">
              <div className="flex items-center justify-between mb-3">
                <Label htmlFor="timer-toggle" className="font-display text-base">턴 타이머</Label>
                <Switch id="timer-toggle" checked={timerEnabled} onCheckedChange={setTimerEnabled} />
              </div>
              <div className={timerEnabled ? "" : "opacity-50 pointer-events-none"}>
                <Label htmlFor="timer-sec" className="text-xs text-muted-foreground">시간 (초)</Label>
                <Input
                  id="timer-sec"
                  type="number"
                  min={3}
                  max={600}
                  value={timerSeconds}
                  onChange={(e) => setTimerSeconds(parseInt(e.target.value || "0", 10))}
                  className="mt-1 font-bold text-lg"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  시간이 다 되면 자동으로 다음 플레이어 턴으로 넘어가요.
                </p>
              </div>
            </div>

            <Button
              size="lg"
              disabled={!allChosen}
              onClick={handleStart}
              className="btn-bounce h-14 text-lg font-display rounded-2xl shadow-lg"
            >
              {allChosen ? "🎮 게임 시작!" : "3명 모두 색상을 골라주세요"}
            </Button>
          </aside>
        </section>
      </div>
    </main>
  );
};
