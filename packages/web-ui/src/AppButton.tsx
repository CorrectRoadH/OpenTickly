import type { AnchorHTMLAttributes, ReactNode } from "react";

export type AppButtonSize = "default" | "sm";
export type AppButtonVariant = "ghost" | "primary" | "secondary";

type AppButtonStyleProps = {
  className?: string;
  danger?: boolean;
  size?: AppButtonSize;
  variant?: AppButtonVariant;
};

type AppButtonProps = AppButtonStyleProps & {
  children?: ReactNode;
  "data-testid"?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit";
};

type AppLinkButtonProps = AppButtonStyleProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    children?: ReactNode;
    "data-testid"?: string;
  };

const base =
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] border font-semibold select-none transition-[transform,box-shadow,border-color,background-color,color] duration-[var(--duration-fast)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0";

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

export function getAppButtonClassName({
  className = "",
  danger = false,
  size = "default",
  variant = "primary",
}: AppButtonStyleProps = {}): string {
  const variantClassName = danger
    ? dangerous
    : variant === "secondary"
      ? secondary
      : variant === "ghost"
        ? ghost
        : normal;

  return `${base} ${variantClassName} ${sizeClass[size]} ${className}`.trim();
}

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
  return (
    <button
      className={getAppButtonClassName({ className, danger, size, variant })}
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

export function AppLinkButton({
  children,
  className = "",
  danger = false,
  "data-testid": testId,
  rel,
  size = "default",
  style,
  target,
  variant = "primary",
  ...props
}: AppLinkButtonProps) {
  const safeRel =
    target === "_blank"
      ? [rel, "noreferrer"].filter((value): value is string => Boolean(value)).join(" ")
      : rel;

  return (
    <a
      {...props}
      className={getAppButtonClassName({ className, danger, size, variant })}
      data-testid={testId}
      rel={safeRel}
      style={{ ...style, transitionTimingFunction: "var(--ease-spring)" }}
      target={target}
    >
      {children}
    </a>
  );
}
