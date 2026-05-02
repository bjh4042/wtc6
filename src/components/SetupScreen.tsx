import { useMemo, useState } from "react";
import { toast } from "sonner";
import { HUES, type HueKey } from "@/game/types";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, AlertCircle, Flag, BookOpen } from "lucide-react";

export interface SetupPlayer {
  name: string;
  hue: HueKey | null;
}

interface SetupScreenProps {
  onStart: (opts: {
    players: Array<{ name: string; hue: HueKey }>;
    timerEnabled: boolean;
    timerSeconds: number;
    turnOrder: [0 | 1 | 2, 0 | 1 | 2, 0 | 1 | 2];
  }) => void;
}

type PIdx = 0 | 1 | 2;
const ORDER_LABELS = ["첫 번째", "두 번째", "세 번째"] as const;

const DEFAULT_NAMES = ["플레이어 1", "플레이어 2", "플레이어 3"] as const;

export const SetupScreen = ({ onStart }: SetupScreenProps) => {
  const [players, setPlayers] = useState<SetupPlayer[]>([
    { name: DEFAULT_NAMES[0], hue: null },
    { name: DEFAULT_NAMES[1], hue: null },
    { name: DEFAULT_NAMES[2], hue: null },
  ]);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [turnOrder, setTurnOrder] = useState<[PIdx, PIdx, PIdx]>([0, 1, 2]);
  const [turnSelected, setTurnSelected] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [showRules, setShowRules] = useState(false);

  // 특정 슬롯(0/1/2 = 첫/둘/셋째 차례)에 플레이어 idx를 배정하면서 자리 충돌은 자동 스왑
  const assignTurn = (slot: 0 | 1 | 2, playerIdx: PIdx) => {
    setTurnOrder((prev) => {
      const next = [...prev] as [PIdx, PIdx, PIdx];
      const currentSlot = next.indexOf(playerIdx) as 0 | 1 | 2;
      const displaced = next[slot];
      next[slot] = playerIdx;
      next[currentSlot] = displaced;
      return next;
    });
    setTurnSelected((prev) => {
      const next = [...prev] as [boolean, boolean, boolean];
      next[slot] = true;
      return next;
    });
  };
  const allTurnsSelected = turnSelected.every(Boolean);

  const setPlayerHue = (idx: number, hue: HueKey) => {
    setPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, hue } : p)));
  };
  const setPlayerName = (idx: number, name: string) => {
    setPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, name } : p)));
  };

  const takenBy = (idx: number) =>
    players.filter((_, i) => i !== idx).map((p) => p.hue).filter(Boolean) as HueKey[];

  // 검증 — 누락/중복 사유를 구체적으로 모음
  const issues = useMemo(() => {
    const list: string[] = [];
    players.forEach((p, i) => {
      if (!p.name.trim()) list.push(`${DEFAULT_NAMES[i]}의 이름을 입력해주세요.`);
    });
    // 이름 중복
    const nameMap = new Map<string, number[]>();
    players.forEach((p, i) => {
      const k = p.name.trim();
      if (!k) return;
      const arr = nameMap.get(k) ?? [];
      arr.push(i);
      nameMap.set(k, arr);
    });
    nameMap.forEach((arr, name) => {
      if (arr.length > 1) {
        list.push(`이름 "${name}"이(가) 중복됐어요 (${arr.map((i) => `P${i + 1}`).join(", ")}).`);
      }
    });
    // 색상 미선택
    players.forEach((p, i) => {
      if (!p.hue) list.push(`${p.name.trim() || DEFAULT_NAMES[i]}의 색상을 골라주세요.`);
    });
    // 색상 중복 (UI에서 막지만 안전망)
    const hueMap = new Map<HueKey, number[]>();
    players.forEach((p, i) => {
      if (!p.hue) return;
      const arr = hueMap.get(p.hue) ?? [];
      arr.push(i);
      hueMap.set(p.hue, arr);
    });
    hueMap.forEach((arr, hue) => {
      if (arr.length > 1) {
        const label = HUES.find((h) => h.key === hue)?.label ?? hue;
        list.push(`색상 "${label}"이(가) 중복됐어요 (${arr.map((i) => `P${i + 1}`).join(", ")}).`);
      }
    });
    if (!allTurnsSelected) {
      const missing = turnSelected
        .map((s, i) => (!s ? ORDER_LABELS[i] : null))
        .filter(Boolean)
        .join(", ");
      list.push(`턴 순서를 선택해주세요 (${missing}).`);
    }
    return list;
  }, [players, turnSelected, allTurnsSelected]);

  const handleStart = () => {
    if (issues.length > 0) {
      toast.error("게임을 시작할 수 없어요", {
        description: issues.join("\n"),
      });
      return;
    }
    setShowRules(true);
  };

  const confirmStart = () => {
    setShowRules(false);
    onStart({
      players: players.map((p, i) => ({
        name: p.name.trim() || DEFAULT_NAMES[i],
        hue: p.hue!,
      })),
      timerEnabled,
      timerSeconds: Math.max(3, Math.min(600, timerSeconds || 30)),
      turnOrder,
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
            <h2 className="font-display text-xl mb-4">플레이어 설정</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {players.map((p, idx) => {
                const taken = takenBy(idx);
                const selectedLabel = p.hue
                  ? HUES.find((h) => h.key === p.hue)?.label
                  : undefined;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl p-4 border-2 border-border bg-background flex flex-col items-center gap-3"
                  >
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      P{idx + 1}
                    </span>
                    <div className="h-14 flex items-center justify-center">
                      {p.hue ? (
                        <Stone hue={p.hue} size={52} animated key={p.hue} />
                      ) : (
                        <span className="text-xs text-muted-foreground">색상 미선택</span>
                      )}
                    </div>

                    {/* 이름 입력 */}
                    <Input
                      value={p.name}
                      onChange={(e) => setPlayerName(idx, e.target.value)}
                      maxLength={12}
                      placeholder={DEFAULT_NAMES[idx]}
                      className="rounded-xl border-2 font-bold text-center h-10 bg-card"
                    />

                    {/* 색상 드롭다운 */}
                    <Select
                      value={p.hue ?? undefined}
                      onValueChange={(v) => setPlayerHue(idx, v as HueKey)}
                    >
                      <SelectTrigger className="w-full rounded-xl border-2 font-bold h-11 bg-card">
                        <SelectValue placeholder="색상 선택">
                          {p.hue && selectedLabel && (
                            <div className="flex items-center gap-3">
                              <Stone hue={p.hue} size={22} />
                              <span className="font-bold">{selectedLabel}</span>
                            </div>
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

            <div className="rounded-2xl border-2 border-border p-5 bg-background">
              <Label className="font-display text-base inline-flex items-center gap-2">
                <Flag className="w-4 h-4 text-primary" /> 턴 순서
              </Label>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                첫 턴엔 1개, 이후 모든 턴은 2개씩 둬요.
              </p>
              <div className="space-y-2">
                {[0, 1, 2].map((slot) => {
                  const slotIdx = slot as 0 | 1 | 2;
                  const playerIdx = turnOrder[slotIdx];
                  const p = players[playerIdx];
                  return (
                    <div
                      key={slot}
                      className="flex items-center gap-2 rounded-xl border-2 border-border bg-card p-2"
                    >
                      <span className="text-[11px] font-display w-12 text-center text-primary shrink-0">
                        {ORDER_LABELS[slot]}
                      </span>
                      <Select
                        value={turnSelected[slotIdx] ? String(playerIdx) : undefined}
                        onValueChange={(v) => assignTurn(slotIdx, Number(v) as PIdx)}
                      >
                        <SelectTrigger className="rounded-lg border-2 font-bold h-10 bg-background">
                          <SelectValue placeholder="플레이어 선택">
                            {turnSelected[slotIdx] && (
                              <div className="flex items-center gap-2">
                                {p.hue ? (
                                  <Stone hue={p.hue} size={20} />
                                ) : (
                                  <span className="w-5 h-5 rounded-full border-2 border-dashed border-muted-foreground/40" />
                                )}
                                <span className="font-bold truncate">
                                  {p.name.trim() || DEFAULT_NAMES[playerIdx]}
                                </span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {players.map((pp, i) => (
                            <SelectItem key={i} value={String(i)} className="rounded-lg my-0.5">
                              <div className="flex items-center gap-2">
                                {pp.hue ? (
                                  <Stone hue={pp.hue} size={18} />
                                ) : (
                                  <span className="w-4 h-4 rounded-full border-2 border-dashed border-muted-foreground/40" />
                                )}
                                <span className="font-bold">
                                  {pp.name.trim() || DEFAULT_NAMES[i]}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>

            {issues.length > 0 && (
              <div className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-2 text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-display">시작하려면 다음을 확인해주세요</span>
                </div>
                <ul className="text-xs space-y-1 text-foreground/80 list-disc pl-5">
                  {issues.slice(0, 4).map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              size="lg"
              onClick={handleStart}
              disabled={issues.length > 0}
              className="btn-bounce h-14 text-lg font-display rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🎮 게임 시작!
            </Button>
          </aside>
        </section>
      </div>
    </main>
  );
};
