import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../../shared/api/generated/public-track/types.gen.ts";
import { unwrapWebApiResult } from "../../../shared/api/web-client.ts";
import { useTimeEntriesQuery } from "../../../shared/query/web-shell.ts";
import { getTimeEntries } from "../../../shared/api/public/track/index.ts";
import {
  buildEntryGroups,
  buildTimesheetRows,
  collapseSimilarEntries,
  formatDateKey,
  getCalendarHours,
  resolveEntryDurationSeconds,
  sortTimeEntries,
  summarizeProjects,
  sumForDate,
} from "../overview-data.ts";
import { resolveTimeEntryProjectId } from "../time-entry-ids.ts";
import { formatTrackQueryDate, getWeekDaysForDate } from "../week-range.ts";
import type { BulkEditUpdates } from "../BulkEditDialog.tsx";
import { useWorkspaceContext } from "./WorkspaceContext.tsx";
import { useViewStateContext } from "./ViewStateContext.tsx";
import { toTrackIso } from "./timer-page-utils.ts";

export interface TimeEntriesContextValue {
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  visibleEntries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  recentWorkspaceEntries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  timeEntriesQuery: ReturnType<typeof useTimeEntriesQuery>;
  groupedEntries: ReturnType<typeof buildEntryGroups>;
  trackStrip: { color: string; label: string; totalSeconds: number }[];
  calendarHours: ReturnType<typeof getCalendarHours>;
  timesheetRows: ReturnType<typeof buildTimesheetRows>;
  todayTotalSeconds: number;
  weekTotalSeconds: number;
  isLoadingMoreEntries: boolean;

  handleCalendarEntryMove: (entryId: number, minutesDelta: number) => Promise<void>;
  handleCalendarEntryResize: (
    entryId: number,
    edge: "start" | "end",
    minutesDelta: number,
  ) => Promise<void>;
  handleTimesheetCellEdit: (
    projectLabel: string,
    dayIndex: number,
    durationSeconds: number,
  ) => Promise<void>;
  handleCopyLastWeek: () => Promise<void>;
  handleBulkEdit: (ids: number[], updates: BulkEditUpdates) => Promise<void>;
  handleBulkDelete: (ids: number[]) => Promise<void>;
}

const TimeEntriesCtx = createContext<TimeEntriesContextValue | null>(null);

const LIST_INITIAL_DAYS = 9;

export function TimeEntriesProvider({
  children,
  showAllEntries = false,
}: {
  children: ReactNode;
  showAllEntries?: boolean;
}) {
  const {
    workspaceId,
    timezone,
    updateTimeEntryMutation,
    deleteTimeEntryMutation,
    bulkEditMutation,
    bulkDeleteMutation,
    beginningOfWeek,
    collapseTimeEntries,
  } = useWorkspaceContext();

  const createTimeEntryMutation = __useCreateTimeEntryMutationForEntries(workspaceId);

  const { view, weekRange, listQueryRange, weekDays, listDaysLoaded } = useViewStateContext();

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

  const isLoadingMoreEntries = timeEntriesQuery.isFetching && listDaysLoaded > LIST_INITIAL_DAYS;

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

  const handleCalendarEntryMove = useCallback(
    async (entryId: number, minutesDelta: number) => {
      if (minutesDelta === 0) return;
      const targetEntry = visibleEntries.find((entry) => entry.id === entryId);
      if (!targetEntry?.start) return;
      const workspaceForEntry = targetEntry.workspace_id ?? targetEntry.wid;
      if (typeof workspaceForEntry !== "number") return;

      const nextStart = new Date(new Date(targetEntry.start).getTime() + minutesDelta * 60_000);
      const nextStop = targetEntry.stop
        ? new Date(new Date(targetEntry.stop).getTime() + minutesDelta * 60_000)
        : undefined;

      await updateTimeEntryMutation.mutateAsync({
        request: {
          billable: targetEntry.billable,
          description: targetEntry.description ?? "",
          projectId: resolveTimeEntryProjectId(targetEntry),
          start: toTrackIso(nextStart),
          stop: nextStop ? toTrackIso(nextStop) : undefined,
          tagIds: targetEntry.tag_ids ?? [],
          taskId: targetEntry.task_id ?? targetEntry.tid ?? null,
        },
        timeEntryId: entryId,
        workspaceId: workspaceForEntry,
      });
    },
    [updateTimeEntryMutation, visibleEntries],
  );

  const handleCalendarEntryResize = useCallback(
    async (entryId: number, edge: "start" | "end", minutesDelta: number) => {
      if (minutesDelta === 0) return;
      const targetEntry = visibleEntries.find((entry) => entry.id === entryId);
      if (!targetEntry?.start || !targetEntry.stop) return;
      const workspaceForEntry = targetEntry.workspace_id ?? targetEntry.wid;
      if (typeof workspaceForEntry !== "number") return;

      const startMs = new Date(targetEntry.start).getTime();
      const stopMs = new Date(targetEntry.stop).getTime();
      const deltaMs = minutesDelta * 60_000;
      const nextStartMs = edge === "start" ? startMs + deltaMs : startMs;
      const nextStopMs = edge === "end" ? stopMs + deltaMs : stopMs;
      if (nextStartMs >= nextStopMs) return;

      await updateTimeEntryMutation.mutateAsync({
        request: {
          billable: targetEntry.billable,
          description: targetEntry.description ?? "",
          projectId: resolveTimeEntryProjectId(targetEntry),
          start: toTrackIso(new Date(nextStartMs)),
          stop: toTrackIso(new Date(nextStopMs)),
          tagIds: targetEntry.tag_ids ?? [],
          taskId: targetEntry.task_id ?? targetEntry.tid ?? null,
        },
        timeEntryId: entryId,
        workspaceId: workspaceForEntry,
      });
    },
    [updateTimeEntryMutation, visibleEntries],
  );

  const handleTimesheetCellEdit = useCallback(
    async (projectLabel: string, dayIndex: number, durationSeconds: number) => {
      if (dayIndex < 0 || dayIndex >= weekDays.length) return;
      const dayKey = formatDateKey(weekDays[dayIndex], timezone);

      const matchingEntries = visibleEntries.filter((entry) => {
        const entryLabel = entry.project_name?.trim() || "(No project)";
        const entryDay = formatDateKey(new Date(entry.start ?? entry.at ?? Date.now()), timezone);
        return entryLabel === projectLabel && entryDay === dayKey;
      });

      if (matchingEntries.length === 0 && durationSeconds > 0) {
        const dayDate = weekDays[dayIndex];
        const start = new Date(dayDate);
        start.setHours(9, 0, 0, 0);
        const stop = new Date(start.getTime() + durationSeconds * 1000);
        await createTimeEntryMutation.mutateAsync({
          billable: false,
          description: "",
          duration: durationSeconds,
          projectId: null,
          start: start.toISOString(),
          stop: stop.toISOString(),
          tagIds: [],
        });
        return;
      }

      if (matchingEntries.length === 1) {
        const entry = matchingEntries[0];
        const entryWid = entry.workspace_id ?? entry.wid;
        if (typeof entry.id !== "number" || typeof entryWid !== "number" || !entry.start) return;
        if (durationSeconds === 0) {
          await deleteTimeEntryMutation.mutateAsync({
            timeEntryId: entry.id,
            workspaceId: entryWid,
          });
          return;
        }
        const startMs = new Date(entry.start).getTime();
        const nextStop = new Date(startMs + durationSeconds * 1000);
        await updateTimeEntryMutation.mutateAsync({
          request: {
            billable: entry.billable,
            description: entry.description ?? "",
            projectId: resolveTimeEntryProjectId(entry),
            start: entry.start,
            stop: toTrackIso(nextStop),
            tagIds: entry.tag_ids ?? [],
            taskId: entry.task_id ?? entry.tid ?? null,
          },
          timeEntryId: entry.id,
          workspaceId: entryWid,
        });
        return;
      }

      const currentTotal = matchingEntries.reduce(
        (sum, e) => sum + resolveEntryDurationSeconds(e),
        0,
      );
      if (currentTotal === 0) return;
      const firstEntry = matchingEntries[0];
      const firstWid = firstEntry.workspace_id ?? firstEntry.wid;
      if (typeof firstEntry.id !== "number" || typeof firstWid !== "number" || !firstEntry.start)
        return;
      const firstDuration = resolveEntryDurationSeconds(firstEntry);
      const diff = durationSeconds - currentTotal;
      const newFirstDuration = Math.max(0, firstDuration + diff);
      const startMs = new Date(firstEntry.start).getTime();
      const nextStop = new Date(startMs + newFirstDuration * 1000);
      await updateTimeEntryMutation.mutateAsync({
        request: {
          billable: firstEntry.billable,
          description: firstEntry.description ?? "",
          projectId: resolveTimeEntryProjectId(firstEntry),
          start: firstEntry.start,
          stop: toTrackIso(nextStop),
          tagIds: firstEntry.tag_ids ?? [],
          taskId: firstEntry.task_id ?? firstEntry.tid ?? null,
        },
        timeEntryId: firstEntry.id,
        workspaceId: firstWid,
      });
    },
    [
      createTimeEntryMutation,
      deleteTimeEntryMutation,
      timezone,
      updateTimeEntryMutation,
      visibleEntries,
      weekDays,
    ],
  );

  const handleCopyLastWeek = useCallback(async () => {
    const lastWeekDate = new Date(weekDays[0]);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const lastWeekDays = getWeekDaysForDate(lastWeekDate, beginningOfWeek);
    const lastWeekStart = formatTrackQueryDate(lastWeekDays[0]);
    const lastWeekEnd = formatTrackQueryDate(lastWeekDays[6]);

    const lastWeekEntries = await unwrapWebApiResult(
      getTimeEntries({
        query: { end_date: lastWeekEnd, meta: true, start_date: lastWeekStart },
      }),
    );

    const filtered = (lastWeekEntries ?? []).filter(
      (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
        const wid = entry.workspace_id ?? entry.wid;
        return wid === workspaceId && entry.start && entry.stop;
      },
    );

    for (const entry of filtered) {
      if (!entry.start || !entry.stop) continue;
      const startMs = new Date(entry.start).getTime();
      const stopMs = new Date(entry.stop).getTime();
      const shiftMs = 7 * 24 * 60 * 60 * 1000;
      const newStart = new Date(startMs + shiftMs);
      const newStop = new Date(stopMs + shiftMs);
      const durationSec = Math.round((stopMs - startMs) / 1000);
      await createTimeEntryMutation.mutateAsync({
        billable: entry.billable,
        description: (entry.description ?? "").trim(),
        duration: durationSec,
        projectId: resolveTimeEntryProjectId(entry),
        start: toTrackIso(newStart),
        stop: toTrackIso(newStop),
        tagIds: entry.tag_ids ?? [],
        taskId: entry.task_id ?? entry.tid ?? null,
      });
    }
  }, [weekDays, beginningOfWeek, workspaceId, createTimeEntryMutation]);

  const handleBulkEdit = useCallback(
    async (ids: number[], updates: BulkEditUpdates) => {
      const operations: { op: "add" | "remove" | "replace"; path: string; value: unknown }[] = [];
      if (updates.description != null) {
        operations.push({ op: "replace", path: "/description", value: updates.description });
      }
      if (updates.projectId !== undefined) {
        operations.push({
          op: "replace",
          path: "/project_id",
          value: updates.projectId ?? 0,
        });
      }
      if (updates.tagIds != null && updates.tagIds.length > 0) {
        operations.push({ op: "add", path: "/tag_ids", value: updates.tagIds });
      }
      if (updates.removeExistingTags) {
        operations.push({ op: "remove", path: "/tag_ids", value: [] });
      }
      if (updates.billable != null) {
        operations.push({ op: "replace", path: "/billable", value: updates.billable });
      }
      if (operations.length === 0) return;
      await bulkEditMutation.mutateAsync({ operations, timeEntryIds: ids });
    },
    [bulkEditMutation],
  );

  const handleBulkDelete = useCallback(
    async (ids: number[]) => {
      await bulkDeleteMutation.mutateAsync(ids);
    },
    [bulkDeleteMutation],
  );

  const value = useMemo<TimeEntriesContextValue>(
    () => ({
      entries,
      visibleEntries,
      recentWorkspaceEntries,
      timeEntriesQuery,
      groupedEntries,
      trackStrip,
      calendarHours,
      timesheetRows,
      todayTotalSeconds,
      weekTotalSeconds,
      isLoadingMoreEntries,
      handleCalendarEntryMove,
      handleCalendarEntryResize,
      handleTimesheetCellEdit,
      handleCopyLastWeek,
      handleBulkEdit,
      handleBulkDelete,
    }),
    [
      entries,
      visibleEntries,
      recentWorkspaceEntries,
      timeEntriesQuery,
      groupedEntries,
      trackStrip,
      calendarHours,
      timesheetRows,
      todayTotalSeconds,
      weekTotalSeconds,
      isLoadingMoreEntries,
      handleCalendarEntryMove,
      handleCalendarEntryResize,
      handleTimesheetCellEdit,
      handleCopyLastWeek,
      handleBulkEdit,
      handleBulkDelete,
    ],
  );

  return <TimeEntriesCtx.Provider value={value}>{children}</TimeEntriesCtx.Provider>;
}

export function useTimeEntriesContext(): TimeEntriesContextValue {
  const ctx = useContext(TimeEntriesCtx);
  if (!ctx) {
    throw new Error("TimeEntriesProvider is required");
  }
  return ctx;
}

// Private: workspace-scoped createTimeEntryMutation for internal use.
// Avoids importing from WorkspaceContext to prevent circular dependency with
// SelectedEntryContext (which needs its own instance scoped to selectedEntryWorkspaceId).
import { useCreateTimeEntryMutation } from "../../../shared/query/web-shell.ts";

function __useCreateTimeEntryMutationForEntries(workspaceId: number) {
  return useCreateTimeEntryMutation(workspaceId);
}
