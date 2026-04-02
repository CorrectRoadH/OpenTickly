import { useCallback, useMemo, useState } from "react";

import { WebApiError } from "../../shared/api/web-client.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { useTimeEntriesQuery } from "../../shared/query/web-shell.ts";
import {
  buildEntryGroups,
  buildTimesheetRows,
  collapseSimilarEntries,
  getCalendarHours,
  sortTimeEntries,
  summarizeProjects,
  sumForDate,
} from "./overview-data.ts";
import { useTimerViewStore } from "./store/timer-view-store.ts";
import { useWeekNavigation } from "./useWeekNavigation.ts";
import { formatTrackQueryDate } from "./week-range.ts";

const LIST_INITIAL_DAYS = 9;
const LIST_PAGE_INCREMENT = 7;

export function useTimeEntryViews(options: {
  workspaceId: number;
  timezone: string;
  showAllEntries?: boolean;
}) {
  const { workspaceId, timezone, showAllEntries = false } = options;
  const { collapseTimeEntries } = useUserPreferences();

  const view = useTimerViewStore((s) => s.view);
  const listDateRange = useTimerViewStore((s) => s.listDateRange);
  const { weekDays, weekRange } = useWeekNavigation();

  // List view pagination
  const [listDaysLoaded, setListDaysLoaded] = useState(LIST_INITIAL_DAYS);

  const listQueryRange = useMemo(() => {
    if (listDateRange) return listDateRange;
    const end = new Date();
    end.setDate(end.getDate() + 1);
    const start = new Date();
    start.setDate(start.getDate() - listDaysLoaded);
    return {
      endDate: formatTrackQueryDate(end),
      startDate: formatTrackQueryDate(start),
    };
  }, [listDateRange, listDaysLoaded]);

  const loadMoreEntries = useCallback(() => {
    setListDaysLoaded((prev) => prev + LIST_PAGE_INCREMENT);
  }, []);

  const timeEntriesQuery = useTimeEntriesQuery(view === "list" ? listQueryRange : { ...weekRange });
  const recentTimeEntriesQuery = useTimeEntriesQuery({});

  const entries = useMemo(
    () => sortTimeEntries(timeEntriesQuery.data ?? []),
    [timeEntriesQuery.data],
  );

  const visibleEntries = useMemo(
    () =>
      showAllEntries
        ? entries
        : entries.filter((entry) => (entry.workspace_id ?? entry.wid) === workspaceId),
    [entries, showAllEntries, workspaceId],
  );

  const recentWorkspaceEntries = useMemo(
    () =>
      sortTimeEntries(recentTimeEntriesQuery.data ?? []).filter(
        (entry) => (entry.workspace_id ?? entry.wid) === workspaceId,
      ),
    [recentTimeEntriesQuery.data, workspaceId],
  );

  const hasMoreEntries = listDateRange === null;
  const isLoadingMoreEntries = timeEntriesQuery.isFetching && listDaysLoaded > LIST_INITIAL_DAYS;

  // Today total
  const todayTotalSeconds = useMemo(() => {
    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    });
    const todayKey = dateFormatter.format(new Date());
    return sumForDate(visibleEntries, todayKey, timezone);
  }, [visibleEntries, timezone]);

  // Week total
  const weekTotalSeconds = useMemo(() => {
    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    });
    return weekDays.reduce((total, day) => {
      return total + sumForDate(visibleEntries, dateFormatter.format(day), timezone);
    }, 0);
  }, [weekDays, visibleEntries, timezone]);

  const groupedEntries = useMemo(() => {
    const groups = buildEntryGroups(visibleEntries, timezone);
    return collapseTimeEntries ? collapseSimilarEntries(groups) : groups;
  }, [visibleEntries, timezone, collapseTimeEntries]);

  const trackStrip = useMemo(
    () => summarizeProjects(visibleEntries).slice(0, 12),
    [visibleEntries],
  );

  const calendarHours = useMemo(
    () => getCalendarHours(visibleEntries, weekDays, timezone),
    [visibleEntries, weekDays, timezone],
  );

  const timesheetRows = useMemo(
    () => buildTimesheetRows(visibleEntries, weekDays, timezone).slice(0, 18),
    [visibleEntries, weekDays, timezone],
  );

  const timerErrorMessage = useMemo(() => {
    const failure = timeEntriesQuery.error;
    if (failure instanceof WebApiError) {
      return failure.message;
    }
    return "We could not load or update time entries right now.";
  }, [timeEntriesQuery.error]);

  return {
    timeEntriesQuery,
    entries,
    visibleEntries,
    recentWorkspaceEntries,
    hasMoreEntries,
    isLoadingMoreEntries,
    loadMoreEntries,
    todayTotalSeconds,
    weekTotalSeconds,
    groupedEntries,
    trackStrip,
    calendarHours,
    timesheetRows,
    timerErrorMessage,
  };
}
