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
import { Sparkles, AlertCircle, Flag, BookOpen, Bot, Users } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Control } from "@/game/ai/normalAi";
import { DIFFICULTY_LABELS, type Difficulty } from "@/game/ai/difficulty";


export interface SetupPlayer {
  name: string;
  hue: HueKey | null;
}

interface SetupScreenProps {
  onStart: (opts: {
    players: Array<{ name: string; hue: HueKey; control: Control }>;
    timerEnabled: boolean;
    timerSeconds: number;
    turnOrder: [0 | 1 | 2, 0 | 1 | 2, 0 | 1 | 2];
    aiDifficulty: Difficulty;
  }) => void;
}

type PIdx = 0 | 1 | 2;
const ORDER_LABELS = ["첫 번째", "두 번째", "세 번째"] as const;

const DEFAULT_NAMES = ["플레이어 1", "플레이어 2", "플레이어 3"] as const;

/** AI 수에 따른 기본 배치 (로직은 이 값을 보고 판단하며, PlayerId를 하드코딩하지 않는다) */
const controlsFor = (aiCount: 0 | 1 | 2): [Control, Control, Control] =>
  aiCount === 0
    ? ["human", "human", "human"]
    : aiCount === 1
      ? ["human", "human", "ai"]
      : ["human", "ai", "ai"];

const AI_NAME_SET = new Set(["AI 1", "AI 2"]);

const MODES: Array<{ value: 0 | 1 | 2; label: string }> = [
  { value: 0, label: "사람 3명" },
  { value: 1, label: "AI 1명" },
  { value: 2, label: "AI 2명" },
];

export const SetupScreen = ({ onStart }: SetupScreenProps) => {
  const [players, setPlayers] = useState<SetupPlayer[]>([
    { name: DEFAULT_NAMES[0], hue: null },
    { name: DEFAULT_NAMES[1], hue: null },
    { name: DEFAULT_NAMES[2], hue: null },
  ]);
  const [aiCount, setAiCount] = useState<0 | 1 | 2>(0);
  const [aiDifficulty, setAiDifficulty] = useState<Difficulty>("normal");
  const controls = controlsFor(aiCount);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [turnOrder, setTurnOrder] = useState<[PIdx, PIdx, PIdx]>([0, 1, 2]);
  const [turnSelected, setTurnSelected] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [showRules, setShowRules] = useState(false);

  // 구성 변경 시 기본 이름만 자동 정리 (사용자가 직접 지은 이름은 유지)
  const changeAiCount = (value: 0 | 1 | 2) => {
    setAiCount(value);
    const nextControls = controlsFor(value);
    setPlayers((prev) => {
      let aiSeq = 0;
      return prev.map((p, i) => {
        const isDefaultish =
          !p.name.trim() || AI_NAME_SET.has(p.name.trim()) || p.name.trim() === DEFAULT_NAMES[i];
        if (nextControls[i] === "ai") {
          aiSeq += 1;
          return isDefaultish ? { ...p, name: `AI ${aiSeq}` } : p;
        }
        return isDefaultish ? { ...p, name: DEFAULT_NAMES[i] } : p;
      });
    });
  };


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
    const configuredPlayers = players.flatMap((p, i) =>
      p.hue
        ? [{
            name: p.name.trim() || DEFAULT_NAMES[i],
            hue: p.hue,
            control: controls[i],
          }]
        : [],
    );
    if (configuredPlayers.length !== players.length) {
      toast.error("모든 플레이어의 색상을 골라주세요.");
      setShowRules(false);
      return;
    }
    setShowRules(false);
    onStart({
      players: configuredPlayers,

      timerEnabled,
      timerSeconds: Math.max(3, Math.min(600, timerSeconds || 30)),
      turnOrder,
      aiDifficulty,
    });
  };

  return (
    <main className="min-h-screen w-full px-4 py-8 md:py-12">
      <div className="mx-auto max-w-5xl animate-fade-in">
        <div className="flex justify-end mb-2">
          <ThemeToggle />
        </div>
        <header className="text-center mb-8">
          <h1 className="brand-title text-5xl md:text-6xl text-foreground inline-flex items-center gap-3">
            <Sparkles className="text-primary animate-wiggle w-8 h-8" />
            육목킹
          </h1>
          <p className="mt-2 text-sm font-bold tracking-[0.3em] text-primary uppercase">Connect 6</p>
          <p className="mt-3 text-muted-foreground">
            육목킹은 3명이 즐기는 육목 게임! 가로·세로·대각선으로 같은 색 돌 6개를 먼저 잇는 플레이어가 승리해요.
          </p>
        </header>


        <section className="grid gap-6 md:grid-cols-[1fr_auto] items-start bg-card rounded-3xl p-6 md:p-8 shadow-[0_8px_32px_-12px_hsl(var(--board-shadow)/0.35)] border-2 border-border">
          {/* Players */}
          <div>
            <h2 className="font-display text-xl mb-4">플레이어 설정</h2>

            {/* 플레이 구성 (사람/AI) */}
            <div className="mb-4 rounded-2xl border-2 border-border bg-background p-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> 플레이 구성
              </span>
              <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="플레이 구성 선택">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    aria-pressed={aiCount === m.value}
                    onClick={() => changeAiCount(m.value)}
                    className={[
                      "btn-bounce rounded-xl border-2 h-10 text-sm font-bold transition-colors",
                      aiCount === m.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-secondary",
                    ].join(" ")}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {aiCount > 0 && (
                <div className="mt-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    AI 난이도
                  </span>
                  <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="AI 난이도 선택">
                    {(["easy", "normal", "hard"] as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={aiDifficulty === d}
                        onClick={() => setAiDifficulty(d)}
                        className={[
                          "btn-bounce rounded-xl border-2 h-10 text-sm font-bold transition-colors",
                          aiDifficulty === d
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground hover:bg-secondary",
                        ].join(" ")}
                      >
                        {DIFFICULTY_LABELS[d]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>


            <div className="grid gap-3 sm:grid-cols-3">
              {players.map((p, idx) => {
                const taken = takenBy(idx);
                const isAi = controls[idx] === "ai";
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
                    {isAi && (
                      <span className="inline-flex items-center gap-1 rounded-full border-2 border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        <Bot className="w-3 h-3" /> AI · {DIFFICULTY_LABELS[aiDifficulty]}
                      </span>
                    )}

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
                      onChange={(e) => {
                        // 코드포인트 단위로 16자 제한 (한글 조합·이모지 안전)
                        const trimmed = Array.from(e.target.value).slice(0, 16).join("");
                        setPlayerName(idx, trimmed);
                      }}
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

      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="rounded-2xl border-2">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl inline-flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              육목 (Connect 6) 규칙
            </DialogTitle>
            <DialogDescription className="text-foreground/80 pt-2">
              시작하기 전에 규칙을 한 번 확인해보세요!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-foreground/90">
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
              <div className="font-display text-base text-primary mb-1">🏆 승리 조건</div>
              <p>
                가로·세로·대각선 어느 방향이든, 자신의 색 돌을{" "}
                <span className="font-bold text-primary">6개 연속</span>으로 먼저 잇는
                플레이어가 승리합니다.
              </p>
            </div>

            <div className="rounded-xl border-2 border-border bg-background p-4 space-y-2">
              <div className="font-display text-base">🪨 착수 규칙</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <span className="font-bold">첫 차례 플레이어</span>는 첫 턴에 돌{" "}
                  <span className="font-bold">1개</span>만 놓습니다.
                </li>
                <li>
                  이후 모든 플레이어는 매 턴마다 돌{" "}
                  <span className="font-bold">2개</span>씩 놓습니다.
                </li>
                <li>이미 돌이 놓인 칸에는 둘 수 없어요.</li>
              </ul>
            </div>

            <div className="rounded-xl border-2 border-border bg-background p-4">
              <div className="font-display text-base mb-1">⏱️ 턴 진행</div>
              <p>
                설정한 순서대로 턴이 돌아가며, 타이머가 켜져 있으면 시간이 다 됐을 때
                자동으로 다음 플레이어에게 넘어갑니다.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={confirmStart}
              size="lg"
              className="btn-bounce w-full font-display rounded-xl"
            >
              확인하고 시작하기 🎮
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};
