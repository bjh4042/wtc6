import { useState } from "react";
import { SetupScreen } from "@/components/SetupScreen";
import { GameScreen } from "@/components/GameScreen";
import type { HueKey, PlayerId } from "@/game/types";

interface GameSettings {
  players: Array<{ name: string; hue: HueKey }>;
  timerEnabled: boolean;
  timerSeconds: number;
  firstPlayer: PlayerId;
}

const Index = () => {
  const [settings, setSettings] = useState<GameSettings | null>(null);

  return settings ? (
    <GameScreen
      players={settings.players}
      timerEnabled={settings.timerEnabled}
      timerSeconds={settings.timerSeconds}
      firstPlayer={settings.firstPlayer}
      onExit={() => setSettings(null)}
    />
  ) : (
    <SetupScreen onStart={(opts) => setSettings(opts)} />
  );
};

export default Index;
