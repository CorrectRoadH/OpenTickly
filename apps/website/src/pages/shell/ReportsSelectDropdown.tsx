import { type ReactElement, useCallback, useRef, useState } from "react";

import { useDismiss } from "../../shared/ui/useDismiss.ts";

type SelectOption<T extends string> = {
  label: string;
  value: T;
};

type ReportsSelectDropdownProps<T extends string> = {
  label: string;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  testId?: string;
  value: T;
};

/**
 * A single-select dropdown button used for "Breakdown by" and "Slice by" controls.
 */
export function ReportsSelectDropdown<T extends string>({
  label,
  onChange,
  options,
  testId,
  value,
}: ReportsSelectDropdownProps<T>): ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const closeDropdown = useCallback(() => setOpen(false), []);
  useDismiss(containerRef, open, closeDropdown);

  const activeOption = options.find((o) => o.value === value);
  const buttonText = `${label}: ${activeOption?.label ?? value}`;

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="h-9 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[12px] font-medium text-[var(--track-text-muted)]"
        data-testid={testId}
        onClick={() => setOpen(!open)}
        type="button"
      >
        {buttonText}
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-2 shadow-lg"
          data-testid={testId ? `${testId}-dropdown` : undefined}
        >
          {options.map((option) => (
            <button
              className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-[12px] hover:bg-[var(--track-surface-muted)] ${
                option.value === value
                  ? "font-semibold text-[var(--track-accent-text)]"
                  : "text-white"
              }`}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
