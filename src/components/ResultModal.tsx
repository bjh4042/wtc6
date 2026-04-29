import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Stone } from "@/components/Stone";
import { HUES, type HueKey, type WinResult } from "@/game/types";
import { Trophy, Handshake } from "lucide-react";

interface ResultModalProps {
  open: boolean;
  winner: WinResult | null;
  draw: boolean;
  players: Array<{ name: string; hue: HueKey }>;
  onPlayAgain: () => void;
  onExit: () => void;
}

export const ResultModal = ({ open, winner, draw, players, onPlayAgain, onExit }: ResultModalProps) => {
  const winHue = winner ? players[winner.player].hue : null;
  const winName = winner ? players[winner.player].name : "";
  const winColorLabel = winHue ? HUES.find((h) => h.key === winHue)?.label : "";

  return (
    <Dialog open={open}>
      <DialogContent className="rounded-3xl border-2 max-w-md animate-scale-in">
        <DialogHeader className="text-center items-center">
          {winner ? (
            <>
              <Trophy className="w-12 h-12 text-primary animate-wiggle" />
              <DialogTitle className="font-display text-3xl">🎉 승리!</DialogTitle>
              <DialogDescription className="text-base">
                <span className="font-bold text-foreground">{winName}</span> ({winColorLabel})님이 6목을 완성했어요!
              </DialogDescription>
            </>
          ) : (
            <>
              <Handshake className="w-12 h-12 text-muted-foreground" />
              <DialogTitle className="font-display text-3xl">무승부</DialogTitle>
              <DialogDescription>바둑판이 가득 찼지만 승자가 없네요.</DialogDescription>
            </>
          )}
        </DialogHeader>

        {winner && winHue && (
          <div className="flex justify-center py-4">
            <Stone hue={winHue} size={88} animated highlight />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="outline" onClick={onExit} className="btn-bounce rounded-2xl h-12 font-bold border-2">
            설정으로
          </Button>
          <Button onClick={onPlayAgain} className="btn-bounce rounded-2xl h-12 font-bold">
            다시 하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
