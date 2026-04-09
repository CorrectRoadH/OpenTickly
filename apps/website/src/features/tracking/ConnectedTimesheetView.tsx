import { type ReactElement, useRef, useState } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { unwrapWebApiResult } from "../../shared/api/web-client.ts";
import { getTimeEntries } from "../../shared/api/public/track/index.ts";
import {
  useCreateTimeEntryMutation,
  useDeleteTimeEntryMutation,
  useUpdateTimeEntryMutation,
} from "../../shared/query/web-shell.ts";
import { resolveTimeEntryProjectId, toTrackIso } from "./time-entry-ids.ts";
import { formatDateKey, resolveEntryDurationSeconds } from "./overview-data.ts";
import { SurfaceMessage } from "./overview-views.tsx";
import { TimesheetView } from "./TimesheetView.tsx";
import { ProjectPickerDropdown } from "./bulk-edit-pickers.tsx";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import { useDismiss } from "../../shared/ui/useDismiss.ts";
import { useWorkspaceData } from "./useWorkspaceData.ts";
import { useWeekNavigation } from "./useWeekNavigation.ts";
import { useTimeEntryViews } from "./useTimeEntryViews.ts";
import { formatTrackQueryDate, getWeekDaysForDate } from "./week-range.ts";

export function ConnectedTimesheetView({
  showAllEntries,
}: {
  showAllEntries: boolean;
}): ReactElement {
  const { workspaceId, timezone, session, projectOptions } = useWorkspaceData();
  const { weekDays, beginningOfWeek } = useWeekNavigation();
  const views = useTimeEntryViews({ workspaceId, timezone, showAllEntries });
  const [timesheetAddRowOpen, setTimesheetAddRowOpen] = useState(false);

  const createTimeEntryMutation = useCreateTimeEntryMutation(workspaceId);
  const deleteTimeEntryMutation = useDeleteTimeEntryMutation();
  const updateTimeEntryMutation = useUpdateTimeEntryMutation();

  const mutRef = useRef({
    create: createTimeEntryMutation,
    del: deleteTimeEntryMutation,
    update: updateTimeEntryMutation,
  });
  mutRef.current = {
    create: createTimeEntryMutation,
    del: deleteTimeEntryMutation,
    update: updateTimeEntryMutation,
  };

  const viewsRef = useRef(views);
  viewsRef.current = views;

  const handleTimesheetCellEdit = async (
    projectLabel: string,
    dayIndex: number,
    durationSeconds: number,
  ) => {
    const wd = viewsRef.current;
    if (dayIndex < 0 || dayIndex >= weekDays.length) return;

    const dayKey = formatDateKey(weekDays[dayIndex], timezone);

    const matchingEntries = wd.visibleEntries.filter((entry) => {
      const entryLabel = entry.project_name?.trim() || "(No project)";
      const entryDay = formatDateKey(new Date(entry.start ?? entry.at ?? Date.now()), timezone);
      return entryLabel === projectLabel && entryDay === dayKey;
    });

    if (matchingEntries.length === 0 && durationSeconds > 0) {
      const dayDate = weekDays[dayIndex];
      const start = new Date(dayDate);
      start.setHours(9, 0, 0, 0);
      const stop = new Date(start.getTime() + durationSeconds * 1000);

      await mutRef.current.create.mutateAsync({
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
        await mutRef.current.del.mutateAsync({
          timeEntryId: entry.id,
          workspaceId: entryWid,
        });
        return;
      }

      const startMs = new Date(entry.start).getTime();
      const nextStop = new Date(startMs + durationSeconds * 1000);

      await mutRef.current.update.mutateAsync({
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

    // Multiple entries: adjust the first entry
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

    await mutRef.current.update.mutateAsync({
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
  };

  const handleCopyLastWeek = async () => {
    const lastWeekDate = new Date(weekDays[0]);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const lastWeekDays = getWeekDaysForDate(lastWeekDate, beginningOfWeek);
    const lastWeekStart = formatTrackQueryDate(lastWeekDays[0]);
    const lastWeekEnd = formatTrackQueryDate(lastWeekDays[6]);

    const lastWeekEntries = await unwrapWebApiResult(
      getTimeEntries({
        query: {
          end_date: lastWeekEnd,
          meta: true,
          start_date: lastWeekStart,
        },
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

      await mutRef.current.create.mutateAsync({
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
  };

  const handleTimesheetAddRow = (projectId: number | null) => {
    setTimesheetAddRowOpen(false);
    if (weekDays.length === 0) return;
    const firstDay = weekDays[0];
    const start = new Date(firstDay);
    start.setHours(9, 0, 0, 0);
    const stop = new Date(start);
    stop.setSeconds(stop.getSeconds() + 1);
    void createTimeEntryMutation.mutateAsync({
      billable: false,
      description: "",
      duration: 1,
      projectId,
      start: start.toISOString(),
      stop: stop.toISOString(),
      tagIds: [],
      taskId: null,
    });
  };

  if (views.timeEntriesQuery.isPending) {
    return <SurfaceMessage message="Loading time entries..." />;
  }
  if (views.timeEntriesQuery.isError) {
    return <SurfaceMessage message={views.timerErrorMessage} tone="error" />;
  }

  return (
    <div className="relative min-h-screen">
      <TimesheetView
        onAddRow={() => setTimesheetAddRowOpen((prev) => !prev)}
        onCellEdit={(projectLabel, dayIndex, durationSeconds) => {
          void handleTimesheetCellEdit(projectLabel, dayIndex, durationSeconds);
        }}
        onCopyLastWeek={() => {
          void handleCopyLastWeek();
        }}
        rows={views.timesheetRows}
        timezone={timezone}
        weekDays={weekDays}
      />
      {timesheetAddRowOpen ? (
        <TimesheetAddRowPicker
          onClose={() => setTimesheetAddRowOpen(false)}
          onSelect={handleTimesheetAddRow}
          projectOptions={projectOptions}
          workspaceName={
            session.availableWorkspaces.find((w) => w.id === workspaceId)?.name ?? "Workspace"
          }
        />
      ) : null}
    </div>
  );
}

function TimesheetAddRowPicker({
  onClose,
  onSelect,
  projectOptions,
  workspaceName,
}: {
  onClose: () => void;
  onSelect: (projectId: number | null) => void;
  projectOptions: {
    active?: boolean;
    client_name?: string | null;
    color?: string | null;
    id?: number | null;
    name?: string | null;
    pinned?: boolean;
  }[];
  workspaceName: string;
}): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  const projects = projectOptions
    .filter((p) => p.id != null && p.active !== false)
    .map((p) => ({
      clientName: p.client_name ?? undefined,
      color: resolveProjectColorValue(p),
      id: p.id as number,
      name: p.name ?? "Untitled project",
      pinned: p.pinned === true,
    }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  useDismiss(containerRef, true, onClose);

  return (
    <div
      className="absolute bottom-12 left-4 z-50 w-[280px]"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).tagName !== "INPUT") {
          e.preventDefault();
        }
      }}
      ref={containerRef}
    >
      <ProjectPickerDropdown
        onSelect={onSelect}
        projects={projects}
        workspaceName={workspaceName}
      />
    </div>
  );
}
