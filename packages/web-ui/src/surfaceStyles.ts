export type AppSurfaceTone = "danger" | "default" | "light" | "muted" | "transparent";

const surfaceToneClassNames: Record<AppSurfaceTone, string> = {
  danger: "border-rose-500/30 bg-[var(--track-surface-error)]",
  default:
    "border-2 border-[var(--track-border)] bg-[var(--track-surface)] shadow-[var(--track-depth-shadow-rest)]",
  light: "border-2 border-slate-200 bg-white/95 shadow-[0_5px_0_0_#cbd5e1]",
  muted:
    "border-2 border-[var(--track-border)] bg-[var(--track-surface-muted)] shadow-[var(--track-depth-shadow-rest)]",
  transparent: "border-none bg-transparent shadow-none",
};

export function getSurfaceClassName(tone: AppSurfaceTone, className?: string): string {
  return ["rounded-[18px] border", surfaceToneClassNames[tone], className]
    .filter(Boolean)
    .join(" ");
}
