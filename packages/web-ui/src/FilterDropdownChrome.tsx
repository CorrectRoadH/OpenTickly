import type { MouseEvent, ReactElement, ReactNode } from "react";

/**
 * Internal chrome shared by CheckboxFilterDropdown and RadioFilterDropdown:
 * the trigger button (with active/inactive styling + clear affordance) and
 * the floating panel container. Not part of the public package API — the
 * two filter dropdowns intentionally keep separate exported components
 * because their option-rendering (checkboxes vs single-select rows) and
 * data shapes differ.
 */

// ---------------------------------------------------------------------------
// FilterTriggerButton
// ---------------------------------------------------------------------------

type FilterTriggerButtonProps = {
  active: boolean;
  children: ReactNode;
  /** RadioFilterDropdown uses a dashed border in the inactive state; CheckboxFilterDropdown uses solid. */
  inactiveBorderStyle?: "dashed" | "solid";
  label: string;
  onClick: () => void;
  testId?: string;
};

export function FilterTriggerButton({
  active,
  children,
  inactiveBorderStyle = "solid",
  label,
  onClick,
  testId,
}: FilterTriggerButtonProps): ReactElement {
  return (
    <button
      className={`flex h-10 items-center gap-1.5 rounded-[8px] border-2 px-3 text-[12px] font-semibold shadow-[var(--track-depth-shadow-rest)] transition-all duration-[var(--duration-press)] hover:-translate-y-px hover:shadow-[var(--track-depth-shadow-hover)] active:translate-y-0.5 active:shadow-[var(--track-depth-shadow-active)] ${
        active
          ? "border-[var(--track-accent-soft)] bg-[var(--track-accent)]/10 text-[var(--track-accent-text)] hover:bg-[var(--track-accent)]/20"
          : `${inactiveBorderStyle === "dashed" ? "border-dashed " : ""}border-[var(--track-border)] bg-[var(--track-surface)] text-[var(--track-text-muted)] hover:border-[var(--track-control-border)] hover:bg-[var(--track-row-hover)] hover:text-white`
      }`}
      data-testid={testId ?? `filter-${label.toLowerCase()}`}
      onClick={onClick}
      style={{ transitionTimingFunction: "var(--ease-press)" }}
      type="button"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// FilterClearAffordance — the small round "x" that clears an active filter
// ---------------------------------------------------------------------------

type FilterClearAffordanceProps = {
  onClear: () => void;
};

export function FilterClearAffordance({ onClear }: FilterClearAffordanceProps): ReactElement {
  return (
    <span
      className="flex size-4 shrink-0 items-center justify-center rounded-full opacity-50 hover:opacity-100"
      onClick={(event: MouseEvent<HTMLSpanElement>) => {
        event.stopPropagation();
        onClear();
      }}
      role="button"
    >
      <svg className="size-2.5" fill="none" viewBox="0 0 12 12">
        <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      </svg>
    </span>
  );
}

// ---------------------------------------------------------------------------
// FilterDropdownPanel — the floating panel container
// ---------------------------------------------------------------------------

type FilterDropdownPanelProps = {
  /** Border width utility, e.g. "border" or "border-2". */
  borderClassName: string;
  children: ReactNode;
  /** Padding utilities, e.g. "p-2" or "py-3". */
  paddingClassName: string;
  /** Min/max width and wrapping utilities. */
  sizeClassName: string;
};

export function FilterDropdownPanel({
  borderClassName,
  children,
  paddingClassName,
  sizeClassName,
}: FilterDropdownPanelProps): ReactElement {
  return (
    <div
      className={`absolute left-0 top-[calc(100%+4px)] z-50 ${sizeClassName} rounded-[8px] ${borderClassName} border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface)] ${paddingClassName} shadow-[0_14px_32px_var(--track-shadow-overlay)]`}
    >
      {children}
    </div>
  );
}
