import { useCallback, type ChangeEvent } from "react";

type AppCheckboxProps = {
  "aria-label"?: string;
  checked?: boolean;
  "data-testid"?: string;
  indeterminate?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  tabIndex?: number;
};

const CHECKMARK_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='2.5 6 5 9 9.5 3'/%3E%3C/svg%3E")`;
const DASH_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round'%3E%3Cline x1='2' y1='6' x2='10' y2='6'/%3E%3C/svg%3E")`;

export function AppCheckbox({
  "aria-label": ariaLabel,
  checked,
  "data-testid": testId,
  indeterminate,
  onChange,
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

  return (
    <input
      aria-label={ariaLabel}
      checked={checked}
      data-testid={testId}
      className={`size-[14px] shrink-0 cursor-pointer appearance-none rounded-[3px] border border-[var(--track-border)] bg-transparent bg-[length:10px_10px] bg-center bg-no-repeat checked:border-[var(--track-accent)] checked:bg-[var(--track-accent)] transition-[border-color,background-color] duration-[120ms] ${className}`}
      onChange={onChange}
      ref={ref}
      tabIndex={tabIndex}
      style={{
        transitionTimingFunction: "var(--ease-spring)",
        backgroundImage: indeterminate ? DASH_SVG : checked ? CHECKMARK_SVG : "none",
      }}
      type="checkbox"
    />
  );
}
