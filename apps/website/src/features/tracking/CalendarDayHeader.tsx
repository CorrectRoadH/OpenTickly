import { memo } from "react";
import { useRenderCount } from "@uidotdev/usehooks";

import i18n from "../../app/i18n.ts";
import { formatDayTotal } from "./calendar-types.ts";

// Component-boundary memo: CalendarView owns the `nowMinuteMs` ticker for
// running-entry live updates, so it re-renders every minute. Without this
// memo boundary, every day header re-renders with it, which is also what
// made RBC's TimeGridHeader flash on minute rollovers (see
// e2e/calendar-header-rerender.spec.ts). React Compiler owns most
// memoization in this repo, but it cannot skip a child render across a
// third-party-component boundary (RBC's internal TimeGridHeader) — that's
// why a memo wrapper is the right tool here.
export const CalendarDayHeader = memo(CalendarDayHeaderImpl);

function CalendarDayHeaderImpl({
  date,
  dailyTotals,
  timezone,
  today,
}: {
  date: Date;
  dailyTotals: Map<string, number>;
  timezone: string;
  today: Date;
}) {
  const renderCount = useRenderCount();
  const dayNum = date.getDate();
  const dayName = new Intl.DateTimeFormat(i18n.language, { weekday: "short" })
    .format(date)
    .toUpperCase();
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).format(date);
  const totalSeconds = dailyTotals.get(dateKey) ?? 0;
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return (
    <div
      className="flex w-full items-center gap-2 px-2 py-2"
      data-testid={`calendar-day-header-${dayName.toLowerCase()}`}
    >
      <span
        className={`flex h-[32px] w-[36px] items-center justify-center text-[22px] font-semibold leading-none ${
          isToday ? "rounded-full bg-[var(--track-accent)]/30 text-white p-2" : "text-white"
        }`}
      >
        {dayNum}
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span
          className={`text-[11px] font-medium tracking-wide ${
            isToday ? "text-[var(--track-accent)]" : "text-[var(--track-text-soft)]"
          }`}
        >
          {dayName}
        </span>
        <span className="text-[11px] tabular-nums text-[var(--track-text-soft)]">
          {totalSeconds > 0 ? formatDayTotal(totalSeconds) : "0:00:00"}
        </span>
      </span>
      {import.meta.env.DEV ? (
        <span
          className="ml-auto font-mono text-[10px] leading-none text-[var(--track-text-muted)]"
          data-testid={`calendar-day-header-rendercount-${dayName.toLowerCase()}`}
        >
          r:{renderCount}
        </span>
      ) : null}
    </div>
  );
}
