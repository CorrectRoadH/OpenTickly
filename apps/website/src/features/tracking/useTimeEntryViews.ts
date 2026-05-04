import { useRef, useState } from "react";

import { WebApiError } from "../../shared/api/web-client.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import {
  useRecentTimeEntrySuggestionsQuery,
  useTimeEntriesQuery,
} from "../../shared/query/web-shell.ts";
import {
  buildEntryGroups,
  buildTimesheetRows,
  collapseSimilarEntries,
  getCalendarHours,
  sortTimeEntries,
  summarizeProjects,
  sumForDate,
} from "./overview-data.ts";
import { type QueryRangeMode, resolveTimeEntryQueryRange } from "./resolve-query-range.ts";
import { stabilizeEntryGroups, stabilizeTimeEntryList } from "./time-entry-stability.ts";
import { useTimerViewStore } from "./store/timer-view-store.ts";
import { useWeekNavigation } from "./useWeekNavigation.ts";

const LIST_INITIAL_DAYS = 9;
const LIST_PAGE_INCREMENT = 7;

export function useTimeEntryViews(options: {
  workspaceId: number;
  timezone: string;
  showAllEntries?: boolean;
  /**
   * "week" (default): calendar/timesheet views fetch the currently-selected
   * Mon-Sun week. "rolling": always fetch a rolling N-day window ending today —
   * use this for mobile so previous days remain visible on Mondays.
   */
  rangeMode?: QueryRangeMode;
}) {
  const { workspaceId, timezone, showAllEntries = false, rangeMode = "week" } = options;
  const { collapseTimeEntries } = useUserPreferences();

  const view = useTimerViewStore((s) => s.view);
  const listDateRange = useTimerViewStore((s) => s.listDateRange);
  const { weekDays, weekRange } = useWeekNavigation();

  // List view pagination
  const [listDaysLoaded, setListDaysLoaded] = useState(LIST_INITIAL_DAYS);

  const loadMoreEntries = () => {
    setListDaysLoaded((prev) => prev + LIST_PAGE_INCREMENT);
  };

  const queryRange = resolveTimeEntryQueryRange({
    rangeMode,
    view,
    listDateRange,
    weekRange,
    daysLoaded: listDaysLoaded,
    today: new Date(),
  });

  const timeEntriesQuery = useTimeEntriesQuery(queryRange);
  const recentTimeEntrySuggestionsQuery = useRecentTimeEntrySuggestionsQuery(workspaceId);

  const visibleEntriesRef = useRef<ReturnType<typeof sortTimeEntries>>([]);
  const recentWorkspaceEntriesRef = useRef<ReturnType<typeof sortTimeEntries>>([]);
  const groupedEntriesRef = useRef<ReturnType<typeof buildEntryGroups>>([]);

  const entries = sortTimeEntries(timeEntriesQuery.data ?? []);

  const nextVisibleEntries = showAllEntries
    ? entries
    : entries.filter((entry) => (entry.workspace_id ?? entry.wid) === workspaceId);
  const visibleEntries = stabilizeTimeEntryList(visibleEntriesRef.current, nextVisibleEntries);
  visibleEntriesRef.current = visibleEntries;

  const nextRecentEntries = recentTimeEntrySuggestionsQuery.data ?? [];
  const recentWorkspaceEntries = stabilizeTimeEntryList(
    recentWorkspaceEntriesRef.current,
    nextRecentEntries,
  );
  recentWorkspaceEntriesRef.current = recentWorkspaceEntries;

  const hasMoreEntries = listDateRange === null;
  const isLoadingMoreEntries = timeEntriesQuery.isFetching && listDaysLoaded > LIST_INITIAL_DAYS;

  // Today total
  const todayTotalSeconds = (() => {
    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    });
    const todayKey = dateFormatter.format(new Date());
    return sumForDate(visibleEntries, todayKey, timezone);
  })();

  // Week total
  const weekTotalSeconds = (() => {
    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    });
    return weekDays.reduce((total, day) => {
      return total + sumForDate(visibleEntries, dateFormatter.format(day), timezone);
    }, 0);
  })();

  const groupedEntriesRaw = buildEntryGroups(visibleEntries, timezone);
  const groupedEntriesNext = collapseTimeEntries
    ? collapseSimilarEntries(groupedEntriesRaw)
    : groupedEntriesRaw;
  const groupedEntries = stabilizeEntryGroups(groupedEntriesRef.current, groupedEntriesNext);
  groupedEntriesRef.current = groupedEntries;

  const trackStrip = summarizeProjects(visibleEntries).slice(0, 12);

  const calendarHours = getCalendarHours(visibleEntries, weekDays, timezone);

  const timesheetRows = buildTimesheetRows(visibleEntries, weekDays, timezone).slice(0, 18);

  const timerErrorMessage = (() => {
    const failure = timeEntriesQuery.error;
    if (failure instanceof WebApiError) {
      return failure.message;
    }
    return "We could not load or update time entries right now.";
  })();

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
