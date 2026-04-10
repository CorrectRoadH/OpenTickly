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
    <span className={`relative inline-flex size-[14px] shrink-0 ${className}`}>
      <input
        aria-label={ariaLabel}
        checked={checked}
        data-testid={testId}
        className="peer size-full cursor-pointer appearance-none rounded-[3px] border border-[var(--track-border)] bg-transparent checked:border-[var(--track-accent)] checked:bg-[var(--track-accent)] transition-[border-color,background-color] duration-[120ms]"
        onChange={onChange}
        ref={ref}
        style={{ transitionTimingFunction: "var(--ease-spring)" }}
        type="checkbox"
      />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 m-auto hidden size-[10px] text-white peer-checked:block peer-indeterminate:block"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        viewBox="0 0 12 12"
      >
        {indeterminate ? (
          <line x1="2" x2="10" y1="6" y2="6" />
        ) : (
          <polyline points="2.5 6 5 9 9.5 3" />
        )}
      </svg>
    </span>
  );
}
