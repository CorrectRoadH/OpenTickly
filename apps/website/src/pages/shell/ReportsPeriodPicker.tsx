import { type ReactElement, useRef } from "react";

import { useDismiss } from "../../shared/ui/useDismiss.ts";

import type { ReportsTimePeriod } from "./reports-date-utils.ts";

const PERIOD_OPTIONS: Array<{ label: string; value: ReportsTimePeriod }> = [
  { label: "This week", value: "this_week" },
  { label: "Last week", value: "last_week" },
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
  { label: "This year", value: "this_year" },
];

type ReportsPeriodPickerProps = {
  onClose: () => void;
  onSelect: (period: ReportsTimePeriod) => void;
  open: boolean;
};

/**
 * Dropdown for selecting a named time period in the Reports filter bar.
 * Renders as an absolutely-positioned menu below the trigger.
 */
export function ReportsPeriodPicker({
  onClose,
  onSelect,
  open,
}: ReportsPeriodPickerProps): ReactElement | null {
  const ref = useRef<HTMLDivElement>(null);

  useDismiss(ref, open, onClose);

  if (!open) return null;

  return (
    <div
      className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-1 shadow-lg"
      data-testid="reports-period-picker"
      ref={ref}
    >
      {PERIOD_OPTIONS.map((option) => (
        <button
          className="flex w-full items-center rounded px-3 py-2 text-left text-[13px] font-medium text-white hover:bg-[var(--track-surface-muted)]"
          data-testid={`reports-period-${option.value}`}
          key={option.value}
          onClick={() => onSelect(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
