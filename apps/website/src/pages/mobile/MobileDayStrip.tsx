import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { getWeekDaysForDate, shiftWeek } from "../../features/tracking/week-range.ts";
import { ChevronRightIcon } from "../../shared/ui/icons.tsx";

type MobileDayStripProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  weekStartsOn?: number;
};

export function MobileDayStrip({
  selectedDate,
  onSelectDate,
  weekStartsOn = 1,
}: MobileDayStripProps): ReactElement {
  const { t } = useTranslation("mobile");
  const weekDays = getWeekDaysForDate(selectedDate, weekStartsOn);
  const dayKeys = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const;

  function handleShift(delta: number) {
    onSelectDate(shiftWeek(selectedDate, delta));
  }

  const todayStr = new Date().toDateString();
  const selectedStr = selectedDate.toDateString();

  return (
    <div className="flex items-center gap-1 border-b border-[var(--track-border)] bg-[var(--track-panel)] px-1 py-1.5">
      <button
        aria-label={t("previousWeek")}
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-[var(--track-text-muted)] transition hover:text-white active:bg-white/5"
        onClick={() => handleShift(-1)}
        type="button"
      >
        <ChevronRightIcon className="size-4 rotate-180" />
      </button>

      <div className="flex flex-1 justify-around">
        {weekDays.map((day) => {
          const dayStr = day.toDateString();
          const isSelected = dayStr === selectedStr;
          const isToday = dayStr === todayStr;

          return (
            <button
              key={dayStr}
              aria-pressed={isSelected}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-2.5 py-1.5 transition active:scale-95 ${
                isSelected
                  ? "bg-[var(--track-accent)] text-black"
                  : isToday
                    ? "text-[var(--track-accent)] hover:bg-white/5"
                    : "text-[var(--track-text-muted)] hover:bg-white/5 hover:text-white"
              }`}
              onClick={() => onSelectDate(day)}
              type="button"
            >
              <span className="text-[10px] font-medium">{t(dayKeys[day.getDay()])}</span>
              <span className="text-[15px] font-semibold leading-none">{day.getDate()}</span>
            </button>
          );
        })}
      </div>

      <button
        aria-label={t("nextWeek")}
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-[var(--track-text-muted)] transition hover:text-white active:bg-white/5"
        onClick={() => handleShift(1)}
        type="button"
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  );
}
