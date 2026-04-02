import type * as React from "react";
import {
  type ChangeEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import {
  CalendarSubviewSelect,
  CalendarView,
  type CalendarContextMenuAction,
  ChromeIconButton,
  ListView,
  SummaryStat,
  SurfaceMessage,
  TimesheetView,
  ViewTab,
  ViewTabGroup,
} from "../../features/tracking/overview-views.tsx";
import {
  type DisplaySettings,
  DisplaySettingsPopover,
  readDisplaySettings,
} from "../../features/tracking/DisplaySettingsPopover.tsx";
import { GoalsFavoritesSidebar } from "../../features/tracking/GoalsFavoritesSidebar.tsx";
import { useDismiss } from "../../shared/ui/useDismiss.ts";
import { KeyboardShortcutsDialog } from "../../features/tracking/KeyboardShortcutsDialog.tsx";
import { ProjectPickerDropdown } from "../../features/tracking/bulk-edit-pickers.tsx";
import { ManualModeComposer } from "../../features/tracking/ManualModeComposer.tsx";
import { SelfContainedTimeEntryEditor } from "../../features/tracking/SelfContainedTimeEntryEditor.tsx";
import { TimerElapsedDisplay } from "../../features/tracking/TimerElapsedDisplay.tsx";
import { TimerComposerSuggestionsDialog } from "../../features/tracking/TimerComposerSuggestionsDialog.tsx";
import { resolveTimeEntryProjectId as resolveCanonicalTimeEntryProjectId } from "../../features/tracking/time-entry-ids.ts";
import { useRangePickerClose, WeekRangePicker } from "../../features/tracking/WeekRangePicker.tsx";
import {
  formatDayLabel,
  formatTrackQueryDate,
  formatWeekRangeLabel,
  getWeekDaysForDate,
  CALENDAR_SHORTCUTS,
  shiftDay,
  shiftWeek,
  type WeekShortcut,
  WEEK_SHORTCUTS,
} from "../../features/tracking/week-range.ts";
import { PanelRightIcon, ProjectsIcon, SettingsIcon, TagsIcon } from "../../shared/ui/icons.tsx";
import { TimerActionButton } from "../../shared/ui/TimerActionButton.tsx";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { unwrapWebApiResult } from "../../shared/api/web-client.ts";
import { getTimeEntries } from "../../shared/api/public/track/index.ts";
import {
  useBulkDeleteTimeEntriesMutation,
  useBulkEditTimeEntriesMutation,
  useCreateWorkspaceFavoriteMutation,
  useCreateTagMutation,
  useCreateTimeEntryMutation,
  useDeleteFavoriteMutation,
  useDeleteTimeEntryMutation,
  useFavoritesQuery,
  useGoalsQuery,
  useUpdateTimeEntryMutation,
} from "../../shared/query/web-shell.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import {
  formatClockDuration,
  resolveEntryDurationSeconds,
  formatDateKey,
} from "../../features/tracking/overview-data.ts";
import type { BulkEditUpdates } from "../../features/tracking/BulkEditDialog.tsx";
import { useTimerViewStore } from "../../features/tracking/store/timer-view-store.ts";
import { useWeekNavigation } from "../../features/tracking/useWeekNavigation.ts";
import { useWorkspaceData } from "../../features/tracking/useWorkspaceData.ts";
import { useTimerComposer } from "../../features/tracking/useTimerComposer.ts";
import { useTimeEntryViews } from "../../features/tracking/useTimeEntryViews.ts";

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

type StartParams = {
  description?: string;
  projectId?: number;
  tagIds?: number[];
  billable?: boolean;
};

type WorkspaceTimerPageProps = {
  initialDate?: Date;
  startParams?: StartParams;
};

export function WorkspaceTimerPage({
  initialDate,
  startParams,
}: WorkspaceTimerPageProps): ReactElement {
  const { t } = useTranslation("tracking");

  // Local UI state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(() =>
    readDisplaySettings(),
  );
  const [hideSecondaryHeaderLabels, setHideSecondaryHeaderLabels] = useState(false);
  const [deleteToast, setDeleteToast] = useState<DeletedEntrySnapshot | null>(null);
  const deleteToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerControlsRef = useRef<HTMLDivElement | null>(null);
  const [timesheetAddRowOpen, setTimesheetAddRowOpen] = useState(false);

  // New hooks — replace useTimerPageOrchestration
  const { durationFormat } = useUserPreferences();
  const { session, workspaceId, timezone, projectOptions, tagOptions } = useWorkspaceData();
  const { selectedWeekDate, setSelectedWeekDate, beginningOfWeek, weekDays } = useWeekNavigation();
  const composer = useTimerComposer();
  const views = useTimeEntryViews({ workspaceId, timezone, showAllEntries });

  // View state from store
  const view = useTimerViewStore((s) => s.view);
  const setView = useTimerViewStore((s) => s.setView);
  const calendarSubview = useTimerViewStore((s) => s.calendarSubview);
  const setCalendarSubview = useTimerViewStore((s) => s.setCalendarSubview);
  const timerInputMode = useTimerViewStore((s) => s.timerInputMode);
  const calendarZoom = useTimerViewStore((s) => s.calendarZoom);
  const listDateRange = useTimerViewStore((s) => s.listDateRange);
  const setListDateRange = useTimerViewStore((s) => s.setListDateRange);

  // Editor popup — only subscribe to calendarDraftEntry (needed as a CalendarView prop).
  // selectedEntry / selectedEntryAnchor live in EditorPortal to avoid full-page re-render.
  const calendarDraftEntry = useTimerViewStore((s) => s.calendarDraftEntry);

  // Mutations — keep latest in refs so useCallback closures stay stable
  const createTimeEntryMutation = useCreateTimeEntryMutation(workspaceId);
  const createWorkspaceFavoriteMutation = useCreateWorkspaceFavoriteMutation(workspaceId);
  const createTagMutation = useCreateTagMutation(workspaceId);
  const deleteTimeEntryMutation = useDeleteTimeEntryMutation();
  const updateTimeEntryMutation = useUpdateTimeEntryMutation();
  const bulkEditMutation = useBulkEditTimeEntriesMutation(workspaceId);
  const bulkDeleteMutation = useBulkDeleteTimeEntriesMutation(workspaceId);

  const mutRef = useRef({
    create: createTimeEntryMutation,
    createFavorite: createWorkspaceFavoriteMutation,
    del: deleteTimeEntryMutation,
    update: updateTimeEntryMutation,
    bulkEdit: bulkEditMutation,
    bulkDelete: bulkDeleteMutation,
  });
  mutRef.current = {
    create: createTimeEntryMutation,
    createFavorite: createWorkspaceFavoriteMutation,
    del: deleteTimeEntryMutation,
    update: updateTimeEntryMutation,
    bulkEdit: bulkEditMutation,
    bulkDelete: bulkDeleteMutation,
  };

  const composerRef = useRef(composer);
  composerRef.current = composer;

  // Sidebar data
  const favoritesQuery = useFavoritesQuery(workspaceId);
  const deleteFavoriteMutation = useDeleteFavoriteMutation(workspaceId);
  const favorites = Array.isArray(favoritesQuery.data) ? favoritesQuery.data : [];
  const goalsQuery = useGoalsQuery(workspaceId, true);
  const goals = Array.isArray(goalsQuery.data) ? goalsQuery.data : [];

  // Apply initialDate if provided (e.g. from URL params)
  useEffect(() => {
    if (initialDate) {
      setSelectedWeekDate(initialDate);
    }
  }, [initialDate, setSelectedWeekDate]);

  // Auto-start timer from URL params
  const startParamsConsumedRef = useRef(false);
  const currentEntryLoaded =
    !composer.currentTimeEntryQuery.isPending && !composer.currentTimeEntryQuery.isFetching;
  useEffect(() => {
    if (!startParams || startParamsConsumedRef.current || !currentEntryLoaded) return;
    startParamsConsumedRef.current = true;

    void composer.handleStartFromUrl(startParams).then(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("description");
      url.searchParams.delete("desc");
      url.searchParams.delete("project_id");
      url.searchParams.delete("tag_ids");
      url.searchParams.delete("billable");
      url.searchParams.delete("wid");
      window.history.replaceState(window.history.state, "", url.toString());
    });
  }, [startParams, currentEntryLoaded, composer]);

  // --- Handlers ---

  const showDeleteToast = useCallback((snapshot: DeletedEntrySnapshot) => {
    if (deleteToastTimerRef.current) {
      clearTimeout(deleteToastTimerRef.current);
    }
    setDeleteToast(snapshot);
    deleteToastTimerRef.current = setTimeout(() => {
      setDeleteToast(null);
      deleteToastTimerRef.current = null;
    }, 5000);
  }, []);

  const handleUndoDelete = useCallback(() => {
    if (!deleteToast) return;
    if (deleteToastTimerRef.current) {
      clearTimeout(deleteToastTimerRef.current);
      deleteToastTimerRef.current = null;
    }
    void createTimeEntryMutation.mutateAsync({
      billable: deleteToast.billable,
      description: deleteToast.description,
      duration: deleteToast.duration,
      projectId: deleteToast.projectId,
      start: deleteToast.start,
      stop: deleteToast.stop,
      tagIds: deleteToast.tagIds,
      taskId: deleteToast.taskId,
    });
    setDeleteToast(null);
  }, [deleteToast, createTimeEntryMutation]);

  useEffect(() => {
    return () => {
      if (deleteToastTimerRef.current) {
        clearTimeout(deleteToastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const node = headerControlsRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    let frameId = 0;
    const syncHeaderDensity = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const shouldHideLabels = node.scrollWidth > node.clientWidth;
        setHideSecondaryHeaderLabels((current) =>
          current === shouldHideLabels ? current : shouldHideLabels,
        );
      });
    };

    syncHeaderDensity();
    const observer = new ResizeObserver(syncHeaderDensity);
    observer.observe(node);
    window.addEventListener("resize", syncHeaderDensity);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", syncHeaderDensity);
    };
  }, [view, calendarSubview, views.todayTotalSeconds, views.weekTotalSeconds]);

  const handleEntryEdit = useCallback(
    (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => {
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
    },
    [],
  );

  const handleCalendarSlotCreate = useCallback(
    (slot: { end: Date; start: Date }) => {
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
    },
    [workspaceId],
  );

  const viewsRef = useRef(views);
  viewsRef.current = views;

  const handleCalendarEntryMove = useCallback(async (entryId: number, minutesDelta: number) => {
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
  }, []);

  const handleCalendarEntryResize = useCallback(
    async (entryId: number, edge: "start" | "end", minutesDelta: number) => {
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
    },
    [],
  );

  const handleTimesheetCellEdit = useCallback(
    async (projectLabel: string, dayIndex: number, durationSeconds: number) => {
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
    },
    [timezone, weekDays],
  );

  const handleCopyLastWeek = useCallback(async () => {
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
  }, [weekDays, beginningOfWeek, workspaceId]);

  const handleBulkEdit = useCallback(async (ids: number[], updates: BulkEditUpdates) => {
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

    await mutRef.current.bulkEdit.mutateAsync({ operations, timeEntryIds: ids });
  }, []);

  const handleBulkDelete = useCallback(async (ids: number[]) => {
    await mutRef.current.bulkDelete.mutateAsync(ids);
  }, []);

  const handleTimesheetAddRow = useCallback(
    (projectId: number | null) => {
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
    },
    [weekDays, createTimeEntryMutation],
  );

  const handleGlobalKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      if (event.key === "n") {
        event.preventDefault();
        composer.timerDescriptionInputRef.current?.focus();
        return;
      }

      if (event.key === "s" && composer.runningEntry?.id != null) {
        event.preventDefault();
        void composer.handleTimerAction();
      }
    },
    [composer],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [handleGlobalKeyDown]);

  // On mount, scroll the window so the current time indicator is centered
  const hasScrolledToNow = useRef(false);
  useEffect(() => {
    if (hasScrolledToNow.current || view !== "calendar") return;
    if (views.timeEntriesQuery.isPending) return;

    requestAnimationFrame(() => {
      const indicator = document.querySelector(".rbc-current-time-indicator");
      if (!indicator) return;

      const indicatorRect = indicator.getBoundingClientRect();
      const indicatorPageY = indicatorRect.top + window.scrollY;

      let stickyHeight = 0;
      document.querySelectorAll<HTMLElement>('[class*="sticky"]').forEach((el) => {
        if (getComputedStyle(el).position === "sticky" && el.offsetWidth > 200) {
          stickyHeight += el.offsetHeight;
        }
      });

      const availableHeight = window.innerHeight - stickyHeight;
      const targetScrollY = indicatorPageY - stickyHeight - availableHeight / 2;

      window.scrollTo({ top: Math.max(0, targetScrollY), behavior: "instant" });
      hasScrolledToNow.current = true;
    });
  }, [view, views.timeEntriesQuery.isPending]);

  // Stable callbacks for ListView — close over refs so they never change identity
  const onContinueEntry = useCallback((entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
    void composerRef.current.handleContinueEntry(entry);
  }, []);
  const onDeleteEntry = useCallback(
    (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
      const wid = entry.workspace_id ?? entry.wid;
      if (typeof entry.id === "number" && typeof wid === "number") {
        const snapshot = snapshotEntryForUndo(entry);
        void mutRef.current.del
          .mutateAsync({ timeEntryId: entry.id, workspaceId: wid })
          .then(() => {
            if (snapshot) showDeleteToast(snapshot);
          });
      }
    },
    [showDeleteToast],
  );
  const onDuplicateEntry = useCallback((entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
    if (entry.start && entry.stop) {
      const durationSec = Math.round(
        (new Date(entry.stop).getTime() - new Date(entry.start).getTime()) / 1000,
      );
      void mutRef.current.create.mutateAsync({
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
  }, []);
  const onDescriptionChange = useCallback(
    (entry: GithubComTogglTogglApiInternalModelsTimeEntry, description: string) => {
      const wid = entry.workspace_id ?? entry.wid;
      if (typeof entry.id === "number" && typeof wid === "number") {
        void mutRef.current.update.mutateAsync({
          request: { description },
          timeEntryId: entry.id,
          workspaceId: wid,
        });
      }
    },
    [],
  );
  const onTagsChange = useCallback(
    (entry: GithubComTogglTogglApiInternalModelsTimeEntry, tagIds: number[]) => {
      const wid = entry.workspace_id ?? entry.wid;
      if (typeof entry.id === "number" && typeof wid === "number") {
        void mutRef.current.update.mutateAsync({
          request: { tagIds },
          timeEntryId: entry.id,
          workspaceId: wid,
        });
      }
    },
    [],
  );
  const onBillableToggle = useCallback((entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
    const wid = entry.workspace_id ?? entry.wid;
    if (typeof entry.id === "number" && typeof wid === "number") {
      void mutRef.current.update.mutateAsync({
        request: { billable: !entry.billable },
        timeEntryId: entry.id,
        workspaceId: wid,
      });
    }
  }, []);
  const onProjectChange = useCallback(
    (entry: GithubComTogglTogglApiInternalModelsTimeEntry, projectId: number | null) => {
      const wid = entry.workspace_id ?? entry.wid;
      if (typeof entry.id === "number" && typeof wid === "number") {
        void mutRef.current.update.mutateAsync({
          request: { projectId },
          timeEntryId: entry.id,
          workspaceId: wid,
        });
      }
    },
    [],
  );
  const onSplitEntry = useCallback(
    (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
      if (entry.start && entry.stop) {
        handleEntryEdit(entry, new DOMRect(0, 0, 0, 0));
      }
    },
    [handleEntryEdit],
  );
  const onBulkEditList = useCallback(
    (ids: number[], updates: BulkEditUpdates) => {
      void handleBulkEdit(ids, updates);
    },
    [handleBulkEdit],
  );
  const onBulkDeleteList = useCallback(
    (ids: number[]) => {
      void handleBulkDelete(ids);
    },
    [handleBulkDelete],
  );
  const noopFavorite = useCallback(() => {}, []);
  const listViewProjects = useMemo(
    () =>
      projectOptions
        .filter((project) => project.id != null && project.active !== false)
        .map((project) => ({
          clientName: project.client_name ?? undefined,
          color: resolveProjectColorValue(project),
          id: project.id as number,
          name: project.name ?? "Untitled project",
          pinned: project.pinned === true,
        }))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned)),
    [projectOptions],
  );
  const workspaceName = useMemo(
    () => session.availableWorkspaces.find((w) => w.id === workspaceId)?.name ?? "Workspace",
    [session.availableWorkspaces, workspaceId],
  );

  // Stable CalendarView callbacks
  const onCalContextMenu = useCallback(
    (entry: GithubComTogglTogglApiInternalModelsTimeEntry, action: CalendarContextMenuAction) => {
      if (action === "split" && entry.start && entry.stop) {
        handleEntryEdit(entry, new DOMRect(0, 0, 0, 0));
        return;
      }
      handleCalendarContextMenuAction(entry, action, mutRef.current, showDeleteToast, []);
    },
    [handleEntryEdit, showDeleteToast],
  );
  const onCalMoveEntry = useCallback(
    (entryId: number, minutesDelta: number) => {
      void handleCalendarEntryMove(entryId, minutesDelta);
    },
    [handleCalendarEntryMove],
  );
  const onCalResizeEntry = useCallback(
    (entryId: number, edge: "start" | "end", minutesDelta: number) => {
      void handleCalendarEntryResize(entryId, edge, minutesDelta);
    },
    [handleCalendarEntryResize],
  );
  const onCalStartEntry = useCallback(() => {
    void composerRef.current.handleTimerAction();
  }, []);
  const onCalZoomIn = useCallback(() => {
    useTimerViewStore.getState().setCalendarZoom(useTimerViewStore.getState().calendarZoom + 1);
  }, []);
  const onCalZoomOut = useCallback(() => {
    useTimerViewStore.getState().setCalendarZoom(useTimerViewStore.getState().calendarZoom - 1);
  }, []);

  return (
    <div
      className="relative min-h-screen bg-[var(--track-surface)] text-white"
      data-testid="tracking-timer-page"
    >
      <header
        className="sticky top-0 z-20 border-b border-[var(--track-border)] bg-[var(--track-surface)]"
        ref={(el) => {
          if (el) {
            const height = el.offsetHeight;
            el.style.setProperty("--timer-header-height", `${height}px`);
            document.documentElement.style.setProperty("--timer-header-height", `${height}px`);
          }
        }}
      >
        <div className="flex min-h-[70px] flex-wrap items-center gap-x-3 gap-y-3 px-5 py-3">
          <div className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="timer-description">
              Time entry description
            </label>
            <input
              className="h-10 w-full bg-transparent text-[14px] font-medium text-white outline-none placeholder:text-[var(--track-text-muted)]"
              id="timer-description"
              ref={
                composer.timerDescriptionInputRef as unknown as React.LegacyRef<HTMLInputElement>
              }
              onBlur={() => {
                void composer.handleRunningDescriptionCommit();
              }}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                if (composer.runningEntry?.id != null) {
                  composer.setRunningDescription(event.target.value);
                  return;
                }
                composer.setDraftDescription(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || composer.runningEntry?.id == null) return;
                event.preventDefault();
                event.currentTarget.blur();
              }}
              onFocus={composer.handleIdleDescriptionFocus}
              placeholder={t("whatAreYouWorkingOn")}
              value={composer.timerDescriptionValue}
            />
          </div>
          <TimerBarProjectPicker
            draftProjectId={composer.draftProjectId}
            onProjectSelect={(projectId) => {
              if (composer.runningEntry?.id != null) {
                const wid = composer.runningEntry.workspace_id ?? composer.runningEntry.wid;
                if (typeof wid === "number") {
                  void composer.updateTimeEntryMutation.mutateAsync({
                    request: { projectId },
                    timeEntryId: composer.runningEntry.id,
                    workspaceId: wid,
                  });
                }
              } else {
                composer.setDraftProjectId(projectId);
              }
            }}
            projectOptions={projectOptions}
            runningEntry={composer.runningEntry}
            workspaceName={
              session.availableWorkspaces.find((w) => w.id === workspaceId)?.name ?? "Workspace"
            }
          />
          <TimerBarTagPicker
            draftTagIds={composer.draftTagIds}
            onCreateTag={async (name) => {
              await createTagMutation.mutateAsync(name);
            }}
            onTagToggle={(tagId) => {
              if (composer.runningEntry?.id != null) {
                const wid = composer.runningEntry.workspace_id ?? composer.runningEntry.wid;
                const currentTags = composer.runningEntry.tag_ids ?? [];
                const nextTags = currentTags.includes(tagId)
                  ? currentTags.filter((id) => id !== tagId)
                  : [...currentTags, tagId];
                if (typeof wid === "number") {
                  void composer.updateTimeEntryMutation.mutateAsync({
                    request: { tagIds: nextTags },
                    timeEntryId: composer.runningEntry.id,
                    workspaceId: wid,
                  });
                }
              } else {
                composer.setDraftTagIds(
                  composer.draftTagIds.includes(tagId)
                    ? composer.draftTagIds.filter((id) => id !== tagId)
                    : [...composer.draftTagIds, tagId],
                );
              }
            }}
            runningEntry={composer.runningEntry}
            tagOptions={tagOptions}
          />
          <button
            aria-label={composer.draftBillable ? "Set as non-billable" : "Set as billable"}
            className={`flex size-9 items-center justify-center rounded-md transition hover:bg-[var(--track-row-hover)] ${
              (
                composer.runningEntry?.id != null
                  ? composer.runningEntry.billable
                  : composer.draftBillable
              )
                ? "text-[var(--track-accent)]"
                : "text-[var(--track-text-muted)] hover:text-white"
            }`}
            onClick={() => {
              if (composer.runningEntry?.id != null) {
                const wid = composer.runningEntry.workspace_id ?? composer.runningEntry.wid;
                if (typeof wid === "number") {
                  void composer.updateTimeEntryMutation.mutateAsync({
                    request: { billable: !composer.runningEntry.billable },
                    timeEntryId: composer.runningEntry.id,
                    workspaceId: wid,
                  });
                }
              } else {
                composer.setDraftBillable(!composer.draftBillable);
              }
            }}
            type="button"
          >
            <span className="text-[14px] font-semibold">$</span>
          </button>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {timerInputMode === "manual" && composer.runningEntry == null ? (
              <ManualModeComposer
                onAddTimeEntry={(start, stop) => {
                  const durationSec = Math.round((stop.getTime() - start.getTime()) / 1000);
                  void createTimeEntryMutation.mutateAsync({
                    billable: composer.draftBillable,
                    description: composer.timerDescriptionValue.trim(),
                    duration: durationSec,
                    projectId: composer.draftProjectId ?? null,
                    start: start.toISOString(),
                    stop: stop.toISOString(),
                    tagIds: composer.draftTagIds ?? [],
                    taskId: null,
                  });
                }}
                timezone={timezone}
              />
            ) : (
              <>
                <TimerElapsedDisplay runningEntry={composer.runningEntry} />
                <TimerActionButton
                  isRunning={!!composer.runningEntry}
                  disabled={composer.timerMutationPending}
                  onClick={() => {
                    void composer.handleTimerAction();
                  }}
                />
              </>
            )}
          </div>
        </div>

        <div className="px-5 pb-4 pt-4">
          <div className="flex items-center gap-4" ref={headerControlsRef}>
            <TimerRangePicker
              beginningOfWeek={beginningOfWeek}
              calendarSubview={calendarSubview}
              listDateRange={listDateRange}
              selectedWeekDate={selectedWeekDate}
              setCalendarSubview={setCalendarSubview}
              setListDateRange={setListDateRange}
              setSelectedWeekDate={setSelectedWeekDate}
              setView={setView}
              view={view}
            />
            {view === "list" ? (
              <SummaryStat
                hideLabel={hideSecondaryHeaderLabels}
                label={t("todayTotal")}
                value={
                  views.todayTotalSeconds > 0
                    ? formatClockDuration(views.todayTotalSeconds, durationFormat)
                    : "0:00:00"
                }
              />
            ) : null}
            <SummaryStat
              hideLabel={hideSecondaryHeaderLabels}
              label={t("weekTotal")}
              value={formatClockDuration(views.weekTotalSeconds, durationFormat)}
            />
            <div className="ml-auto flex items-center gap-3">
              {view === "calendar" ? (
                <CalendarSubviewSelect
                  onChange={(next) => {
                    setCalendarSubview(next);
                    if (next === "day" && calendarSubview !== "day") {
                      setSelectedWeekDate(new Date());
                    }
                  }}
                  value={calendarSubview}
                />
              ) : null}
              <ViewTabGroup
                aria-label={t("timerView")}
                label={t("timerView")}
                onSelect={setView}
                options={["calendar", "list", "timesheet"]}
                value={view}
              >
                <ViewTab currentView={view} onSelect={setView} targetView="calendar" />
                <ViewTab currentView={view} onSelect={setView} targetView="list" />
                <ViewTab currentView={view} onSelect={setView} targetView="timesheet" />
              </ViewTabGroup>
              <div className="relative">
                <ChromeIconButton
                  active={settingsOpen}
                  aria-label={t("displaySettings")}
                  icon={<SettingsIcon className="size-4" />}
                  onClick={() => setSettingsOpen((prev) => !prev)}
                />
                {settingsOpen ? (
                  <DisplaySettingsPopover
                    onClose={() => setSettingsOpen(false)}
                    onDisplaySettingsChange={setDisplaySettings}
                    onToggleShowAllEntries={() => setShowAllEntries((prev) => !prev)}
                    showAllEntries={showAllEntries}
                  />
                ) : null}
              </div>
              <ChromeIconButton
                active={sidebarOpen}
                aria-label={t("toggleGoalsAndFavorites")}
                icon={<PanelRightIcon className="size-4" />}
                onClick={() => setSidebarOpen((prev) => !prev)}
              />
            </div>
          </div>
          {views.trackStrip.length > 0 ? <ProjectFilterStrip items={views.trackStrip} /> : null}
        </div>
      </header>
      <div className="flex min-h-0">
        <div className="min-w-0 flex-1">
          {views.timeEntriesQuery.isPending ? (
            <SurfaceMessage message={t("loadingTimeEntries")} />
          ) : null}
          {views.timeEntriesQuery.isError ? (
            <SurfaceMessage message={views.timerErrorMessage} tone="error" />
          ) : null}
          {!views.timeEntriesQuery.isPending &&
          !views.timeEntriesQuery.isError &&
          view === "list" ? (
            <ListView
              groups={views.groupedEntries}
              hasMore={views.hasMoreEntries}
              isLoadingMore={views.isLoadingMoreEntries}
              onLoadMore={views.loadMoreEntries}
              onBulkDelete={onBulkDeleteList}
              onBulkEdit={onBulkEditList}
              onContinueEntry={onContinueEntry}
              onDeleteEntry={onDeleteEntry}
              onDuplicateEntry={onDuplicateEntry}
              onDescriptionChange={onDescriptionChange}
              onEditEntry={handleEntryEdit}
              onFavoriteEntry={noopFavorite}
              onTagsChange={onTagsChange}
              onBillableToggle={onBillableToggle}
              onSplitEntry={onSplitEntry}
              onProjectChange={onProjectChange}
              projects={listViewProjects}
              tags={tagOptions}
              timezone={timezone}
              workspaceName={workspaceName}
            />
          ) : null}
          {!views.timeEntriesQuery.isPending &&
          !views.timeEntriesQuery.isError &&
          view === "calendar" ? (
            <CalendarView
              calendarHours={displaySettings.calendarHours}
              draftEntry={calendarDraftEntry}
              entries={views.visibleEntries}
              onContinueEntry={onContinueEntry}
              onContextMenuAction={onCalContextMenu}
              onEditEntry={handleEntryEdit}
              onMoveEntry={onCalMoveEntry}
              onResizeEntry={onCalResizeEntry}
              onSelectSlot={handleCalendarSlotCreate}
              onStartEntry={onCalStartEntry}
              onZoomIn={onCalZoomIn}
              onZoomOut={onCalZoomOut}
              runningEntry={composer.runningEntry}
              subview={calendarSubview}
              timezone={timezone}
              weekDays={weekDays}
              weekStartsOn={beginningOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6}
              zoom={calendarZoom}
            />
          ) : null}
          {!views.timeEntriesQuery.isPending &&
          !views.timeEntriesQuery.isError &&
          view === "timesheet" ? (
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
                    session.availableWorkspaces.find((w) => w.id === workspaceId)?.name ??
                    "Workspace"
                  }
                />
              ) : null}
            </div>
          ) : null}
          <EditorPortal
            favorites={favorites}
            onDeleteWithUndo={showDeleteToast}
            workspaces={session.availableWorkspaces.map((workspace) => ({
              id: workspace.id,
              isCurrent: workspace.isCurrent,
              name: workspace.name,
            }))}
          />
        </div>
        {sidebarOpen ? (
          <GoalsFavoritesSidebar
            favorites={favorites}
            goals={goals}
            workspaceId={workspaceId}
            onDeleteFavorite={(favoriteId) => {
              void deleteFavoriteMutation.mutateAsync(favoriteId);
            }}
            onStartFavorite={(fav) => {
              void composer.handleContinueEntry({
                billable: fav.billable,
                description: fav.description,
                project_id: fav.project_id,
                tag_ids: fav.tag_ids,
                task_id: fav.task_id,
              } as Parameters<typeof composer.handleContinueEntry>[0]);
            }}
          />
        ) : null}
      </div>
      {shortcutsOpen ? <KeyboardShortcutsDialog onClose={() => setShortcutsOpen(false)} /> : null}
      {composer.composerSuggestionsAnchor ? (
        <TimerComposerSuggestionsDialog
          anchor={composer.composerSuggestionsAnchor}
          currentWorkspaceId={workspaceId}
          favorites={favorites}
          onClose={composer.closeComposerSuggestions}
          onFavoriteSelect={(fav) => {
            composer.setDraftDescription(fav.description ?? "");
            composer.setDraftProjectId(fav.project_id ?? null);
            composer.setDraftTagIds(fav.tag_ids ?? []);
            composer.setDraftBillable(fav.billable ?? false);
            composer.closeComposerSuggestions();
          }}
          query={composer.timerDescriptionValue}
          onProjectSelect={(projectId) => {
            composer.setDraftProjectId(projectId);
            composer.closeComposerSuggestions();
          }}
          onTimeEntrySelect={(entry) => {
            composer.setDraftDescription(entry.description ?? "");
            composer.setDraftProjectId(resolveTimeEntryProjectId(entry));
            composer.setDraftTagIds(entry.tag_ids ?? []);
            composer.closeComposerSuggestions();
          }}
          onWorkspaceSelect={(nextWorkspaceId) => {
            composer.switchWorkspace(nextWorkspaceId);
            composer.closeComposerSuggestions();
          }}
          projects={projectOptions}
          searchResults={composer.searchedTimeEntries}
          timeEntries={views.recentWorkspaceEntries}
          workspaces={session.availableWorkspaces.map((workspace) => ({
            id: workspace.id,
            isCurrent: workspace.isCurrent,
            name: workspace.name,
          }))}
        />
      ) : null}
      {deleteToast ? (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-lg border border-[var(--track-border)] bg-[var(--track-surface)] px-5 py-3 shadow-[0_10px_30px_var(--track-shadow-banner)]">
          <span className="text-[14px] text-white">{t("timeEntryDeleted")}</span>
          <button
            className="text-[14px] font-semibold text-[var(--track-accent)] transition hover:text-[var(--track-accent-text)]"
            onClick={handleUndoDelete}
            type="button"
          >
            {t("undo")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Reads editor state from the store — isolated from WorkspaceTimerPage
 * so that opening/closing the editor does not re-render the entry lists.
 */
function EditorPortal({
  favorites,
  onDeleteWithUndo,
  workspaces,
}: {
  favorites: Array<{ description?: string; project_id?: number; tag_ids?: number[] }>;
  onDeleteWithUndo: (snapshot: DeletedEntrySnapshot) => void;
  workspaces: Array<{ id: number; isCurrent: boolean; name: string }>;
}): ReactElement | null {
  const selectedEntry = useTimerViewStore((s) => s.selectedEntry);
  const selectedEntryAnchor = useTimerViewStore((s) => s.selectedEntryAnchor);
  const isNewEntry = useTimerViewStore((s) => s.isNewEntry);
  const closeEditor = useTimerViewStore((s) => s.closeEditor);

  if (!selectedEntry || !selectedEntryAnchor) return null;

  return (
    <SelfContainedTimeEntryEditor
      anchor={selectedEntryAnchor}
      entry={selectedEntry}
      favorites={favorites}
      isNewEntry={isNewEntry}
      onClose={closeEditor}
      onDeleteWithUndo={onDeleteWithUndo}
      workspaces={workspaces}
    />
  );
}

function snapshotEntryForUndo(entry: {
  billable?: boolean | null;
  description?: string | null;
  duration?: number | null;
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

function isEntryAlreadyFavorited(
  entry: {
    description?: string | null;
    project_id?: number | null;
    pid?: number | null;
    tag_ids?: number[] | null;
  },
  favorites: Array<{ description?: string; project_id?: number; tag_ids?: number[] }>,
): boolean {
  const desc = (entry.description ?? "").trim().toLowerCase();
  const projectId = resolveTimeEntryProjectId(entry);
  const tagIds = [...(entry.tag_ids ?? [])].sort((a, b) => a - b);
  return favorites.some((fav) => {
    const favTags = [...(fav.tag_ids ?? [])].sort((a, b) => a - b);
    return (
      (fav.description ?? "").trim().toLowerCase() === desc &&
      (fav.project_id ?? null) === projectId &&
      tagIds.length === favTags.length &&
      tagIds.every((id, i) => id === favTags[i])
    );
  });
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
  favorites: Array<{ description?: string; project_id?: number }> = [],
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
      if (isEntryAlreadyFavorited(entry, favorites)) break;
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

function TimerBarProjectPicker({
  draftProjectId,
  onProjectSelect,
  projectOptions,
  runningEntry,
  workspaceName,
}: {
  draftProjectId: number | null;
  onProjectSelect: (id: number | null) => void;
  projectOptions: {
    active?: boolean;
    client_name?: string | null;
    color?: string | null;
    id?: number | null;
    name?: string | null;
    pinned?: boolean;
  }[];
  runningEntry: {
    id?: number | null;
    project_id?: number | null;
    pid?: number | null;
  } | null;
  workspaceName: string;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const projects = useMemo(
    () =>
      projectOptions
        .filter((p) => p.id != null && p.active !== false)
        .map((p) => ({
          clientName: p.client_name ?? undefined,
          color: resolveProjectColorValue(p),
          id: p.id as number,
          name: p.name ?? "Untitled project",
          pinned: p.pinned === true,
        }))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned)),
    [projectOptions],
  );

  const displayProjectId =
    runningEntry?.id != null ? resolveTimeEntryProjectId(runningEntry) : draftProjectId;
  const selectedProject = projects.find((p) => p.id === displayProjectId);
  const hasProject = displayProjectId != null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-label={`Add a project${selectedProject ? `: ${selectedProject.name}` : ""}`}
        className={`flex items-center justify-center gap-1.5 rounded-md transition hover:bg-[var(--track-row-hover)] ${
          selectedProject
            ? "h-9 max-w-[180px] px-2 text-[var(--track-accent)]"
            : hasProject
              ? "size-9 text-[var(--track-accent)]"
              : "size-9 text-[var(--track-text-muted)] hover:text-white"
        }`}
        onClick={() => setOpen((prev) => !prev)}
        onBlur={(e) => {
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
        type="button"
      >
        {selectedProject ? (
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: selectedProject.color }}
          />
        ) : (
          <ProjectsIcon className="size-4 shrink-0" />
        )}
        {selectedProject ? (
          <span
            className="min-w-0 truncate text-[12px] font-medium"
            style={{ color: selectedProject.color }}
          >
            {selectedProject.name}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[280px]"
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).tagName !== "INPUT") {
              e.preventDefault();
            }
          }}
        >
          <ProjectPickerDropdown
            onSelect={(projectId) => {
              setOpen(false);
              onProjectSelect(projectId);
            }}
            projects={projects}
            workspaceName={workspaceName}
          />
        </div>
      ) : null}
    </div>
  );
}

function TimerBarTagPicker({
  draftTagIds,
  onCreateTag,
  onTagToggle,
  runningEntry,
  tagOptions,
}: {
  draftTagIds: number[];
  onCreateTag?: (name: string) => Promise<unknown>;
  onTagToggle: (tagId: number) => void;
  runningEntry: { id?: number | null; tag_ids?: number[] | null } | null;
  tagOptions: { id: number; name: string }[];
}): ReactElement {
  const [isCreating, setIsCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const displayTagIds = runningEntry?.id != null ? (runningEntry.tag_ids ?? []) : draftTagIds;
  const hasTags = displayTagIds.length > 0;
  const displayTags = useMemo(
    () => tagOptions.filter((tag) => displayTagIds.includes(tag.id)),
    [tagOptions, displayTagIds],
  );
  const tagLabel = useMemo(() => {
    if (displayTags.length === 0) return undefined;
    if (displayTags.length === 1) return displayTags[0]?.name;
    return `${displayTags[0]?.name ?? "Tag"} +${displayTags.length - 1}`;
  }, [displayTags]);

  const filteredTags = useMemo(
    () =>
      search.trim()
        ? tagOptions.filter((tag) => tag.name.toLowerCase().includes(search.toLowerCase()))
        : tagOptions,
    [tagOptions, search],
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-label={tagLabel ? `Tags: ${tagLabel}` : "Select tags"}
        className={`flex items-center justify-center gap-1.5 rounded-md transition hover:bg-[var(--track-row-hover)] ${
          hasTags
            ? tagLabel
              ? "h-9 max-w-[160px] px-2 text-[var(--track-accent)]"
              : "size-9 text-[var(--track-accent)]"
            : "size-9 text-[var(--track-text-muted)] hover:text-white"
        }`}
        onClick={() => {
          setOpen((prev) => !prev);
          setSearch("");
        }}
        onBlur={(e) => {
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
        type="button"
      >
        <TagsIcon className="size-4 shrink-0" />
        {tagLabel ? (
          <span className="min-w-0 truncate text-[12px] font-medium">{tagLabel}</span>
        ) : null}
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[220px] rounded-xl border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface)] py-2 shadow-[0_14px_32px_var(--track-shadow-overlay)]"
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).tagName !== "INPUT") {
              e.preventDefault();
            }
          }}
        >
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--track-text-soft)]">
            Tags
          </div>
          <div className="px-3 pb-2">
            <input
              className="h-8 w-full rounded-lg border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-2.5 text-[12px] text-white outline-none placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent)]"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tags"
              type="text"
              value={search}
            />
          </div>
          {filteredTags.length === 0 && !search.trim() ? (
            <div className="px-3 py-2 text-[12px] text-[var(--track-text-soft)]">
              No tags available
            </div>
          ) : filteredTags.length > 0 ? (
            <div className="max-h-[200px] overflow-y-auto">
              {filteredTags.map((tag) => {
                const isSelected = draftTagIds.includes(tag.id);
                return (
                  <button
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition hover:bg-white/5 ${
                      isSelected ? "text-[var(--track-accent)]" : "text-white"
                    }`}
                    key={tag.id}
                    onClick={() => onTagToggle(tag.id)}
                    type="button"
                  >
                    <span
                      className={`flex size-4 items-center justify-center rounded border text-[11px] ${
                        isSelected
                          ? "border-[var(--track-accent)] bg-[var(--track-accent)] text-white"
                          : "border-[var(--track-border)]"
                      }`}
                    >
                      {isSelected ? "\u2713" : ""}
                    </span>
                    <span className="truncate">{tag.name}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {search.trim() &&
          onCreateTag &&
          !tagOptions.some((t) => t.name.toLowerCase() === search.trim().toLowerCase()) ? (
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[var(--track-accent)] transition hover:bg-white/5 disabled:opacity-60"
              disabled={isCreating}
              onClick={() => {
                const trimmed = search.trim();
                setIsCreating(true);
                void onCreateTag(trimmed)
                  .then((result) => {
                    const newTag = result as { id?: number } | undefined;
                    if (typeof newTag?.id === "number") {
                      onTagToggle(newTag.id);
                    }
                    setSearch("");
                  })
                  .finally(() => setIsCreating(false));
              }}
              type="button"
            >
              {isCreating ? "Creating..." : `Create tag \u201c${search.trim()}\u201d`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ProjectFilterStrip({
  items,
}: {
  items: { color: string; label: string; totalSeconds: number }[];
}): ReactElement {
  const totalSeconds = items.reduce((sum, item) => sum + item.totalSeconds, 0);

  return (
    <div className="mt-3 flex h-[22px] overflow-hidden" data-testid="project-filter-strip">
      {items.map((item) => {
        const pct =
          totalSeconds > 0 ? (item.totalSeconds / totalSeconds) * 100 : 100 / items.length;
        return (
          <div
            className="min-w-0 overflow-hidden border-r border-[var(--track-surface)] last:border-r-0"
            key={item.label}
            style={{ width: `${pct}%` }}
          >
            <div
              className="truncate px-1.5 text-[11px] font-medium uppercase tracking-wide"
              style={{ color: item.color }}
            >
              {item.label}
            </div>
            <div className="mt-0.5 h-[3px]" style={{ backgroundColor: item.color }} />
          </div>
        );
      })}
    </div>
  );
}

function TimerRangePicker({
  beginningOfWeek,
  calendarSubview,
  listDateRange,
  selectedWeekDate,
  setCalendarSubview,
  setListDateRange,
  setSelectedWeekDate,
  setView,
  view,
}: {
  beginningOfWeek: number;
  calendarSubview: string;
  listDateRange: { startDate: string; endDate: string } | null;
  selectedWeekDate: Date;
  setCalendarSubview: (next: "day" | "five-day" | "week") => void;
  setListDateRange: (range: { startDate: string; endDate: string } | null) => void;
  setSelectedWeekDate: (date: Date) => void;
  setView: (next: "calendar" | "list" | "timesheet") => void;
  view: string;
}): ReactElement {
  const { t } = useTranslation("tracking");
  const isAllDates = view === "list" && listDateRange == null;
  const isDayMode = !isAllDates && view !== "list" && calendarSubview === "day";
  const mode = isDayMode ? "day" : "week";
  const [activeShortcut, setActiveShortcut] = useState<string | null>("this-week");

  const label = isAllDates
    ? t("allDates")
    : activeShortcut === "last-30-days"
      ? t("last30Days")
      : isDayMode
        ? formatDayLabel(selectedWeekDate)
        : formatWeekRangeLabel(selectedWeekDate, beginningOfWeek);

  const handleSelectDate = useCallback(
    (date: Date) => {
      if (view === "list") {
        const days = getWeekDaysForDate(date, beginningOfWeek);
        setListDateRange({
          startDate: formatTrackQueryDate(days[0]),
          endDate: formatTrackQueryDate(days[6]),
        });
      }
      setSelectedWeekDate(date);
      setActiveShortcut(null);
    },
    [view, beginningOfWeek, setListDateRange, setSelectedWeekDate],
  );

  const handlePrev = useCallback(() => {
    handleSelectDate(isDayMode ? shiftDay(selectedWeekDate, -1) : shiftWeek(selectedWeekDate, -1));
  }, [handleSelectDate, isDayMode, selectedWeekDate]);

  const handleNext = useCallback(() => {
    handleSelectDate(isDayMode ? shiftDay(selectedWeekDate, 1) : shiftWeek(selectedWeekDate, 1));
  }, [handleSelectDate, isDayMode, selectedWeekDate]);

  const handleShortcut = useCallback(
    (shortcutId: string, date: Date) => {
      setActiveShortcut(shortcutId);
      if (shortcutId === "all-dates") {
        setListDateRange(null);
        if (view !== "list") setView("list");
      } else if (shortcutId === "last-30-days") {
        if (view === "list") {
          setListDateRange({
            startDate: formatTrackQueryDate(date),
            endDate: formatTrackQueryDate(new Date()),
          });
        } else {
          setCalendarSubview("week");
        }
        setSelectedWeekDate(date);
      } else if (shortcutId === "today" || shortcutId === "yesterday") {
        if (view === "list") {
          const dayStr = formatTrackQueryDate(date);
          setListDateRange({ startDate: dayStr, endDate: dayStr });
        } else {
          setCalendarSubview("day");
        }
        setSelectedWeekDate(date);
      } else {
        if (view === "list") {
          const days = getWeekDaysForDate(date, beginningOfWeek);
          setListDateRange({
            startDate: formatTrackQueryDate(days[0]),
            endDate: formatTrackQueryDate(days[6]),
          });
        } else {
          setCalendarSubview("week");
        }
        setSelectedWeekDate(date);
      }
    },
    [view, beginningOfWeek, setListDateRange, setSelectedWeekDate, setView, setCalendarSubview],
  );

  return (
    <WeekRangePicker
      disabled={isAllDates}
      label={label}
      mode={mode}
      onNext={handleNext}
      onPrev={handlePrev}
      onSelectDate={handleSelectDate}
      selectedDate={selectedWeekDate}
      sidebar={
        <TimerDateShortcuts
          activeShortcut={activeShortcut}
          onShortcut={handleShortcut}
          shortcuts={view === "list" ? WEEK_SHORTCUTS : CALENDAR_SHORTCUTS}
        />
      }
      weekStartsOn={beginningOfWeek}
    />
  );
}

function TimerDateShortcuts({
  activeShortcut,
  onShortcut,
  shortcuts,
}: {
  activeShortcut: string | null;
  onShortcut: (id: string, date: Date) => void;
  shortcuts: WeekShortcut[];
}): ReactElement {
  const { t } = useTranslation("tracking");
  const close = useRangePickerClose();

  return (
    <>
      {shortcuts.map((shortcut) => {
        const shortcutDate = shortcut.resolveDate(new Date());
        const isActive = activeShortcut === shortcut.id;

        return (
          <button
            aria-pressed={isActive}
            className={`w-full rounded-lg px-3 py-2 text-left text-[14px] font-medium transition ${
              isActive
                ? "bg-[var(--track-accent-strong)] text-white"
                : "text-[var(--track-overlay-text-muted)] hover:bg-[var(--track-row-hover)] hover:text-white"
            }`}
            key={shortcut.id}
            onClick={() => {
              onShortcut(shortcut.id, shortcutDate);
              close();
            }}
            type="button"
          >
            {t(shortcut.label)}
          </button>
        );
      })}
    </>
  );
}

function resolveTimeEntryProjectId(entry: {
  project_id?: number | null;
  pid?: number | null;
}): number | null {
  const projectId = resolveCanonicalTimeEntryProjectId(entry);
  if (projectId == null || projectId <= 0) {
    return null;
  }
  return projectId;
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

  const projects = useMemo(
    () =>
      projectOptions
        .filter((p) => p.id != null && p.active !== false)
        .map((p) => ({
          clientName: p.client_name ?? undefined,
          color: resolveProjectColorValue(p),
          id: p.id as number,
          name: p.name ?? "Untitled project",
          pinned: p.pinned === true,
        }))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned)),
    [projectOptions],
  );

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
