import { type ReactNode } from "react";

type IconButtonProps = {
  "aria-label": string;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit";
};

const sizeClass = {
  sm: "size-7",
  md: "size-8",
  lg: "size-9",
} as const;

export function IconButton({
  "aria-label": ariaLabel,
  children,
  className = "",
  "data-testid": testId,
  disabled,
  onClick,
  size = "md",
  type = "button",
}: IconButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center rounded-full border-2 border-[var(--track-border)] bg-[var(--track-surface)] text-[var(--track-text-muted)] shadow-[var(--track-depth-shadow-rest)] transition-[transform,box-shadow,border-color,background-color,color] duration-[var(--duration-normal)] hover:-translate-y-px hover:border-[var(--track-control-border)] hover:bg-[var(--track-row-hover)] hover:text-white hover:shadow-[var(--track-depth-shadow-hover)] active:translate-y-0.5 active:shadow-[var(--track-depth-shadow-active)] disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none disabled:cursor-not-allowed ${sizeClass[size]} ${className}`}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      style={{ transitionTimingFunction: "var(--ease-out)" }}
      type={type}
    >
      {children}
    </button>
  );
}
