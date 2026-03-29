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
import { KeyboardShortcutsDialog } from "../../features/tracking/KeyboardShortcutsDialog.tsx";
import { ProjectPickerDropdown } from "../../features/tracking/bulk-edit-pickers.tsx";
import { ManualModeComposer } from "../../features/tracking/ManualModeComposer.tsx";
import { SplitTimeEntryDialog } from "../../features/tracking/SplitTimeEntryDialog.tsx";
import { TimeEntryEditorDialog } from "../../features/tracking/TimeEntryEditorDialog.tsx";
import { TimerComposerSuggestionsDialog } from "../../features/tracking/TimerComposerSuggestionsDialog.tsx";
import { WeekRangePicker } from "../../features/tracking/WeekRangePicker.tsx";
import { formatTrackQueryDate, getWeekDaysForDate } from "../../features/tracking/week-range.ts";
import {
  PanelRightIcon,
  PlayIcon,
  ProjectsIcon,
  SettingsIcon,
  StopIcon,
  TagsIcon,
} from "../../shared/ui/icons.tsx";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  useDeleteFavoriteMutation,
  useFavoritesQuery,
  useGoalsQuery,
} from "../../shared/query/web-shell.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { formatClockDuration } from "../../features/tracking/overview-data.ts";
import { useTimerPageOrchestration } from "./useTimerPageOrchestration.ts";

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(() =>
    readDisplaySettings(),
  );
  const [deleteToast, setDeleteToast] = useState<DeletedEntrySnapshot | null>(null);
  const deleteToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timesheetAddRowOpen, setTimesheetAddRowOpen] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const { durationFormat } = useUserPreferences();
  const orch = useTimerPageOrchestration({ initialDate, showAllEntries });
  const favoritesQuery = useFavoritesQuery(orch.workspaceId);
  const deleteFavoriteMutation = useDeleteFavoriteMutation(orch.workspaceId);
  const favorites = Array.isArray(favoritesQuery.data) ? favoritesQuery.data : [];
  const goalsQuery = useGoalsQuery(orch.workspaceId, true);
  const goals = Array.isArray(goalsQuery.data) ? goalsQuery.data : [];

  // Auto-start timer from URL params (e.g. /timer?description=foo&billable=true
  // or /timer/start?desc=foo). Fires once when start params are present and the
  // current-timer query has resolved (so we know whether a timer is already running).
  const startParamsConsumedRef = useRef(false);
  const currentEntryLoaded = !orch.currentTimeEntryQuery.isPending;
  useEffect(() => {
    if (!startParams || startParamsConsumedRef.current || !currentEntryLoaded) return;
    startParamsConsumedRef.current = true;

    void orch.handleStartFromUrl(startParams).then(() => {
      // Strip start params from URL without triggering navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("description");
      url.searchParams.delete("desc");
      url.searchParams.delete("project_id");
      url.searchParams.delete("tag_ids");
      url.searchParams.delete("billable");
      url.searchParams.delete("wid");
      window.history.replaceState(window.history.state, "", url.toString());
    });
  }, [startParams, currentEntryLoaded, orch]);

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
    void orch.createTimeEntryMutation.mutateAsync({
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
  }, [deleteToast, orch.createTimeEntryMutation]);

  useEffect(() => {
    return () => {
      if (deleteToastTimerRef.current) {
        clearTimeout(deleteToastTimerRef.current);
      }
    };
  }, []);

  const handleTimesheetAddRow = useCallback(
    (projectId: number | null) => {
      setTimesheetAddRowOpen(false);
      if (orch.weekDays.length === 0) return;
      const firstDay = orch.weekDays[0];
      const start = new Date(firstDay);
      start.setHours(9, 0, 0, 0);
      const stop = new Date(start);
      stop.setSeconds(stop.getSeconds() + 1);
      void orch.createTimeEntryMutation.mutateAsync({
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
    [orch.weekDays, orch.createTimeEntryMutation],
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
        orch.timerDescriptionInputRef.current?.focus();
        return;
      }

      if (event.key === "s" && orch.runningEntry?.id != null) {
        event.preventDefault();
        void orch.handleTimerAction();
      }
    },
    [orch.runningEntry, orch.handleTimerAction, orch.timerDescriptionInputRef],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [handleGlobalKeyDown]);

  // On mount, scroll the window so the current time indicator is centered
  // in the visible area below the sticky headers. Matches Toggl's behavior:
  // scrollY = indicatorPageY - stickyHeadersHeight - availableHeight / 2
  const hasScrolledToNow = useRef(false);
  useEffect(() => {
    if (hasScrolledToNow.current || orch.view !== "calendar") return;
    if (orch.timeEntriesQuery.isPending) return;

    // Wait one frame for the calendar to render
    requestAnimationFrame(() => {
      const indicator = document.querySelector(".rbc-current-time-indicator");
      if (!indicator) return;

      const indicatorRect = indicator.getBoundingClientRect();
      const indicatorPageY = indicatorRect.top + window.scrollY;

      // Sum all sticky header heights
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
  }, [orch.view, orch.timeEntriesQuery.isPending]);

  return (
    <div
      className="relative min-h-screen bg-[var(--track-surface)] text-white"
      data-testid="tracking-timer-page"
    >
      {/* Timer header bar — sticky at viewport top. The calendar day headers
          (.rbc-time-header) use a CSS variable --timer-header-height to position
          themselves just below this header. */}
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
              ref={orch.timerDescriptionInputRef as unknown as React.LegacyRef<HTMLInputElement>}
              onBlur={() => {
                void orch.handleRunningDescriptionCommit();
              }}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                if (orch.runningEntry?.id != null) {
                  orch.setRunningDescription(event.target.value);
                  return;
                }
                orch.setDraftDescription(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || orch.runningEntry?.id == null) {
                  return;
                }
                event.preventDefault();
                event.currentTarget.blur();
              }}
              onFocus={orch.handleIdleDescriptionFocus}
              placeholder="What are you working on?"
              value={orch.timerDescriptionValue}
            />
          </div>
          <TimerBarProjectPicker
            draftProjectId={orch.draftProjectId}
            onProjectSelect={(projectId) => {
              if (orch.runningEntry?.id != null) {
                const wid = orch.runningEntry.workspace_id ?? orch.runningEntry.wid;
                if (typeof wid === "number") {
                  void orch.updateTimeEntryMutation.mutateAsync({
                    request: { projectId },
                    timeEntryId: orch.runningEntry.id,
                    workspaceId: wid,
                  });
                }
              } else {
                orch.setDraftProjectId(projectId);
              }
            }}
            projectOptions={orch.projectOptions}
            runningEntry={orch.runningEntry}
            workspaceName={
              orch.session.availableWorkspaces.find((w) => w.id === orch.workspaceId)?.name ??
              "Workspace"
            }
          />
          <TimerBarTagPicker
            draftTagIds={orch.draftTagIds}
            onCreateTag={async (name) => {
              await orch.createTagMutation.mutateAsync(name);
            }}
            onTagToggle={(tagId) => {
              if (orch.runningEntry?.id != null) {
                const wid = orch.runningEntry.workspace_id ?? orch.runningEntry.wid;
                const currentTags = orch.runningEntry.tag_ids ?? [];
                const nextTags = currentTags.includes(tagId)
                  ? currentTags.filter((id) => id !== tagId)
                  : [...currentTags, tagId];
                if (typeof wid === "number") {
                  void orch.updateTimeEntryMutation.mutateAsync({
                    request: { tagIds: nextTags },
                    timeEntryId: orch.runningEntry.id,
                    workspaceId: wid,
                  });
                }
              } else {
                orch.setDraftTagIds(
                  orch.draftTagIds.includes(tagId)
                    ? orch.draftTagIds.filter((id) => id !== tagId)
                    : [...orch.draftTagIds, tagId],
                );
              }
            }}
            runningEntry={orch.runningEntry}
            tagOptions={orch.tagOptions}
          />
          <button
            aria-label={orch.draftBillable ? "Set as non-billable" : "Set as billable"}
            className={`flex size-9 items-center justify-center rounded-md transition hover:bg-[var(--track-row-hover)] ${
              (orch.runningEntry?.id != null ? orch.runningEntry.billable : orch.draftBillable)
                ? "text-[var(--track-accent)]"
                : "text-[var(--track-text-muted)] hover:text-white"
            }`}
            onClick={() => {
              if (orch.runningEntry?.id != null) {
                const wid = orch.runningEntry.workspace_id ?? orch.runningEntry.wid;
                if (typeof wid === "number") {
                  void orch.updateTimeEntryMutation.mutateAsync({
                    request: { billable: !orch.runningEntry.billable },
                    timeEntryId: orch.runningEntry.id,
                    workspaceId: wid,
                  });
                }
              } else {
                orch.setDraftBillable(!orch.draftBillable);
              }
            }}
            type="button"
          >
            <span className="text-[16px] font-semibold">$</span>
          </button>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {orch.timerInputMode === "manual" && orch.runningEntry == null ? (
              <ManualModeComposer
                onAddTimeEntry={(start, stop) => {
                  const durationSec = Math.round((stop.getTime() - start.getTime()) / 1000);
                  void orch.createTimeEntryMutation.mutateAsync({
                    billable: orch.draftBillable,
                    description: orch.timerDescriptionValue.trim(),
                    duration: durationSec,
                    projectId: orch.draftProjectId ?? null,
                    start: start.toISOString(),
                    stop: stop.toISOString(),
                    tagIds: orch.draftTagIds ?? [],
                    taskId: null,
                  });
                }}
                timezone={orch.timezone}
              />
            ) : (
              <>
                <span
                  className="text-[29px] font-medium tabular-nums text-white"
                  data-testid="timer-elapsed"
                >
                  {orch.runningDurationSeconds > 0
                    ? formatClockDuration(orch.runningDurationSeconds, durationFormat)
                    : "0:00:00"}
                </span>
                <button
                  aria-label={orch.runningEntry ? "Stop timer" : "Start timer"}
                  className="flex size-[42px] items-center justify-center rounded-full bg-[var(--track-accent)] text-white shadow-[inset_0_0_0_1px_var(--track-border-soft)]"
                  data-icon={orch.runningEntry ? "stop" : "play"}
                  data-testid="timer-action-button"
                  disabled={orch.timerMutationPending}
                  onClick={() => {
                    void orch.handleTimerAction();
                  }}
                  type="button"
                >
                  {orch.runningEntry ? (
                    <StopIcon className="size-5" />
                  ) : (
                    <PlayIcon className="size-5" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="px-5 pb-4 pt-4">
          <div className="flex items-center gap-4">
            <WeekRangePicker
              mode={
                orch.view === "list"
                  ? orch.listDateRange == null
                    ? "all-dates"
                    : "week"
                  : orch.calendarSubview === "day"
                    ? "day"
                    : "week"
              }
              onAllDatesSelect={() => {
                orch.setListDateRange(null);
                if (orch.view !== "list") orch.setView("list");
              }}
              onDayShortcutSelect={(date) => {
                if (orch.view === "list") {
                  const dayStr = formatTrackQueryDate(date);
                  orch.setListDateRange({ startDate: dayStr, endDate: dayStr });
                } else {
                  orch.setCalendarSubview("day");
                }
                orch.setSelectedWeekDate(date);
              }}
              onLast30DaysSelect={(date) => {
                if (orch.view === "list") {
                  const todayStr = formatTrackQueryDate(new Date());
                  orch.setListDateRange({
                    startDate: formatTrackQueryDate(date),
                    endDate: todayStr,
                  });
                } else {
                  orch.setCalendarSubview("week");
                }
                orch.setSelectedWeekDate(date);
              }}
              onWeekShortcutSelect={(date) => {
                if (orch.view === "list") {
                  const days = getWeekDaysForDate(date, orch.beginningOfWeek);
                  orch.setListDateRange({
                    startDate: formatTrackQueryDate(days[0]),
                    endDate: formatTrackQueryDate(days[6]),
                  });
                } else {
                  orch.setCalendarSubview("week");
                }
                orch.setSelectedWeekDate(date);
              }}
              onSelectDate={(date) => {
                if (orch.view === "list") {
                  const days = getWeekDaysForDate(date, orch.beginningOfWeek);
                  orch.setListDateRange({
                    startDate: formatTrackQueryDate(days[0]),
                    endDate: formatTrackQueryDate(days[6]),
                  });
                }
                orch.setSelectedWeekDate(date);
              }}
              selectedDate={orch.selectedWeekDate}
              weekStartsOn={orch.beginningOfWeek}
            />
            {orch.view === "list" ? (
              <SummaryStat
                label="Today total"
                value={
                  orch.todayTotalSeconds > 0
                    ? formatClockDuration(orch.todayTotalSeconds, durationFormat)
                    : "0:00:00"
                }
              />
            ) : null}
            <SummaryStat
              label="Week total"
              value={formatClockDuration(orch.weekTotalSeconds, durationFormat)}
            />
            <div className="ml-auto flex items-center gap-3">
              {orch.view === "calendar" ? (
                <CalendarSubviewSelect
                  onChange={(next) => {
                    orch.setCalendarSubview(next);
                    if (next === "day" && orch.calendarSubview !== "day") {
                      // When switching to day view, default to today
                      orch.setSelectedWeekDate(new Date());
                    }
                  }}
                  value={orch.calendarSubview}
                />
              ) : null}
              <ViewTabGroup
                aria-label="Timer view"
                label="Timer view"
                onSelect={orch.setView}
                options={["calendar", "list", "timesheet"]}
                value={orch.view}
              >
                <ViewTab currentView={orch.view} onSelect={orch.setView} targetView="calendar" />
                <ViewTab currentView={orch.view} onSelect={orch.setView} targetView="list" />
                <ViewTab currentView={orch.view} onSelect={orch.setView} targetView="timesheet" />
              </ViewTabGroup>
              <div className="relative">
                <ChromeIconButton
                  active={settingsOpen}
                  aria-label="Display settings"
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
                aria-label="Toggle goals and favorites"
                icon={<PanelRightIcon className="size-4" />}
                onClick={() => setSidebarOpen((prev) => !prev)}
              />
            </div>
          </div>
          {orch.trackStrip.length > 0 ? <ProjectFilterStrip items={orch.trackStrip} /> : null}
        </div>
      </header>
      {/* Content area + optional right sidebar */}
      <div className="flex min-h-0">
        <div className="min-w-0 flex-1">
          {orch.timeEntriesQuery.isPending ? (
            <SurfaceMessage message="Loading time entries..." />
          ) : null}
          {orch.timeEntriesQuery.isError ? (
            <SurfaceMessage message={orch.timerErrorMessage} tone="error" />
          ) : null}
          {!orch.timeEntriesQuery.isPending &&
          !orch.timeEntriesQuery.isError &&
          orch.view === "list" ? (
            <ListView
              groups={orch.groupedEntries}
              hasMore={orch.hasMoreEntries}
              isLoadingMore={orch.isLoadingMoreEntries}
              nowMs={orch.nowMs}
              onLoadMore={orch.loadMoreEntries}
              onBulkDelete={(ids) => {
                void orch.handleBulkDelete(ids);
              }}
              onBulkEdit={(ids, updates) => {
                void orch.handleBulkEdit(ids, updates);
              }}
              onContinueEntry={(entry) => {
                void orch.handleContinueEntry(entry);
              }}
              onDeleteEntry={(entry) => {
                const wid = entry.workspace_id ?? entry.wid;
                if (typeof entry.id === "number" && typeof wid === "number") {
                  const snapshot = snapshotEntryForUndo(entry);
                  void orch.deleteTimeEntryMutation
                    .mutateAsync({
                      timeEntryId: entry.id,
                      workspaceId: wid,
                    })
                    .then(() => {
                      if (snapshot) showDeleteToast(snapshot);
                    });
                }
              }}
              onDuplicateEntry={(entry) => {
                if (entry.start && entry.stop) {
                  const durationSec = Math.round(
                    (new Date(entry.stop).getTime() - new Date(entry.start).getTime()) / 1000,
                  );
                  void orch.createTimeEntryMutation.mutateAsync({
                    billable: entry.billable,
                    description: (entry.description ?? "").trim(),
                    duration: durationSec,
                    projectId: entry.project_id ?? entry.pid ?? null,
                    start: entry.start,
                    stop: entry.stop,
                    tagIds: entry.tag_ids ?? [],
                    taskId: entry.task_id ?? entry.tid ?? null,
                  });
                }
              }}
              onDescriptionChange={(entry, description) => {
                const wid = entry.workspace_id ?? entry.wid;
                if (typeof entry.id === "number" && typeof wid === "number") {
                  void orch.updateTimeEntryMutation.mutateAsync({
                    request: { description },
                    timeEntryId: entry.id,
                    workspaceId: wid,
                  });
                }
              }}
              onEditEntry={orch.handleEntryEdit}
              onFavoriteEntry={() => {
                // Pin as favorite is handled through the editor dialog
              }}
              onTagsChange={(entry, tagIds) => {
                const wid = entry.workspace_id ?? entry.wid;
                if (typeof entry.id === "number" && typeof wid === "number") {
                  void orch.updateTimeEntryMutation.mutateAsync({
                    request: { tagIds },
                    timeEntryId: entry.id,
                    workspaceId: wid,
                  });
                }
              }}
              onBillableToggle={(entry) => {
                const wid = entry.workspace_id ?? entry.wid;
                if (typeof entry.id === "number" && typeof wid === "number") {
                  void orch.updateTimeEntryMutation.mutateAsync({
                    request: { billable: !entry.billable },
                    timeEntryId: entry.id,
                    workspaceId: wid,
                  });
                }
              }}
              onSplitEntry={(entry) => {
                if (entry.start && entry.stop) {
                  orch.handleEntryEdit(entry, new DOMRect(0, 0, 0, 0));
                  setSplitDialogOpen(true);
                }
              }}
              onProjectChange={(entry, projectId) => {
                const wid = entry.workspace_id ?? entry.wid;
                if (typeof entry.id === "number" && typeof wid === "number") {
                  void orch.updateTimeEntryMutation.mutateAsync({
                    request: { projectId },
                    timeEntryId: entry.id,
                    workspaceId: wid,
                  });
                }
              }}
              projects={orch.projectOptions
                .filter((project) => project.id != null)
                .map((project) => ({
                  clientName: project.client_name ?? undefined,
                  color: resolveProjectColorValue(project),
                  id: project.id as number,
                  name: project.name ?? "Untitled project",
                }))}
              tags={orch.tagOptions}
              timezone={orch.timezone}
              workspaceName={
                orch.session.availableWorkspaces.find((w) => w.id === orch.workspaceId)?.name ??
                "Workspace"
              }
            />
          ) : null}
          {!orch.timeEntriesQuery.isPending &&
          !orch.timeEntriesQuery.isError &&
          orch.view === "calendar" ? (
            <CalendarView
              calendarHours={displaySettings.calendarHours}
              draftEntry={orch.calendarDraftEntry}
              entries={orch.visibleEntries}
              isEntryFavorited={(entry) => isEntryAlreadyFavorited(entry, favorites)}
              nowMs={orch.nowMs}
              onContinueEntry={(entry) => {
                void orch.handleContinueEntry(entry);
              }}
              onContextMenuAction={(entry, action) => {
                if (action === "split" && entry.start && entry.stop) {
                  orch.handleEntryEdit(entry, new DOMRect(0, 0, 0, 0));
                  setSplitDialogOpen(true);
                  return;
                }
                handleCalendarContextMenuAction(entry, action, orch, showDeleteToast, favorites);
              }}
              onEditEntry={orch.handleEntryEdit}
              onMoveEntry={(entryId, minutesDelta) => {
                void orch.handleCalendarEntryMove(entryId, minutesDelta);
              }}
              onResizeEntry={(entryId, edge, minutesDelta) => {
                void orch.handleCalendarEntryResize(entryId, edge, minutesDelta);
              }}
              onSelectSlot={(slot) => {
                orch.handleCalendarSlotCreate(slot);
              }}
              onStartEntry={() => {
                void orch.handleTimerAction();
              }}
              onZoomIn={() => orch.setCalendarZoom(orch.calendarZoom + 1)}
              onZoomOut={() => orch.setCalendarZoom(orch.calendarZoom - 1)}
              runningEntry={orch.runningEntry}
              subview={orch.calendarSubview}
              timezone={orch.timezone}
              weekDays={orch.weekDays}
              weekStartsOn={orch.beginningOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6}
              zoom={orch.calendarZoom}
            />
          ) : null}
          {!orch.timeEntriesQuery.isPending &&
          !orch.timeEntriesQuery.isError &&
          orch.view === "timesheet" ? (
            <div className="relative min-h-screen">
              <TimesheetView
                onAddRow={() => setTimesheetAddRowOpen((prev) => !prev)}
                onCellEdit={(projectLabel, dayIndex, durationSeconds) => {
                  void orch.handleTimesheetCellEdit(projectLabel, dayIndex, durationSeconds);
                }}
                onCopyLastWeek={() => {
                  void orch.handleCopyLastWeek();
                }}
                rows={orch.timesheetRows}
                timezone={orch.timezone}
                weekDays={orch.weekDays}
              />
              {timesheetAddRowOpen ? (
                <TimesheetAddRowPicker
                  onClose={() => setTimesheetAddRowOpen(false)}
                  onSelect={handleTimesheetAddRow}
                  projectOptions={orch.projectOptions}
                  workspaceName={
                    orch.session.availableWorkspaces.find((w) => w.id === orch.workspaceId)?.name ??
                    "Workspace"
                  }
                />
              ) : null}
            </div>
          ) : null}
          {/* Editor dialog — positioned absolutely inside the page container.
              Anchor coordinates are page-relative so the editor scrolls with
              window scroll natively, no JS compensation needed. */}
          {orch.selectedEntry && orch.selectedEntryAnchor ? (
            <TimeEntryEditorDialog
              anchor={orch.selectedEntryAnchor}
              currentWorkspaceId={orch.selectedEntryWorkspaceId}
              description={orch.selectedDescription}
              entry={orch.selectedEntry}
              isCreatingProject={orch.createProjectMutation.isPending}
              isCreatingTag={orch.createTagMutation.isPending}
              isDeleting={orch.deleteTimeEntryMutation.isPending}
              isDirty={orch.selectedEntryDirty}
              isNewEntry={orch.isNewEntry}
              isPrimaryActionPending={orch.timerMutationPending}
              isSaving={
                orch.isNewEntry
                  ? orch.createTimeEntryMutation.isPending
                  : orch.updateTimeEntryMutation.isPending
              }
              onClose={orch.closeSelectedEntryEditor}
              onCreateProject={orch.handleSelectedEntryProjectCreate}
              onCreateTag={orch.handleSelectedEntryTagCreate}
              onBillableToggle={orch.handleSelectedEntryBillableToggle}
              onDuplicate={
                orch.isNewEntry
                  ? undefined
                  : () => {
                      void orch.handleSelectedEntryDuplicate();
                    }
              }
              onDelete={
                orch.isNewEntry
                  ? undefined
                  : () => {
                      const snapshot = orch.selectedEntry
                        ? snapshotEntryForUndo(orch.selectedEntry)
                        : null;
                      void orch
                        .handleSelectedEntryDelete()
                        .then(() => {
                          if (snapshot) showDeleteToast(snapshot);
                        })
                        .catch(() => {
                          // Error is already displayed in the editor via selectedEntryError
                        });
                    }
              }
              onDescriptionChange={orch.setSelectedDescription}
              onFavorite={
                orch.isNewEntry ||
                isEntryAlreadyFavorited(
                  {
                    description: orch.selectedDescription,
                    project_id: orch.selectedProjectId,
                    tag_ids: orch.selectedTagIds,
                  },
                  favorites,
                )
                  ? undefined
                  : () => {
                      void orch.handleSelectedEntryFavorite();
                    }
              }
              onPrimaryAction={
                orch.isNewEntry
                  ? undefined
                  : () => {
                      void orch.handleSelectedEntryPrimaryAction();
                    }
              }
              onProjectSelect={orch.setSelectedProjectId}
              onSave={() => {
                void orch.handleSelectedEntrySave();
              }}
              onSplit={
                orch.isNewEntry
                  ? undefined
                  : () => {
                      setSplitDialogOpen(true);
                    }
              }
              onStartTimeChange={orch.handleSelectedEntryStartTimeChange}
              onStopTimeChange={orch.handleSelectedEntryStopTimeChange}
              onSuggestionEntrySelect={orch.handleSelectedEntrySuggestionSelect}
              onTagToggle={(tagId) => {
                orch.setSelectedTagIds((current) =>
                  current.includes(tagId)
                    ? current.filter((id) => id !== tagId)
                    : [...current, tagId],
                );
              }}
              onWorkspaceSelect={(nextWorkspaceId) => {
                orch.switchWorkspace(nextWorkspaceId);
                orch.closeSelectedEntryEditor();
              }}
              primaryActionIcon={
                orch.selectedEntry.stop == null || (orch.selectedEntry.duration ?? 0) < 0
                  ? "stop"
                  : "play"
              }
              primaryActionLabel={
                orch.selectedEntry.stop == null || (orch.selectedEntry.duration ?? 0) < 0
                  ? "Stop timer"
                  : "Continue Time Entry"
              }
              projects={orch.projectOptions
                .filter((project) => project.id != null)
                .map((project) => ({
                  clientName: project.client_name ?? undefined,
                  color: resolveProjectColorValue(project),
                  id: project.id as number,
                  name: project.name ?? "Untitled project",
                }))}
              recentEntries={orch.recentWorkspaceEntries}
              saveError={orch.selectedEntryError}
              selectedProjectId={orch.selectedProjectId}
              selectedTagIds={orch.selectedTagIds}
              tags={orch.tagOptions}
              timezone={orch.timezone}
              workspaces={orch.session.availableWorkspaces.map((workspace) => ({
                id: workspace.id,
                isCurrent: workspace.isCurrent,
                name: workspace.name,
              }))}
            />
          ) : null}
        </div>
        {sidebarOpen ? (
          <GoalsFavoritesSidebar
            favorites={favorites}
            goals={goals}
            onDeleteFavorite={(favoriteId) => {
              void deleteFavoriteMutation.mutateAsync(favoriteId);
            }}
            onStartFavorite={(fav) => {
              void orch.handleContinueEntry({
                billable: fav.billable,
                description: fav.description,
                project_id: fav.project_id,
                tag_ids: fav.tag_ids,
                task_id: fav.task_id,
              } as Parameters<typeof orch.handleContinueEntry>[0]);
            }}
          />
        ) : null}
      </div>
      {shortcutsOpen ? <KeyboardShortcutsDialog onClose={() => setShortcutsOpen(false)} /> : null}
      {orch.composerSuggestionsAnchor ? (
        <TimerComposerSuggestionsDialog
          anchor={orch.composerSuggestionsAnchor}
          currentWorkspaceId={orch.workspaceId}
          favorites={favorites}
          onClose={orch.closeComposerSuggestions}
          onFavoriteSelect={(fav) => {
            orch.setDraftDescription(fav.description ?? "");
            orch.setDraftProjectId(fav.project_id ?? null);
            orch.setDraftTagIds(fav.tag_ids ?? []);
            orch.setDraftBillable(fav.billable ?? false);
            orch.closeComposerSuggestions();
          }}
          query={orch.timerDescriptionValue}
          onProjectSelect={(projectId) => {
            orch.setDraftProjectId(projectId);
            orch.closeComposerSuggestions();
          }}
          onTimeEntrySelect={(entry) => {
            orch.setDraftDescription(entry.description ?? "");
            orch.setDraftProjectId(resolveTimeEntryProjectId(entry));
            orch.setDraftTagIds(entry.tag_ids ?? []);
            orch.closeComposerSuggestions();
          }}
          onWorkspaceSelect={(nextWorkspaceId) => {
            orch.switchWorkspace(nextWorkspaceId);
            orch.closeComposerSuggestions();
          }}
          projects={orch.projectOptions}
          timeEntries={orch.recentWorkspaceEntries}
          workspaces={orch.session.availableWorkspaces.map((workspace) => ({
            id: workspace.id,
            isCurrent: workspace.isCurrent,
            name: workspace.name,
          }))}
        />
      ) : null}
      {splitDialogOpen && orch.selectedEntry?.start && orch.selectedEntry?.stop ? (
        <SplitTimeEntryDialog
          start={orch.selectedEntry.start}
          stop={orch.selectedEntry.stop}
          onCancel={() => setSplitDialogOpen(false)}
          onConfirm={(splitAtMs) => {
            setSplitDialogOpen(false);
            void orch.handleSelectedEntrySplit(splitAtMs);
          }}
        />
      ) : null}
      {deleteToast ? (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-lg border border-[var(--track-border)] bg-[var(--track-surface)] px-5 py-3 shadow-[0_10px_30px_var(--track-shadow-banner)]">
          <span className="text-[14px] text-white">Time entry deleted</span>
          <button
            className="text-[14px] font-semibold text-[var(--track-accent)] transition hover:text-[var(--track-accent-text)]"
            onClick={handleUndoDelete}
            type="button"
          >
            Undo
          </button>
        </div>
      ) : null}
    </div>
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
    projectId: entry.project_id ?? entry.pid ?? null,
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
  const projectId = entry.project_id ?? entry.pid ?? null;
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
  orch: ReturnType<typeof useTimerPageOrchestration>,
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
        void orch.createTimeEntryMutation.mutateAsync({
          billable: entry.billable,
          description: (entry.description ?? "").trim(),
          duration: durationSec,
          projectId: entry.project_id ?? entry.pid ?? null,
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
        void orch.deleteTimeEntryMutation
          .mutateAsync({ timeEntryId: entry.id, workspaceId: wid })
          .then(() => {
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
      if (entry.project_id ?? entry.pid) {
        params.set("project_id", String(entry.project_id ?? entry.pid));
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
      void orch.createWorkspaceFavoriteMutation.mutateAsync({
        billable: entry.billable,
        description: (entry.description ?? "").trim(),
        projectId: entry.project_id ?? entry.pid ?? null,
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
  }[];
  runningEntry: {
    id?: number | null;
    project_id?: number | null;
    pid?: number | null;
  } | null;
  workspaceName: string;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
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
        })),
    [projectOptions],
  );

  const filteredProjects = useMemo(
    () =>
      search.trim()
        ? projects.filter(
            (p) =>
              p.name.toLowerCase().includes(search.toLowerCase()) ||
              (p.clientName ?? "").toLowerCase().includes(search.toLowerCase()),
          )
        : projects,
    [projects, search],
  );

  // When a running entry exists, display its project; otherwise use draft project
  const displayProjectId =
    runningEntry?.id != null
      ? (runningEntry.project_id ?? runningEntry.pid ?? null)
      : draftProjectId;
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
            className="min-w-0 truncate text-[13px] font-medium"
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
            filteredProjects={filteredProjects}
            onSearch={setSearch}
            onSelect={(projectId) => {
              setOpen(false);
              onProjectSelect(projectId);
            }}
            search={search}
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

  // When a running entry exists, display its tags; otherwise use draft tags
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
          <span className="min-w-0 truncate text-[13px] font-medium">{tagLabel}</span>
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
              className="h-8 w-full rounded-lg border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-2.5 text-[13px] text-white outline-none placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent)]"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tags"
              type="text"
              value={search}
            />
          </div>
          {filteredTags.length === 0 && !search.trim() ? (
            <div className="px-3 py-2 text-[13px] text-[var(--track-text-soft)]">
              No tags available
            </div>
          ) : filteredTags.length > 0 ? (
            <div className="max-h-[200px] overflow-y-auto">
              {filteredTags.map((tag) => {
                const isSelected = draftTagIds.includes(tag.id);
                return (
                  <button
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition hover:bg-white/5 ${
                      isSelected ? "text-[var(--track-accent)]" : "text-white"
                    }`}
                    key={tag.id}
                    onClick={() => onTagToggle(tag.id)}
                    type="button"
                  >
                    <span
                      className={`flex size-4 items-center justify-center rounded border text-[10px] ${
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
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[var(--track-accent)] transition hover:bg-white/5 disabled:opacity-60"
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

/**
 * Horizontal project filter strip with proportional-width colored bars.
 * Each segment is sized by its share of total tracked seconds.
 */
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
              className="truncate px-1.5 text-[10px] font-medium uppercase tracking-wide"
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

function resolveTimeEntryProjectId(entry: {
  project_id?: number | null;
  pid?: number | null;
}): number | null {
  const projectId = entry.project_id ?? entry.pid ?? null;
  if (projectId == null || projectId <= 0) {
    return null;
  }
  return projectId;
}

/**
 * Self-contained project picker for the timesheet "Add row" button.
 * Manages its own search state and filters projects accordingly.
 */
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
  }[];
  workspaceName: string;
}): ReactElement {
  const [search, setSearch] = useState("");
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
        })),
    [projectOptions],
  );

  const filteredProjects = useMemo(
    () =>
      search.trim()
        ? projects.filter(
            (p) =>
              p.name.toLowerCase().includes(search.toLowerCase()) ||
              (p.clientName ?? "").toLowerCase().includes(search.toLowerCase()),
          )
        : projects,
    [projects, search],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

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
        filteredProjects={filteredProjects}
        onSearch={setSearch}
        onSelect={onSelect}
        search={search}
        workspaceName={workspaceName}
      />
    </div>
  );
}
