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
    <div className="flex items-center gap-1 border-b border-[var(--track-border)] bg-[var(--track-panel)] px-2 py-2">
      <button
        aria-label={t("previousWeek")}
        className="flex size-7 shrink-0 items-center justify-center rounded text-[var(--track-text-muted)] transition hover:text-white"
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
              className={`flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 transition ${
                isSelected
                  ? "bg-[var(--track-accent)] text-black"
                  : isToday
                    ? "text-[var(--track-accent)]"
                    : "text-[var(--track-text-muted)] hover:text-white"
              }`}
              onClick={() => onSelectDate(day)}
              type="button"
            >
              <span className="text-[10px] font-medium">{t(dayKeys[day.getDay()])}</span>
              <span className="text-[14px] font-semibold leading-none">{day.getDate()}</span>
            </button>
          );
        })}
      </div>

      <button
        aria-label={t("nextWeek")}
        className="flex size-7 shrink-0 items-center justify-center rounded text-[var(--track-text-muted)] transition hover:text-white"
        onClick={() => handleShift(1)}
        type="button"
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  );
}
