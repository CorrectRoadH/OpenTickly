import { type ReactElement, useRef } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  useCreateTimeEntryMutation,
  useCreateWorkspaceFavoriteMutation,
  useCurrentTimeEntryQuery,
  useDeleteTimeEntryMutation,
  useStartTimeEntryMutation,
  useStopTimeEntryMutation,
  useUpdateTimeEntryMutation,
} from "../../shared/query/web-shell.ts";
import { resolveTimeEntryProjectId as resolveCanonicalTimeEntryProjectId } from "./time-entry-ids.ts";
import { CalendarView, type CalendarContextMenuAction } from "./CalendarView.tsx";
import { SurfaceMessage } from "./overview-views.tsx";
import { useTimerViewStore } from "./store/timer-view-store.ts";
import { useWorkspaceData } from "./useWorkspaceData.ts";
import { useWeekNavigation } from "./useWeekNavigation.ts";
import { useTimeEntryViews } from "./useTimeEntryViews.ts";
import { formatTrackQueryDate } from "./week-range.ts";
import type { DisplaySettings } from "./DisplaySettingsPopover.tsx";

function resolveTimeEntryProjectId(entry: {
  project_id?: number | null;
  pid?: number | null;
}): number | null {
  const projectId = resolveCanonicalTimeEntryProjectId(entry);
  if (projectId == null || projectId <= 0) return null;
  return projectId;
}

function toTrackIso(date: Date): string {
  return date.toISOString().replace(".000Z", "Z");
}

type DeletedEntrySnapshot = {
  billable: boolean;
  description: string;
  duration: number;
  projectId: number | null;
  start: string;
  stop: string;
  tagIds: number[];
  taskId: number | null;
};

export function ConnectedCalendarView({
  calendarHours,
  showAllEntries,
  onDeleteWithUndo,
}: {
  calendarHours: DisplaySettings["calendarHours"];
  showAllEntries: boolean;
  onDeleteWithUndo: (snapshot: DeletedEntrySnapshot) => void;
}): ReactElement {
  const { workspaceId, timezone } = useWorkspaceData();
  const { selectedWeekDate, setSelectedWeekDate, weekDays, beginningOfWeek } = useWeekNavigation();
  const views = useTimeEntryViews({ workspaceId, timezone, showAllEntries });

  // Only subscribe to the running entry query — not the full useTimerComposer hook
  // which pulls in dozens of Zustand selectors and mutation objects that cause re-renders
  const currentTimeEntryQuery = useCurrentTimeEntryQuery();
  const runningEntry = currentTimeEntryQuery.data ?? null;

  const calendarSubview = useTimerViewStore((s) => s.calendarSubview);
  const calendarZoom = useTimerViewStore((s) => s.calendarZoom);
  const calendarDraftEntry = useTimerViewStore((s) => s.calendarDraftEntry);

  const selectedSubviewDateIso =
    calendarSubview === "day" ? formatTrackQueryDate(selectedWeekDate) : undefined;

  const onSelectSubviewDate = (dateIso: string) => {
    setSelectedWeekDate(new Date(`${dateIso}T00:00:00`));
  };

  const createTimeEntryMutation = useCreateTimeEntryMutation(workspaceId);
  const createWorkspaceFavoriteMutation = useCreateWorkspaceFavoriteMutation(workspaceId);
  const deleteTimeEntryMutation = useDeleteTimeEntryMutation();
  const updateTimeEntryMutation = useUpdateTimeEntryMutation();
  const startTimeEntryMutation = useStartTimeEntryMutation(workspaceId);
  const stopTimeEntryMutation = useStopTimeEntryMutation();

  const mutRef = useRef({
    create: createTimeEntryMutation,
    createFavorite: createWorkspaceFavoriteMutation,
    del: deleteTimeEntryMutation,
    update: updateTimeEntryMutation,
    start: startTimeEntryMutation,
    stop: stopTimeEntryMutation,
  });
  mutRef.current = {
    create: createTimeEntryMutation,
    createFavorite: createWorkspaceFavoriteMutation,
    del: deleteTimeEntryMutation,
    update: updateTimeEntryMutation,
    start: startTimeEntryMutation,
    stop: stopTimeEntryMutation,
  };

  const viewsRef = useRef(views);
  viewsRef.current = views;

  const handleEntryEdit = (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    anchorRect: DOMRect,
  ) => {
    const pageContainer = document.querySelector<HTMLElement>(
      '[data-testid="tracking-timer-page"]',
    );
    const pageRect = pageContainer?.getBoundingClientRect();
    const pageLeft = pageRect?.left ?? 0;
    const pageTop = (pageRect?.top ?? 0) + window.scrollY;
    const containerWidth = pageContainer?.clientWidth ?? window.innerWidth;
    const anchorLeft = anchorRect.left - pageLeft;
    const preferredPlacement = anchorLeft > containerWidth / 2 ? "left" : "right";
    const store = useTimerViewStore.getState();
    store.setSelectedEntry(entry);
    store.setSelectedEntryAnchor({
      containerWidth,
      height: anchorRect.height,
      left: anchorLeft,
      preferredPlacement,
      top: anchorRect.top + window.scrollY - pageTop,
      width: anchorRect.width,
    });
  };

  const handleCalendarSlotCreate = (slot: { end: Date; start: Date }) => {
    const store = useTimerViewStore.getState();
    if (store.selectedEntry != null) {
      store.closeEditor();
      store.setCalendarDraftEntry(null);
      return;
    }

    const startDate = slot.start;
    const endDate = slot.end;
    const durationSeconds = Math.round((endDate.getTime() - startDate.getTime()) / 1000);

    const draftEntry: GithubComTogglTogglApiInternalModelsTimeEntry = {
      billable: false,
      description: "",
      duration: durationSeconds > 0 ? durationSeconds : 1800,
      start: toTrackIso(startDate),
      stop: toTrackIso(endDate),
      workspace_id: workspaceId,
      tag_ids: [],
    };

    store.setIsNewEntry(true);
    store.setCalendarDraftEntry(draftEntry);
    store.setSelectedEntry(draftEntry);
  };

  const handleCalendarEntryMove = async (entryId: number, minutesDelta: number) => {
    if (minutesDelta === 0) return;

    const targetEntry = viewsRef.current.visibleEntries.find((entry) => entry.id === entryId);
    if (!targetEntry?.start) return;

    const workspaceForEntry = targetEntry.workspace_id ?? targetEntry.wid;
    if (typeof workspaceForEntry !== "number") return;

    const nextStart = new Date(new Date(targetEntry.start).getTime() + minutesDelta * 60_000);
    const nextStop = targetEntry.stop
      ? new Date(new Date(targetEntry.stop).getTime() + minutesDelta * 60_000)
      : undefined;

    await mutRef.current.update.mutateAsync({
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
  };

  const handleCalendarEntryResize = async (
    entryId: number,
    edge: "start" | "end",
    minutesDelta: number,
  ) => {
    if (minutesDelta === 0) return;

    const targetEntry = viewsRef.current.visibleEntries.find((entry) => entry.id === entryId);
    if (!targetEntry?.start || !targetEntry.stop) return;

    const workspaceForEntry = targetEntry.workspace_id ?? targetEntry.wid;
    if (typeof workspaceForEntry !== "number") return;

    const startMs = new Date(targetEntry.start).getTime();
    const stopMs = new Date(targetEntry.stop).getTime();
    const deltaMs = minutesDelta * 60_000;
    const nextStartMs = edge === "start" ? startMs + deltaMs : startMs;
    const nextStopMs = edge === "end" ? stopMs + deltaMs : stopMs;

    if (nextStartMs >= nextStopMs) return;

    await mutRef.current.update.mutateAsync({
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
  };

  const onContinueEntry = (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
    const continuedDescription = (entry.description ?? "").trim();
    void mutRef.current.start
      .mutateAsync({
        billable: entry.billable,
        description: continuedDescription,
        projectId: resolveTimeEntryProjectId(entry),
        start: new Date().toISOString(),
        tagIds: entry.tag_ids ?? [],
        taskId: entry.task_id ?? entry.tid ?? null,
      })
      .then(() => {
        useTimerViewStore.getState().setRunningDescription(continuedDescription);
      });
  };

  const onContextMenu = (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    action: CalendarContextMenuAction,
  ) => {
    if (action === "split" && entry.start && entry.stop) {
      useTimerViewStore.getState().setPendingSplit(true);
      handleEntryEdit(entry, new DOMRect(0, 0, 0, 0));
      return;
    }
    handleCalendarContextMenuAction(entry, action, mutRef.current, onDeleteWithUndo);
  };

  const onMoveEntry = (entryId: number, minutesDelta: number) => {
    void handleCalendarEntryMove(entryId, minutesDelta);
  };

  const onResizeEntry = (entryId: number, edge: "start" | "end", minutesDelta: number) => {
    void handleCalendarEntryResize(entryId, edge, minutesDelta);
  };

  const runningEntryRef = useRef(runningEntry);
  runningEntryRef.current = runningEntry;

  const onStartEntry = () => {
    const running = runningEntryRef.current;
    if (running?.id != null) {
      const wid = running.workspace_id ?? running.wid;
      if (typeof wid === "number") {
        void mutRef.current.stop.mutateAsync({ timeEntryId: running.id, workspaceId: wid });
      }
      return;
    }
    // No running entry — start a new empty timer
    void mutRef.current.start.mutateAsync({
      billable: false,
      description: "",
      projectId: null,
      start: new Date().toISOString(),
      tagIds: [],
      taskId: null,
    });
  };

  const onZoomIn = () => {
    useTimerViewStore.getState().setCalendarZoom(useTimerViewStore.getState().calendarZoom + 1);
  };

  const onZoomOut = () => {
    useTimerViewStore.getState().setCalendarZoom(useTimerViewStore.getState().calendarZoom - 1);
  };

  if (views.timeEntriesQuery.isPending) {
    return <SurfaceMessage message="Loading time entries..." />;
  }
  if (views.timeEntriesQuery.isError) {
    return <SurfaceMessage message={views.timerErrorMessage} tone="error" />;
  }

  return (
    <CalendarView
      calendarHours={calendarHours}
      draftEntry={calendarDraftEntry}
      entries={views.visibleEntries}
      onContinueEntry={onContinueEntry}
      onContextMenuAction={onContextMenu}
      onEditEntry={handleEntryEdit}
      onMoveEntry={onMoveEntry}
      onResizeEntry={onResizeEntry}
      onSelectSlot={handleCalendarSlotCreate}
      onSelectSubviewDate={onSelectSubviewDate}
      onStartEntry={onStartEntry}
      onZoomIn={onZoomIn}
      onZoomOut={onZoomOut}
      runningEntry={runningEntry}
      selectedSubviewDateIso={selectedSubviewDateIso}
      subview={calendarSubview}
      timezone={timezone}
      weekDays={weekDays}
      weekStartsOn={beginningOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6}
      zoom={calendarZoom}
    />
  );
}

function snapshotEntryForUndo(entry: {
  billable?: boolean | null;
  description?: string | null;
  project_id?: number | null;
  pid?: number | null;
  start?: string | null;
  stop?: string | null;
  tag_ids?: number[] | null;
  task_id?: number | null;
  tid?: number | null;
}): DeletedEntrySnapshot | null {
  if (!entry.start || !entry.stop) return null;
  const durationSec = Math.round(
    (new Date(entry.stop).getTime() - new Date(entry.start).getTime()) / 1000,
  );
  return {
    billable: entry.billable ?? false,
    description: (entry.description ?? "").trim(),
    duration: durationSec,
    projectId: resolveTimeEntryProjectId(entry),
    start: entry.start,
    stop: entry.stop,
    tagIds: entry.tag_ids ?? [],
    taskId: entry.task_id ?? entry.tid ?? null,
  };
}

function handleCalendarContextMenuAction(
  entry: GithubComTogglTogglApiInternalModelsTimeEntry,
  action: CalendarContextMenuAction,
  mutations: {
    create: ReturnType<typeof useCreateTimeEntryMutation>;
    createFavorite: ReturnType<typeof useCreateWorkspaceFavoriteMutation>;
    del: ReturnType<typeof useDeleteTimeEntryMutation>;
  },
  showDeleteToast: (snapshot: DeletedEntrySnapshot) => void,
): void {
  const wid = entry.workspace_id ?? entry.wid;
  switch (action) {
    case "duplicate": {
      if (entry.start && entry.stop) {
        const durationSec = Math.round(
          (new Date(entry.stop).getTime() - new Date(entry.start).getTime()) / 1000,
        );
        void mutations.create.mutateAsync({
          billable: entry.billable,
          description: (entry.description ?? "").trim(),
          duration: durationSec,
          projectId: resolveTimeEntryProjectId(entry),
          start: entry.start,
          stop: entry.stop,
          tagIds: entry.tag_ids ?? [],
          taskId: entry.task_id ?? entry.tid ?? null,
        });
      }
      break;
    }
    case "delete": {
      if (typeof entry.id === "number" && typeof wid === "number") {
        const snapshot = snapshotEntryForUndo(entry);
        void mutations.del.mutateAsync({ timeEntryId: entry.id, workspaceId: wid }).then(() => {
          if (snapshot) showDeleteToast(snapshot);
        });
      }
      break;
    }
    case "copy-description": {
      const description = (entry.description ?? "").trim();
      if (description) {
        void navigator.clipboard.writeText(description);
      }
      break;
    }
    case "copy-start-link": {
      const params = new URLSearchParams();
      if (entry.description) params.set("description", entry.description.trim());
      const projectId = resolveTimeEntryProjectId(entry);
      if (projectId != null) {
        params.set("project_id", String(projectId));
      }
      if (entry.tag_ids?.length) {
        params.set("tag_ids", entry.tag_ids.join(","));
      }
      if (entry.billable) params.set("billable", "true");
      const link = `${window.location.origin}/timer?${params.toString()}`;
      void navigator.clipboard.writeText(link);
      break;
    }
    case "favorite": {
      void mutations.createFavorite.mutateAsync({
        billable: entry.billable,
        description: (entry.description ?? "").trim(),
        projectId: resolveTimeEntryProjectId(entry),
        tagIds: entry.tag_ids ?? [],
        taskId: entry.task_id ?? entry.tid ?? null,
      });
      break;
    }
  }
}
