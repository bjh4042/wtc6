import { HUES, type HueKey } from "@/game/types";

interface StoneProps {
  hue: HueKey;
  size?: number; // px
  className?: string;
  animated?: boolean;
  highlight?: boolean;
}

const hueVar = (hue: HueKey) => HUES.find((h) => h.key === hue)?.varName ?? "hue-red";

export const Stone = ({ hue, size = 28, className = "", animated = false, highlight = false }: StoneProps) => {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    // expose --stone-hue to CSS for the .stone gradient
    ["--stone-hue" as any]: `var(--${hueVar(hue)})`,
  };
  return (
    <span
      aria-hidden
      style={style}
      className={[
        "stone inline-block rounded-full",
        animated ? "animate-stone-pop" : "",
        highlight ? "animate-win-pulse" : "",
        className,
      ].join(" ")}
    />
  );
};

export const StoneFlat = ({ hue, size = 22, className = "" }: { hue: HueKey; size?: number; className?: string }) => {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    ["--stone-hue" as any]: `hsl(var(--${hueVar(hue)}))`,
  };
  return <span aria-hidden style={style} className={`stone-flat inline-block rounded-full ${className}`} />;
};
