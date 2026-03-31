import type { ReactNode } from "react";

export type AppButtonSize = "default" | "sm";
export type AppButtonVariant = "ghost" | "primary" | "secondary";

type AppButtonProps = {
  children?: ReactNode;
  className?: string;
  danger?: boolean;
  "data-testid"?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  size?: AppButtonSize;
  type?: "button" | "submit";
  variant?: AppButtonVariant;
};

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-[8px] border font-semibold select-none transition-[transform,box-shadow,border-color,background-color,color] duration-[var(--duration-fast)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0";

const normal =
  "border-[var(--track-accent)] bg-[var(--track-button)] text-[var(--track-button-text)] shadow-[var(--track-depth-accent-shadow)] hover:-translate-y-px hover:bg-[var(--track-accent-fill-hover)] hover:shadow-[var(--track-depth-accent-shadow-hover)] active:translate-y-px active:shadow-[var(--track-depth-shadow-active)]";

const secondary =
  "border-[var(--track-border)] bg-transparent text-[var(--track-text)] shadow-[var(--track-depth-shadow-rest)] hover:-translate-y-px hover:border-[var(--track-control-border)] hover:bg-[var(--track-row-hover)] hover:shadow-[var(--track-depth-shadow-hover)] active:translate-y-px active:shadow-[var(--track-depth-shadow-active)]";

const ghost =
  "border-transparent bg-transparent text-[var(--track-text-muted)] shadow-none hover:bg-[var(--track-row-hover)] hover:text-[var(--track-text)] active:translate-y-px";

const dangerous =
  "border-rose-600 bg-rose-600 text-white shadow-[var(--track-depth-destructive-shadow)] hover:-translate-y-px hover:brightness-110 hover:shadow-[var(--track-depth-destructive-shadow-hover)] active:translate-y-px active:shadow-[var(--track-depth-shadow-active)]";

const sizeClass: Record<AppButtonSize, string> = {
  default: "h-9 px-4 text-[12px]",
  sm: "h-8 px-3 text-[12px]",
};

export function AppButton({
  children,
  className = "",
  danger = false,
  "data-testid": testId,
  disabled,
  onClick,
  size = "default",
  type = "button",
  variant = "primary",
}: AppButtonProps) {
  const variantClassName = danger
    ? dangerous
    : variant === "secondary"
      ? secondary
      : variant === "ghost"
        ? ghost
        : normal;

  return (
    <button
      className={`${base} ${variantClassName} ${sizeClass[size]} ${className}`}
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
