import { HUES, type HueKey } from "@/game/types";

interface StoneProps {
  hue: HueKey | null;
  size?: number; // px; if omitted, sizing comes from className
  className?: string;
  animated?: boolean;
  highlight?: boolean;
}

const hueVar = (hue: HueKey) => HUES.find((h) => h.key === hue)?.varName ?? "hue-red";

export const Stone = ({ hue, size, className = "", animated = false, highlight = false }: StoneProps) => {
  if (!hue) return null;
  const style: React.CSSProperties = {
    ["--stone-hue" as any]: `var(--${hueVar(hue)})`,
  };
  if (size !== undefined) {
    style.width = size;
    style.height = size;
  }
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

export const StoneFlat = ({ hue, size = 22, className = "" }: { hue: HueKey | null; size?: number; className?: string }) => {
  if (!hue) return null;
  const style: React.CSSProperties = {
    width: size,
    height: size,
    ["--stone-hue" as any]: `hsl(var(--${hueVar(hue)}))`,
  };
  return <span aria-hidden style={style} className={`stone-flat inline-block rounded-full ${className}`} />;
};
