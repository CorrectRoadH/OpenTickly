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
  form?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit";
};

type AppLinkButtonProps = AppButtonStyleProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    children?: ReactNode;
    "data-testid"?: string;
  };

const base =
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] border-2 font-semibold leading-none select-none outline-none transition-all duration-[var(--duration-press)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--track-accent)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none";

const normal =
  "border-[var(--track-button)] bg-[var(--track-button)] text-[var(--track-button-text)] shadow-[var(--track-depth-accent-shadow)] hover:-translate-y-px hover:bg-[var(--track-accent-fill-hover)] hover:border-[var(--track-accent-fill-hover)] hover:shadow-[var(--track-depth-accent-shadow-hover)] active:translate-y-0.5 active:bg-[var(--track-accent)] active:border-[var(--track-accent)] active:shadow-[var(--track-depth-accent-shadow-active)]";

const secondary =
  "border-[var(--track-border)] bg-[var(--track-surface)] text-[var(--track-text)] shadow-[var(--track-depth-shadow-rest)] hover:-translate-y-px hover:border-[var(--track-control-border)] hover:bg-[var(--track-row-hover)] hover:shadow-[var(--track-depth-shadow-hover)] active:translate-y-0.5 active:border-[var(--track-control-border)] active:shadow-[var(--track-depth-shadow-active)]";

const ghost =
  "border-transparent bg-transparent text-[var(--track-text-muted)] shadow-none hover:bg-[var(--track-row-hover)] hover:text-[var(--track-text)] active:translate-y-px";

const dangerous =
  "border-rose-600 bg-rose-600 text-white shadow-[var(--track-depth-destructive-shadow)] hover:-translate-y-px hover:brightness-110 hover:shadow-[var(--track-depth-destructive-shadow-hover)] active:translate-y-0.5 active:brightness-100 active:shadow-[var(--track-depth-destructive-shadow-active)]";

const sizeClass: Record<AppButtonSize, string> = {
  default: "h-10 px-5 text-[13px]",
  sm: "h-8 px-4 text-[12px]",
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
  form,
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
      form={form}
      onClick={onClick}
      style={{ transitionTimingFunction: "var(--ease-press)" }}
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
      style={{ ...style, transitionTimingFunction: "var(--ease-press)" }}
      target={target}
    >
      {children}
    </a>
  );
}
