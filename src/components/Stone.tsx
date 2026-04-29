import { HUES, type HueKey } from "@/game/types";

const hueStyle = (hue: HueKey): React.CSSProperties => ({
  ["--h" as any]: `var(--hue-${hue}-h)`,
  ["--s" as any]: `var(--hue-${hue}-s)`,
  ["--l" as any]: `var(--hue-${hue}-l)`,
});

interface StoneProps {
  hue: HueKey | null;
  size?: number; // px; if omitted, sizing comes from className
  className?: string;
  animated?: boolean;
  highlight?: boolean;
}

export const Stone = ({ hue, size, className = "", animated = false, highlight = false }: StoneProps) => {
  if (!hue) return null;
  const style: React.CSSProperties = { ...hueStyle(hue) };
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
  const style: React.CSSProperties = { ...hueStyle(hue), width: size, height: size };
  return <span aria-hidden style={style} className={`stone-flat inline-block rounded-full ${className}`} />;
};

// 사용 정보를 export — 라벨 등 외부에서 활용
export { HUES };
