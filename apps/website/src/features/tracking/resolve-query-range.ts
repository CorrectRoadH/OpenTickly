import type { TimerViewMode } from "./timer-view-mode.ts";

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface TrackQueryRange {
  startDate: string;
  endDate: string;
}

export type QueryRangeMode = "week" | "rolling";

export interface ResolveQueryRangeInput {
  /** "week" = use weekRange (calendar/timesheet style); "rolling" = always use last-N-days window. */
  rangeMode: QueryRangeMode;
  view: TimerViewMode;
  listDateRange: TrackQueryRange | null;
  weekRange: TrackQueryRange;
  daysLoaded: number;
  today: Date;
}

/**
 * Decides which date range to fetch time entries for.
 *
 * Context: on Monday, `weekRange` starts on today, so any "previous day"
 * entries from the prior week are excluded. Callers that want a rolling
 * window (e.g. mobile timer) should pass rangeMode="rolling".
 */
export function resolveTimeEntryQueryRange(input: ResolveQueryRangeInput): TrackQueryRange {
  const { rangeMode, view, listDateRange, weekRange, daysLoaded, today } = input;

  if (listDateRange) return listDateRange;

  if (rangeMode === "rolling" || view === "list") {
    const end = new Date(today);
    end.setDate(end.getDate() + 1);
    const start = new Date(today);
    start.setDate(start.getDate() - daysLoaded);
    return {
      endDate: formatDate(end),
      startDate: formatDate(start),
    };
  }

  return weekRange;
}
