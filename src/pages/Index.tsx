import { useState } from "react";
import { SetupScreen } from "@/components/SetupScreen";
import { GameScreen } from "@/components/GameScreen";
import type { HueKey, PlayerId } from "@/game/types";
import type { Control } from "@/game/ai/normalAi";
import type { Difficulty } from "@/game/ai/difficulty";

interface GameSettings {
  players: Array<{ name: string; hue: HueKey; control: Control }>;
  timerEnabled: boolean;
  timerSeconds: number;
  turnOrder: [PlayerId, PlayerId, PlayerId];
  aiDifficulty: Difficulty;
}


const Index = () => {
  const [settings, setSettings] = useState<GameSettings | null>(null);

  return settings ? (
    <GameScreen
      players={settings.players}
      timerEnabled={settings.timerEnabled}
      timerSeconds={settings.timerSeconds}
      turnOrder={settings.turnOrder}
      aiDifficulty={settings.aiDifficulty}
      onExit={() => setSettings(null)}
    />
  ) : (
    <SetupScreen onStart={(opts) => setSettings(opts)} />
  );
};

export default Index;
