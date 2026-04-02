import { useMemo } from "react";

import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { useTimerViewStore } from "./store/timer-view-store.ts";
import { formatTrackQueryDate, getWeekDaysForDate } from "./week-range.ts";

export function useWeekNavigation() {
  const selectedWeekDate = useTimerViewStore((s) => s.selectedWeekDate);
  const setSelectedWeekDate = useTimerViewStore((s) => s.setSelectedWeekDate);
  const { beginningOfWeek } = useUserPreferences();

  const weekDays = useMemo(
    () => getWeekDaysForDate(selectedWeekDate, beginningOfWeek),
    [selectedWeekDate, beginningOfWeek],
  );

  const weekRange = useMemo(
    () => ({
      endDate: formatTrackQueryDate(weekDays[6]),
      startDate: formatTrackQueryDate(weekDays[0]),
    }),
    [weekDays],
  );

  return { selectedWeekDate, setSelectedWeekDate, beginningOfWeek, weekDays, weekRange };
}
