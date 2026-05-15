import { useCallback, type ChangeEvent } from "react";

type AppCheckboxProps = {
  "aria-label"?: string;
  checked?: boolean;
  "data-testid"?: string;
  disabled?: boolean;
  indeterminate?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  size?: AppCheckboxSize;
  className?: string;
  tabIndex?: number;
};

type AppCheckboxSize = "sm" | "md";

const CHECKMARK_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='2.5 6 5 9 9.5 3'/%3E%3C/svg%3E")`;
const DASH_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round'%3E%3Cline x1='2' y1='6' x2='10' y2='6'/%3E%3C/svg%3E")`;

const sizeClass: Record<AppCheckboxSize, string> = {
  sm: "size-[18px] rounded-[5px] bg-[length:12px_12px]",
  md: "size-[22px] rounded-[6px] bg-[length:14px_14px]",
};

export function AppCheckbox({
  "aria-label": ariaLabel,
  checked,
  "data-testid": testId,
  disabled,
  indeterminate,
  onChange,
  size = "sm",
  className = "",
  tabIndex,
}: AppCheckboxProps) {
  const ref = useCallback(
    (el: HTMLInputElement | null) => {
      if (el) {
        el.indeterminate = indeterminate ?? false;
      }
    },
    [indeterminate],
  );

  const activeClass =
    indeterminate || checked
      ? "border-[var(--track-accent-strong)] bg-[var(--track-accent)] animate-[track-checkbox-pop_var(--duration-fast)_var(--ease-press)]"
      : "border-[var(--track-control-border)] bg-[var(--track-state-neutral-surface)] hover:border-[var(--track-control-border-hover)]";

  return (
    <input
      aria-label={ariaLabel}
      checked={checked}
      data-testid={testId}
      className={`${sizeClass[size]} shrink-0 cursor-pointer appearance-none border-2 bg-center bg-no-repeat outline-none transition-all duration-[var(--duration-press)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--track-accent)] disabled:cursor-not-allowed disabled:opacity-50 ${activeClass} ${className}`}
      disabled={disabled}
      onChange={onChange}
      ref={ref}
      tabIndex={tabIndex}
      style={{
        transitionTimingFunction: "var(--ease-press)",
        backgroundImage: indeterminate ? DASH_SVG : checked ? CHECKMARK_SVG : "none",
      }}
      type="checkbox"
    />
  );
}
