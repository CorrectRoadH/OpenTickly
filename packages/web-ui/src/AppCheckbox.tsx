import { useCallback, type ChangeEvent } from "react";

type AppCheckboxProps = {
  "aria-label"?: string;
  checked?: boolean;
  "data-testid"?: string;
  indeterminate?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
};

export function AppCheckbox({
  "aria-label": ariaLabel,
  checked,
  "data-testid": testId,
  indeterminate,
  onChange,
  className = "",
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
      className={`size-[14px] cursor-pointer appearance-none rounded-[3px] border border-[var(--track-border)] bg-transparent checked:border-[var(--track-accent)] checked:bg-[var(--track-accent)] transition-[transform,border-color,background-color] duration-[120ms] ${className}`}
      onChange={onChange}
      ref={ref}
      style={{ transitionTimingFunction: "var(--ease-spring)" }}
      type="checkbox"
    />
  );
}
