import { useState } from "react";
import { HUES, type HueKey, type PlayerConfig } from "@/game/types";
import { Stone } from "@/components/Stone";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";

interface SetupScreenProps {
  onStart: (opts: {
    players: Array<{ hue: HueKey }>;
    timerEnabled: boolean;
    timerSeconds: number;
  }) => void;
}

const PLAYER_LABELS = ["플레이어 1", "플레이어 2", "플레이어 3"] as const;

const ColorOption = ({ hueKey, label }: { hueKey: HueKey; label: string }) => (
  <div className="flex items-center gap-3">
    <Stone hue={hueKey} size={22} />
    <span className="font-bold">{label}</span>
  </div>
);

export const SetupScreen = ({ onStart }: SetupScreenProps) => {
  const [players, setPlayers] = useState<PlayerConfig[]>([
    { id: 0, hue: null },
    { id: 1, hue: null },
    { id: 2, hue: null },
  ]);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(30);

  const setPlayerHue = (idx: number, hue: HueKey) => {
    setPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, hue } : p)));
  };

  const takenBy = (idx: number) =>
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
            <div className="grid gap-3 sm:grid-cols-3">
              {players.map((p, idx) => {
                const taken = takenBy(idx);
                const selectedLabel = p.hue
                  ? HUES.find((h) => h.key === p.hue)?.label
                  : undefined;
                return (
                  <div
                    key={p.id}
                    className="rounded-2xl p-4 border-2 border-border bg-background flex flex-col items-center gap-3"
                  >
                    <span className="text-sm font-bold">{PLAYER_LABELS[idx]}</span>
                    <div className="h-12 flex items-center justify-center">
                      {p.hue ? (
                        <Stone hue={p.hue} size={44} animated key={p.hue} />
                      ) : (
                        <span className="text-xs text-muted-foreground">색상 미선택</span>
                      )}
                    </div>
                    <Select
                      value={p.hue ?? undefined}
                      onValueChange={(v) => setPlayerHue(idx, v as HueKey)}
                    >
                      <SelectTrigger className="w-full rounded-xl border-2 font-bold h-11 bg-card">
                        <SelectValue placeholder="색상 선택">
                          {p.hue && selectedLabel && (
                            <ColorOption hueKey={p.hue} label={selectedLabel} />
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {HUES.map((h) => {
                          const disabled = taken.includes(h.key) && p.hue !== h.key;
                          return (
                            <SelectItem
                              key={h.key}
                              value={h.key}
                              disabled={disabled}
                              className="rounded-lg my-0.5 focus:bg-secondary"
                            >
                              <div className="flex items-center gap-3">
                                <Stone hue={h.key} size={20} />
                                <span className="font-bold">{h.label}</span>
                                {disabled && (
                                  <span className="ml-auto text-[10px] text-muted-foreground">
                                    선택됨
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
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
