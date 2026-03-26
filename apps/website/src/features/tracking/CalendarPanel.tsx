import { type ReactElement, useMemo, useState } from "react";

import { buildMonthWeeks, isSameDay } from "./week-range.ts";
import { TrackingIcon } from "./tracking-icons.tsx";

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
      className="w-[320px] rounded-lg border border-[#3a3a3f] bg-[#1f1f20] py-4 px-3.5 shadow-[0_6px_18px_rgba(0,0,0,0.28)]"
      data-testid={testId ?? "calendar-panel"}
      role="dialog"
    >
      {/* Month header: strict 3-column layout — fixed-width left nav | centered title | fixed-width right nav */}
      <div className="mb-3 grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
        <div className="flex size-6 items-center justify-start">
          <button
            aria-label="Previous month"
            className="flex w-6 h-6 items-center justify-center rounded-full text-[#909096] transition hover:bg-white/10 hover:text-white"
            onClick={() =>
              setVisibleMonth(
                (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
              )
            }
            type="button"
          >
            <TrackingIcon
              className="size-[15px]"
              name="chevron-right"
              style={{ transform: "rotate(180deg)" }}
            />
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
            className="flex w-6 h-6 items-center justify-center rounded-full text-[#909096] transition hover:bg-white/10 hover:text-white"
            onClick={() =>
              setVisibleMonth(
                (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
              )
            }
            type="button"
          >
            <TrackingIcon className="size-[15px]" name="chevron-right" />
          </button>
        </div>
      </div>

      {/* Weekday header — tight vertical rhythm, part of the grid */}
      <div className="mb-0 grid grid-cols-7 gap-[3px] px-0.5 text-center text-[10px] font-medium uppercase tracking-[0.04em] text-[#54545a]">
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
                  className={`group relative flex size-10 items-center justify-center rounded-full text-[14px] font-semibold transition ${
                    selected
                      ? "bg-[#b77fc0] text-[#2b222b] hover:bg-[#bc84c4]"
                      : isToday && !isOutsideMonth
                        ? "bg-[#2d2d30] text-white hover:bg-white/[.07]"
                        : isOutsideMonth
                          ? "text-[#36363a] hover:text-[#3d3d42]"
                          : "text-[#ededf0] hover:bg-white/[.06]"
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
                      className="absolute bottom-[4px] left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-[#c78acd]"
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
