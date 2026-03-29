import type { ReactNode } from "react";

export type AppButtonTone = "primary" | "secondary" | "ghost" | "destructive";
export type AppButtonSize = "default" | "sm";

type AppButtonProps = {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  size?: AppButtonSize;
  tone?: AppButtonTone;
  type?: "button" | "submit";
};

const base =
  "inline-flex items-center justify-center gap-1 rounded-[8px] font-semibold select-none transition-[transform,box-shadow] duration-[var(--duration-fast)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0";

const toneClass: Record<AppButtonTone, string> = {
  primary:
    "bg-[var(--track-button)] text-white shadow-[0_3px_0_0_var(--track-accent-strong)] hover:-translate-y-[2px] hover:shadow-[0_5px_0_0_var(--track-accent-strong)] active:translate-y-[2px] active:shadow-[0_0px_0_0_var(--track-accent-strong)]",
  secondary:
    "bg-[var(--track-surface)] text-[var(--track-text-muted)] border border-[var(--track-border)] shadow-[0_3px_0_0_var(--track-depth-border)] hover:-translate-y-[2px] hover:shadow-[0_5px_0_0_var(--track-depth-border)] hover:text-white active:translate-y-[2px] active:shadow-[0_0px_0_0_var(--track-depth-border)]",
  ghost:
    "bg-[var(--track-surface)] text-[var(--track-text-muted)] border border-[var(--track-border)] shadow-[0_3px_0_0_var(--track-depth-border)] hover:-translate-y-[2px] hover:shadow-[0_5px_0_0_var(--track-depth-border)] hover:text-white active:translate-y-[2px] active:shadow-[0_0px_0_0_var(--track-depth-border)]",
  destructive:
    "bg-rose-600 text-white shadow-[0_3px_0_0_#881337] hover:-translate-y-[2px] hover:shadow-[0_5px_0_0_#881337] active:translate-y-[2px] active:shadow-[0_0px_0_0_#881337]",
};

const sizeClass: Record<AppButtonSize, string> = {
  default: "h-10 px-4 text-[12px]",
  sm: "h-8 px-3 text-[11px]",
};

export function AppButton({
  children,
  className = "",
  "data-testid": testId,
  disabled,
  onClick,
  size = "default",
  tone = "primary",
  type = "button",
}: AppButtonProps) {
  return (
    <button
      className={`${base} ${toneClass[tone]} ${sizeClass[size]} ${className}`}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      style={{ transitionTimingFunction: "var(--ease-spring)" }}
      type={type}
    >
      {children}
    </button>
  );
}
