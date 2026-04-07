import i18n from "../../app/i18n.ts";
import { formatDayTotal } from "./calendar-types.ts";

export function CalendarDayHeader({
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
    </div>
  );
}
