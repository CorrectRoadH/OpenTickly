import { type ReactElement, useMemo, useState } from "react";

import { buildMonthWeeks, isSameDay } from "./week-range.ts";
import { ChevronRightIcon } from "../../shared/ui/icons.tsx";

export type CalendarPanelDate = Date;

export type CalendarPanelChangeEvent = {
  day: number;
  month: number;
  year: number;
};

export type CalendarPanelProps = {
  readonly date: CalendarPanelDate;
  readonly onSelect: (date: Date) => void;
  readonly onClose?: () => void;
  readonly showOutsideDays?: boolean;
  readonly testId?: string;
};

export function CalendarPanel({
  date,
  onSelect,
  showOutsideDays = true,
  testId,
}: CalendarPanelProps): ReactElement {
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(date.getFullYear(), date.getMonth(), 1),
  );
  const weeks = useMemo(() => buildMonthWeeks(visibleMonth), [visibleMonth]);

  const today = new Date();

  return (
    <div
      aria-labelledby="calendar-panel-title"
      aria-modal="false"
      className="w-[320px] rounded-lg border border-[var(--track-overlay-border-muted)] bg-[var(--track-overlay-surface)] py-[12px] px-3.5 shadow-[var(--track-shadow-card)]"
      data-testid={testId ?? "calendar-panel"}
      role="dialog"
    >
      {/* Month header: strict 3-column layout — fixed-width left nav | centered title | fixed-width right nav */}
      <div className="mb-3 grid grid-cols-[2.25rem_1fr_2.25rem] items-center">
        <div className="flex size-6 items-center justify-start">
          <button
            aria-label="Previous month"
            className="flex w-6 h-6 items-center justify-center rounded-full text-[var(--track-control-placeholder)] transition hover:bg-white/10 hover:text-white"
            onClick={() =>
              setVisibleMonth(
                (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
              )
            }
            type="button"
          >
            <ChevronRightIcon className="size-[15px]" style={{ transform: "rotate(180deg)" }} />
          </button>
        </div>
        <h3
          className="col-start-2 text-center text-[14px] font-medium leading-[19px] text-white"
          id="calendar-panel-title"
        >
          {visibleMonth.toLocaleString("en-US", { month: "long", year: "numeric" })}
        </h3>
        <div className="flex size-6 items-center justify-end">
          <button
            aria-label="Next month"
            className="flex w-6 h-6 items-center justify-center rounded-full text-[var(--track-control-placeholder)] transition hover:bg-white/10 hover:text-white"
            onClick={() =>
              setVisibleMonth(
                (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
              )
            }
            type="button"
          >
            <ChevronRightIcon className="size-[15px]" />
          </button>
        </div>
      </div>

      {/* Weekday header — tight vertical rhythm, part of the grid */}
      <div className="mb-0 grid grid-cols-7 gap-[3px] px-0.5 text-center text-[10px] font-medium uppercase tracking-[0.03em] leading-[14px] text-[var(--track-control-border)]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => (
          <div className="pb-1" key={weekday}>
            {weekday}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="flex flex-col gap-[2px]">
        {weeks.map((week, weekIndex) => (
          <div
            className="grid grid-cols-7 gap-[3px]"
            key={`${visibleMonth.toISOString()}-${weekIndex}`}
          >
            {week.map((day) => {
              const inCurrentMonth = day.getMonth() === visibleMonth.getMonth();
              const selected = isSameDay(day, date);
              const isToday = isSameDay(day, today);

              const isOutsideMonth = !inCurrentMonth;

              const shouldRender = showOutsideDays || inCurrentMonth;

              if (!shouldRender) {
                return <div className="size-10" key={day.toISOString()} />;
              }

              return (
                <button
                  aria-label={day.toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  aria-selected={selected}
                  className={`group relative flex size-10 items-center justify-center rounded-full text-[15px] font-semibold transition ${
                    selected
                      ? "bg-[var(--track-accent-secondary)] text-[var(--track-button-text)] hover:bg-[var(--track-accent-fill-hover)]"
                      : isToday && !isOutsideMonth
                        ? "bg-[var(--track-overlay-surface-raised)] text-white hover:bg-white/[.07]"
                        : isOutsideMonth
                          ? "text-[var(--track-text-disabled)] hover:text-[var(--track-overlay-border)]"
                          : "text-[var(--track-overlay-icon)] hover:bg-white/[.06]"
                  }`}
                  key={day.toISOString()}
                  onClick={() => {
                    const nextDate = new Date(date);
                    nextDate.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
                    onSelect(nextDate);
                  }}
                  type="button"
                >
                  {day.getDate()}
                  {isToday && !selected && !isOutsideMonth ? (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-[4px] left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-[var(--track-accent-secondary)]"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
