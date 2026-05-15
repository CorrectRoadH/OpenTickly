import { type ReactElement, useCallback, useRef, useState } from "react";

import { AppCheckbox } from "./AppCheckbox.tsx";
import { useDismiss } from "./useDismiss.ts";

type CheckboxFilterOption<T extends string | number> = {
  key: T;
  label: string;
};

type CheckboxFilterDropdownProps<T extends string | number> = {
  clearLabel: string;
  emptyMessage: string;
  label: string;
  onClear: () => void;
  onToggle: (key: T) => void;
  options: CheckboxFilterOption<T>[];
  selected: Set<T>;
  testId?: string;
};

export function CheckboxFilterDropdown<T extends string | number>({
  clearLabel,
  emptyMessage,
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
  const selectedLabels =
    activeCount > 0 ? options.filter((o) => selected.has(o.key)).map((o) => o.label) : [];

  return (
    <div className="relative" ref={containerRef}>
      <button
        className={`flex h-10 items-center gap-1.5 rounded-[8px] border-2 px-3 text-[12px] font-semibold shadow-[var(--track-depth-shadow-rest)] transition-all duration-[var(--duration-press)] hover:-translate-y-px hover:shadow-[var(--track-depth-shadow-hover)] active:translate-y-0.5 active:shadow-[var(--track-depth-shadow-active)] ${
          activeCount > 0
            ? "border-[var(--track-accent-soft)] bg-[var(--track-accent)]/10 text-[var(--track-accent-text)] hover:bg-[var(--track-accent)]/20"
            : "border-[var(--track-border)] bg-[var(--track-surface)] text-[var(--track-text-muted)] hover:border-[var(--track-control-border)] hover:bg-[var(--track-row-hover)] hover:text-white"
        }`}
        data-testid={testId ?? `filter-${label.toLowerCase()}`}
        onClick={() => setOpen(!open)}
        style={{ transitionTimingFunction: "var(--ease-press)" }}
        type="button"
      >
        <span>{label}</span>
        {activeCount > 0 ? (
          <>
            <span className="text-[var(--track-accent-text)]/40">·</span>
            <span className="max-w-[160px] truncate">{selectedLabels.join(", ")}</span>
            <span
              className="flex size-4 shrink-0 items-center justify-center rounded-full opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              role="button"
            >
              <svg className="size-2.5" fill="none" viewBox="0 0 12 12">
                <path
                  d="M3 3l6 6M9 3l-6 6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                />
              </svg>
            </span>
          </>
        ) : null}
      </button>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-[220px] max-w-[360px] rounded-[8px] border-2 border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface)] py-2 shadow-[0_14px_32px_var(--track-shadow-overlay)]">
          <div className="border-b border-white/6 px-2 pb-2">
            <button
              className="inline-flex h-7 items-center rounded-[6px] border border-[var(--track-accent-soft)] px-2.5 text-left text-[11px] font-semibold text-[var(--track-accent-text)] transition hover:bg-white/4 disabled:cursor-not-allowed disabled:border-[var(--track-border)] disabled:text-[var(--track-text-disabled)] disabled:hover:bg-transparent"
              disabled={activeCount === 0}
              onClick={onClear}
              type="button"
            >
              {clearLabel}
            </button>
          </div>
          <div className="max-h-[240px] overflow-y-auto px-2 py-1">
            {options.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-[var(--track-text-muted)]">{emptyMessage}</p>
            ) : (
              options.map((option) => {
                const checked = selected.has(option.key);
                return (
                  <button
                    aria-checked={checked}
                    className={`my-1 flex w-full min-w-0 items-center gap-2.5 rounded-[7px] border-2 px-2.5 py-2 text-left text-[12px] transition-all duration-[var(--duration-fast)] ${
                      checked
                        ? "border-[var(--track-accent-soft)] bg-[var(--track-accent)]/8 text-white shadow-[inset_3px_0_0_var(--track-accent)]"
                        : "border-transparent text-[var(--track-overlay-text)] hover:border-[var(--track-control-border)] hover:bg-white/4"
                    }`}
                    key={option.key}
                    onClick={() => onToggle(option.key)}
                    style={{ transitionTimingFunction: "var(--ease-press)" }}
                    role="checkbox"
                    type="button"
                  >
                    <AppCheckbox checked={checked} className="pointer-events-none" tabIndex={-1} />
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
