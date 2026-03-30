import { type ReactElement, useCallback, useRef, useState } from "react";

import { useDismiss } from "./useDismiss.ts";

type CheckboxFilterOption<T extends string | number> = {
  key: T;
  label: string;
};

type CheckboxFilterDropdownProps<T extends string | number> = {
  label: string;
  onClear: () => void;
  onToggle: (key: T) => void;
  options: CheckboxFilterOption<T>[];
  selected: Set<T>;
  testId?: string;
};

export function CheckboxFilterDropdown<T extends string | number>({
  label,
  onClear,
  onToggle,
  options,
  selected,
  testId,
}: CheckboxFilterDropdownProps<T>): ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  useDismiss(containerRef, open, close);

  const activeCount = selected.size;
  const buttonLabel = activeCount > 0 ? `${label} (${activeCount})` : label;

  return (
    <div className="relative" ref={containerRef}>
      <button
        className={`flex h-9 items-center gap-1 rounded-[8px] border px-3 text-[12px] font-medium ${
          activeCount > 0
            ? "border-[var(--track-accent)] bg-[var(--track-accent)]/10 text-[var(--track-accent-text)]"
            : "border-[var(--track-border)] bg-[var(--track-surface-muted)] text-[var(--track-text-muted)]"
        }`}
        data-testid={testId ?? `filter-${label.toLowerCase()}`}
        onClick={() => setOpen(!open)}
        type="button"
      >
        {buttonLabel}
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-[280px] min-w-[220px] overflow-y-auto rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-2 shadow-lg">
          {options.length === 0 ? (
            <p className="px-2 py-3 text-[12px] text-[var(--track-text-muted)]">
              No {label.toLowerCase()}s found
            </p>
          ) : (
            <>
              {activeCount > 0 ? (
                <button
                  className="mb-1 w-full rounded px-2 py-1.5 text-left text-[12px] font-medium text-[var(--track-accent-text)] hover:bg-[var(--track-surface-muted)]"
                  onClick={onClear}
                  type="button"
                >
                  Clear all
                </button>
              ) : null}
              {options.map((option) => (
                <label
                  className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-[12px] text-white hover:bg-[var(--track-surface-muted)]"
                  key={option.key}
                >
                  <input
                    checked={selected.has(option.key)}
                    className="size-3.5 accent-[var(--track-accent)]"
                    onChange={() => onToggle(option.key)}
                    type="checkbox"
                  />
                  <span className="truncate">{option.label}</span>
                </label>
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
