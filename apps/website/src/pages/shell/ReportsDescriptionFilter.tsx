import { type ReactElement, useCallback, useEffect, useRef, useState } from "react";

import { useDismiss } from "../../shared/ui/useDismiss.ts";

type ReportsDescriptionFilterProps = {
  onChange: (value: string) => void;
  value: string;
};

/**
 * A text search dropdown for filtering report entries by description.
 * Opens a panel with an input field; applies on Enter or button click.
 */
export function ReportsDescriptionFilter({
  onChange,
  value,
}: ReportsDescriptionFilterProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const closeDropdown = useCallback(() => setOpen(false), []);
  useDismiss(containerRef, open, closeDropdown);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const hasValue = value.trim().length > 0;
  const buttonLabel = hasValue ? `Description: ${value}` : "Description";

  function applyFilter() {
    onChange(draft);
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        className={`h-9 max-w-[200px] truncate rounded-[8px] border px-3 text-[12px] font-medium ${
          hasValue
            ? "border-[var(--track-accent)] bg-[var(--track-accent)]/10 text-[var(--track-accent-text)]"
            : "border-[var(--track-border)] bg-[var(--track-surface-muted)] text-[var(--track-text-muted)]"
        }`}
        data-testid="reports-filter-description"
        onClick={() => setOpen(!open)}
        type="button"
      >
        {buttonLabel}
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[260px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-3 shadow-lg"
          data-testid="reports-filter-description-dropdown"
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
            Filter by description
          </p>
          <input
            className="h-9 w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[12px] text-white outline-none focus:border-[var(--track-accent-soft)]"
            data-testid="reports-filter-description-input"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilter();
            }}
            placeholder="Contains..."
            ref={inputRef}
            value={draft}
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              className="h-7 rounded-[6px] bg-[var(--track-button)] px-3 text-[11px] font-semibold text-black"
              data-testid="reports-filter-description-apply"
              onClick={applyFilter}
              type="button"
            >
              Apply
            </button>
            {hasValue ? (
              <button
                className="h-7 rounded-[6px] px-3 text-[11px] font-medium text-[var(--track-accent-text)] hover:bg-[var(--track-surface-muted)]"
                onClick={() => {
                  setDraft("");
                  onChange("");
                  setOpen(false);
                }}
                type="button"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
