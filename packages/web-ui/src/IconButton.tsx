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
  sm: "size-6",
  md: "size-7",
  lg: "size-8",
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
      className={`inline-flex items-center justify-center rounded-md text-[var(--track-text-muted)] transition-[transform,background-color,color] duration-[120ms] hover:bg-[var(--track-row-hover)] hover:text-white active:translate-y-px disabled:opacity-50 disabled:translate-y-0 disabled:cursor-not-allowed ${sizeClass[size]} ${className}`}
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
