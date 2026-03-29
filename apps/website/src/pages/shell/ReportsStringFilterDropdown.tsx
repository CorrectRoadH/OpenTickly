import { type ReactElement, useCallback, useRef, useState } from "react";

import { useDismiss } from "../../shared/ui/useDismiss.ts";

type ReportsStringFilterDropdownProps = {
  label: string;
  onChange: (selected: string[]) => void;
  options: string[];
  selected: string[];
};

/**
 * A multi-select dropdown that works with string values (member names, client names).
 * Same UX as ReportsFilterDropdown but keyed on string instead of numeric ID.
 */
export function ReportsStringFilterDropdown({
  label,
  onChange,
  options,
  selected,
}: ReportsStringFilterDropdownProps): ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const closeDropdown = useCallback(() => setOpen(false), []);
  useDismiss(containerRef, open, closeDropdown);

  const activeCount = selected.length;
  const buttonLabel = activeCount > 0 ? `${label} (${activeCount})` : label;

  function toggleOption(name: string) {
    const next = selected.includes(name) ? selected.filter((s) => s !== name) : [...selected, name];
    onChange(next);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        className={`h-9 rounded-[8px] border px-3 text-[12px] font-medium ${
          activeCount > 0
            ? "border-[var(--track-accent)] bg-[var(--track-accent)]/10 text-[var(--track-accent-text)]"
            : "border-[var(--track-border)] bg-[var(--track-surface-muted)] text-[var(--track-text-muted)]"
        }`}
        data-testid={`reports-filter-${label.toLowerCase()}`}
        onClick={() => setOpen(!open)}
        type="button"
      >
        {buttonLabel}
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 max-h-[280px] min-w-[220px] overflow-y-auto rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-2 shadow-lg"
          data-testid={`reports-filter-${label.toLowerCase()}-dropdown`}
        >
          {options.length === 0 ? (
            <p className="px-2 py-3 text-[13px] text-[var(--track-text-muted)]">
              No {label.toLowerCase()}s found
            </p>
          ) : (
            <>
              {activeCount > 0 ? (
                <button
                  className="mb-1 w-full rounded px-2 py-1.5 text-left text-[12px] font-medium text-[var(--track-accent-text)] hover:bg-[var(--track-surface-muted)]"
                  onClick={() => onChange([])}
                  type="button"
                >
                  Clear all
                </button>
              ) : null}
              {options.map((name) => (
                <label
                  className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-[13px] text-white hover:bg-[var(--track-surface-muted)]"
                  key={name}
                >
                  <input
                    checked={selected.includes(name)}
                    className="size-3.5 accent-[var(--track-accent)]"
                    onChange={() => toggleOption(name)}
                    type="checkbox"
                  />
                  <span className="truncate">{name}</span>
                </label>
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
