import { type ReactElement, useRef, useState } from "react";

import { CalendarPanel } from "../../features/tracking/CalendarPanel.tsx";
import { useDismiss } from "./useDismiss.ts";

type DatePickerButtonProps = {
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly onChange: (isoDate: string) => void;
  readonly placeholder?: string;
  readonly testId?: string;
  readonly value: string;
};

/**
 * A button that opens a CalendarPanel popover for date selection.
 * Replaces native `<input type="date">` with a consistent custom calendar.
 *
 * `value` and `onChange` use ISO date strings ("2026-03-28").
 */
export function DatePickerButton({
  ariaLabel,
  className = "h-10 w-full rounded-[8px] border-2 border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-left text-[12px] font-semibold text-white shadow-[var(--track-depth-shadow-rest)] transition-all duration-[var(--duration-press)] hover:-translate-y-px hover:border-[var(--track-control-border)] hover:bg-[var(--track-row-hover)] hover:shadow-[var(--track-depth-shadow-hover)] active:translate-y-0.5 active:shadow-[var(--track-depth-shadow-active)]",
  onChange,
  placeholder = "Select date",
  testId,
  value,
}: DatePickerButtonProps): ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleDismiss = () => setOpen(false);
  useDismiss(containerRef, open, handleDismiss);

  const dateObj = value ? parseDateString(value) : new Date();
  const displayLabel = value ? formatDisplayDate(value) : placeholder;

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-label={ariaLabel}
        className={className}
        data-testid={testId}
        onClick={() => setOpen((v) => !v)}
        style={{ transitionTimingFunction: "var(--ease-press)" }}
        type="button"
      >
        {displayLabel}
      </button>
      {open ? (
        <div className="absolute left-0 z-50" style={{ top: "calc(100% + 4px)" }}>
          <CalendarPanel
            date={dateObj}
            onClose={() => setOpen(false)}
            onSelect={(nextDate) => {
              const iso = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`;
              onChange(iso);
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function parseDateString(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${monthNames[m - 1]} ${d}, ${y}`;
}
