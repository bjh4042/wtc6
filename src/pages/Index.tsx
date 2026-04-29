import { useState } from "react";
import { SetupScreen } from "@/components/SetupScreen";
import { GameScreen } from "@/components/GameScreen";
import type { HueKey } from "@/game/types";

interface GameSettings {
  players: Array<{ name: string; hue: HueKey }>;
  timerEnabled: boolean;
  timerSeconds: number;
}

const Index = () => {
  const [settings, setSettings] = useState<GameSettings | null>(null);

  return settings ? (
    <GameScreen
      players={settings.players}
      timerEnabled={settings.timerEnabled}
      timerSeconds={settings.timerSeconds}
      onExit={() => setSettings(null)}
    />
  ) : (
    <SetupScreen onStart={(opts) => setSettings(opts)} />
  );
};

export default Index;
