export type AppSurfaceTone = "danger" | "default" | "light" | "muted" | "transparent";

const surfaceToneClassNames: Record<AppSurfaceTone, string> = {
  danger: "border-rose-500/30 bg-[#23181b]",
  default: "border-[var(--track-border)] bg-[var(--track-surface)]",
  light: "border-slate-200 bg-white/95",
  muted: "border-[var(--track-border)] bg-[var(--track-surface-muted)]",
  transparent: "border-none bg-transparent shadow-none",
};

export function getSurfaceClassName(tone: AppSurfaceTone, className?: string): string {
  return ["rounded-[8px] border", surfaceToneClassNames[tone], className].filter(Boolean).join(" ");
}
