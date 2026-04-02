import * as React from "react";
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
import { SplitTimeEntryDialog } from "../../features/tracking/SplitTimeEntryDialog.tsx";
import { TimeEntryEditorDialog } from "../../features/tracking/TimeEntryEditorDialog.tsx";
import { TimerComposerSuggestionsDialog } from "../../features/tracking/TimerComposerSuggestionsDialog.tsx";
import { TimerElapsedDisplay } from "../../features/tracking/TimerElapsedDisplay.tsx";
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
import {
  useDeleteFavoriteMutation,
  useFavoritesQuery,
  useGoalsQuery,
} from "../../shared/query/web-shell.ts";
import { formatClockDuration } from "../../features/tracking/overview-data.ts";
import { TimerPageProviders } from "../../features/tracking/contexts/TimerPageProviders.tsx";
import { useWorkspaceContext } from "../../features/tracking/contexts/WorkspaceContext.tsx";
import { useViewStateContext } from "../../features/tracking/contexts/ViewStateContext.tsx";
import { useTimeEntriesContext } from "../../features/tracking/contexts/TimeEntriesContext.tsx";
import { useRunningTimerContext } from "../../features/tracking/contexts/RunningTimerContext.tsx";
import { useTimerInputContext } from "../../features/tracking/contexts/TimerInputContext.tsx";
import { useSelectedEntryContext } from "../../features/tracking/contexts/SelectedEntryContext.tsx";

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
  const [showAllEntries, setShowAllEntries] = useState(false);

  return (
    <TimerPageProviders initialDate={initialDate} showAllEntries={showAllEntries}>
      <WorkspaceTimerPageShell
        startParams={startParams}
        showAllEntries={showAllEntries}
        setShowAllEntries={setShowAllEntries}
      />
    </TimerPageProviders>
  );
}

/**
 * Thin shell that holds cross-cutting local state (deleteToast, splitDialog,
 * displaySettings, sidebar, shortcuts) and composes the isolated sub-components.
 * This component subscribes to NO context — it only passes down callbacks.
 */
function WorkspaceTimerPageShell({
  startParams,
  showAllEntries,
  setShowAllEntries,
}: {
  startParams?: StartParams;
  showAllEntries: boolean;
  setShowAllEntries: (fn: boolean | ((prev: boolean) => boolean)) => void;
}): ReactElement {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(() =>
    readDisplaySettings(),
  );
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [deleteToast, setDeleteToast] = useState<DeletedEntrySnapshot | null>(null);
  const deleteToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showDeleteToast = useCallback((snapshot: DeletedEntrySnapshot) => {
    if (deleteToastTimerRef.current) clearTimeout(deleteToastTimerRef.current);
    setDeleteToast(snapshot);
    deleteToastTimerRef.current = setTimeout(() => {
      setDeleteToast(null);
      deleteToastTimerRef.current = null;
    }, 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (deleteToastTimerRef.current) clearTimeout(deleteToastTimerRef.current);
    };
  }, []);

  return (
    <div
      className="relative min-h-screen bg-[var(--track-surface)] text-white"
      data-testid="tracking-timer-page"
    >
      <PageHeader
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        showAllEntries={showAllEntries}
        setShowAllEntries={setShowAllEntries}
        setDisplaySettings={setDisplaySettings}
      />
      <div className="flex min-h-0">
        <div className="min-w-0 flex-1">
          <TimerContentBridge
            displaySettings={displaySettings}
            showDeleteToast={showDeleteToast}
            setSplitDialogOpen={setSplitDialogOpen}
          />
          <EntryEditorSection
            showDeleteToast={showDeleteToast}
            setSplitDialogOpen={setSplitDialogOpen}
          />
        </div>
        <SidebarSection sidebarOpen={sidebarOpen} />
      </div>
      <AutoStartEffect startParams={startParams} />
      <GlobalKeyboardShortcuts setShortcutsOpen={setShortcutsOpen} />
      {shortcutsOpen ? <KeyboardShortcutsDialog onClose={() => setShortcutsOpen(false)} /> : null}
      <ComposerSuggestionsSection />
      <SplitDialogSection
        splitDialogOpen={splitDialogOpen}
        setSplitDialogOpen={setSplitDialogOpen}
      />
      <DeleteToast
        deleteToast={deleteToast}
        setDeleteToast={setDeleteToast}
        deleteToastTimerRef={deleteToastTimerRef}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageHeader: subscribes to TimerInput + RunningTimer + Workspace + ViewState + TimeEntries
// This is the <header> with timer bar + secondary controls.
// Typing updates only TimerInput context — but this component also subscribes
// to RunningTimer (for the play/stop state). To fully isolate typing from
// the secondary header, we could split further, but this is already a huge
// improvement since CalendarView/ListView are no longer in this component.
// ---------------------------------------------------------------------------

function PageHeader({
  settingsOpen,
  setSettingsOpen,
  sidebarOpen,
  setSidebarOpen,
  showAllEntries,
  setShowAllEntries,
  setDisplaySettings,
}: {
  settingsOpen: boolean;
  setSettingsOpen: (fn: boolean | ((prev: boolean) => boolean)) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (fn: boolean | ((prev: boolean) => boolean)) => void;
  showAllEntries: boolean;
  setShowAllEntries: (fn: boolean | ((prev: boolean) => boolean)) => void;
  setDisplaySettings: (ds: DisplaySettings) => void;
}): ReactElement {
  const { t } = useTranslation("tracking");
  const workspace = useWorkspaceContext();
  const viewState = useViewStateContext();
  const timeEntries = useTimeEntriesContext();
  const runningTimer = useRunningTimerContext();
  const timerInput = useTimerInputContext();
  const selectedEntry = useSelectedEntryContext();
  const { durationFormat } = workspace;
  const [hideSecondaryHeaderLabels, setHideSecondaryHeaderLabels] = useState(false);
  const headerControlsRef = useRef<HTMLDivElement | null>(null);

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
  }, [
    viewState.view,
    viewState.calendarSubview,
    timeEntries.todayTotalSeconds,
    timeEntries.weekTotalSeconds,
  ]);

  return (
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
              timerInput.timerDescriptionInputRef as unknown as React.LegacyRef<HTMLInputElement>
            }
            onBlur={() => {
              void timerInput.handleRunningDescriptionCommit();
            }}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              if (runningTimer.runningEntry?.id != null) {
                timerInput.setRunningDescription(event.target.value);
                return;
              }
              timerInput.setDraftDescription(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || runningTimer.runningEntry?.id == null) return;
              event.preventDefault();
              event.currentTarget.blur();
            }}
            onFocus={timerInput.handleIdleDescriptionFocus}
            placeholder={t("whatAreYouWorkingOn")}
            value={timerInput.timerDescriptionValue}
          />
        </div>
        <TimerBarProjectPicker
          draftProjectId={timerInput.draftProjectId}
          onProjectSelect={(projectId) => {
            if (runningTimer.runningEntry?.id != null) {
              const wid = runningTimer.runningEntry.workspace_id ?? runningTimer.runningEntry.wid;
              if (typeof wid === "number") {
                void workspace.updateTimeEntryMutation.mutateAsync({
                  request: { projectId },
                  timeEntryId: runningTimer.runningEntry.id,
                  workspaceId: wid,
                });
              }
            } else {
              timerInput.setDraftProjectId(projectId);
            }
          }}
          projectOptions={workspace.projectOptions}
          runningEntry={runningTimer.runningEntry}
          workspaceName={
            workspace.session.availableWorkspaces.find((w) => w.id === workspace.workspaceId)
              ?.name ?? "Workspace"
          }
        />
        <TimerBarTagPicker
          draftTagIds={timerInput.draftTagIds}
          onCreateTag={async (name) => {
            await selectedEntry.createTagMutation.mutateAsync(name);
          }}
          onTagToggle={(tagId) => {
            if (runningTimer.runningEntry?.id != null) {
              const wid = runningTimer.runningEntry.workspace_id ?? runningTimer.runningEntry.wid;
              const currentTags = runningTimer.runningEntry.tag_ids ?? [];
              const nextTags = currentTags.includes(tagId)
                ? currentTags.filter((id) => id !== tagId)
                : [...currentTags, tagId];
              if (typeof wid === "number") {
                void workspace.updateTimeEntryMutation.mutateAsync({
                  request: { tagIds: nextTags },
                  timeEntryId: runningTimer.runningEntry.id,
                  workspaceId: wid,
                });
              }
            } else {
              timerInput.setDraftTagIds(
                timerInput.draftTagIds.includes(tagId)
                  ? timerInput.draftTagIds.filter((id) => id !== tagId)
                  : [...timerInput.draftTagIds, tagId],
              );
            }
          }}
          runningEntry={runningTimer.runningEntry}
          tagOptions={workspace.tagOptions}
        />
        <button
          aria-label={timerInput.draftBillable ? "Set as non-billable" : "Set as billable"}
          className={`flex size-9 items-center justify-center rounded-md transition hover:bg-[var(--track-row-hover)] ${
            (
              runningTimer.runningEntry?.id != null
                ? runningTimer.runningEntry.billable
                : timerInput.draftBillable
            )
              ? "text-[var(--track-accent)]"
              : "text-[var(--track-text-muted)] hover:text-white"
          }`}
          onClick={() => {
            if (runningTimer.runningEntry?.id != null) {
              const wid = runningTimer.runningEntry.workspace_id ?? runningTimer.runningEntry.wid;
              if (typeof wid === "number") {
                void workspace.updateTimeEntryMutation.mutateAsync({
                  request: { billable: !runningTimer.runningEntry.billable },
                  timeEntryId: runningTimer.runningEntry.id,
                  workspaceId: wid,
                });
              }
            } else {
              timerInput.setDraftBillable(!timerInput.draftBillable);
            }
          }}
          type="button"
        >
          <span className="text-[14px] font-semibold">$</span>
        </button>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {viewState.timerInputMode === "manual" && runningTimer.runningEntry == null ? (
            <ManualModeComposer
              onAddTimeEntry={(start, stop) => {
                const durationSec = Math.round((stop.getTime() - start.getTime()) / 1000);
                void selectedEntry.createTimeEntryMutation.mutateAsync({
                  billable: timerInput.draftBillable,
                  description: timerInput.timerDescriptionValue.trim(),
                  duration: durationSec,
                  projectId: timerInput.draftProjectId ?? null,
                  start: start.toISOString(),
                  stop: stop.toISOString(),
                  tagIds: timerInput.draftTagIds ?? [],
                  taskId: null,
                });
              }}
              timezone={workspace.timezone}
            />
          ) : (
            <>
              <TimerElapsedDisplay />
              <TimerActionButton
                isRunning={!!runningTimer.runningEntry}
                disabled={runningTimer.timerMutationPending}
                onClick={() => {
                  void timerInput.handleTimerAction();
                }}
              />
            </>
          )}
        </div>
      </div>
      <div className="px-5 pb-4 pt-4">
        <div className="flex items-center gap-4" ref={headerControlsRef}>
          <TimerRangePicker />
          {viewState.view === "list" ? (
            <SummaryStat
              hideLabel={hideSecondaryHeaderLabels}
              label={t("todayTotal")}
              value={
                timeEntries.todayTotalSeconds > 0
                  ? formatClockDuration(timeEntries.todayTotalSeconds, durationFormat)
                  : "0:00:00"
              }
            />
          ) : null}
          <SummaryStat
            hideLabel={hideSecondaryHeaderLabels}
            label={t("weekTotal")}
            value={formatClockDuration(timeEntries.weekTotalSeconds, durationFormat)}
          />
          <div className="ml-auto flex items-center gap-3">
            {viewState.view === "calendar" ? (
              <CalendarSubviewSelect
                onChange={(next) => {
                  viewState.setCalendarSubview(next);
                  if (next === "day" && viewState.calendarSubview !== "day") {
                    viewState.setSelectedWeekDate(new Date());
                  }
                }}
                value={viewState.calendarSubview}
              />
            ) : null}
            <ViewTabGroup
              aria-label={t("timerView")}
              label={t("timerView")}
              onSelect={viewState.setView}
              options={["calendar", "list", "timesheet"]}
              value={viewState.view}
            >
              <ViewTab
                currentView={viewState.view}
                onSelect={viewState.setView}
                targetView="calendar"
              />
              <ViewTab
                currentView={viewState.view}
                onSelect={viewState.setView}
                targetView="list"
              />
              <ViewTab
                currentView={viewState.view}
                onSelect={viewState.setView}
                targetView="timesheet"
              />
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
        {timeEntries.trackStrip.length > 0 ? (
          <ProjectFilterStrip items={timeEntries.trackStrip} />
        ) : null}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// TimerContentArea: subscribes to TimeEntries + ViewState + RunningTimer + Workspace
// Does NOT subscribe to TimerInput or SelectedEntry.
// → Typing in the timer bar will NOT re-render this component.
// → Clicking an entry (which updates SelectedEntry) will NOT re-render this.
// ---------------------------------------------------------------------------

/**
 * Bridge: subscribes to SelectedEntryContext and passes only the values
 * TimerContentArea needs. TimerContentArea is memoized — it only re-renders
 * when its props actually change (shallow comparison).
 * handleEntryEdit / handleCalendarSlotCreate are useCallback-stable in the context.
 * calendarDraftEntry changes only on slot creation (legitimate re-render).
 * createTimeEntryMutation reference is stable per React Query.
 */
function TimerContentBridge({
  displaySettings,
  showDeleteToast,
  setSplitDialogOpen,
}: {
  displaySettings: DisplaySettings;
  showDeleteToast: (snapshot: DeletedEntrySnapshot) => void;
  setSplitDialogOpen: (fn: boolean | ((prev: boolean) => boolean)) => void;
}): ReactElement | null {
  const selectedEntry = useSelectedEntryContext();
  return (
    <TimerContentArea
      displaySettings={displaySettings}
      showDeleteToast={showDeleteToast}
      setSplitDialogOpen={setSplitDialogOpen}
      calendarDraftEntry={selectedEntry.calendarDraftEntry}
      onEditEntry={selectedEntry.handleEntryEdit}
      onCalendarSlotCreate={selectedEntry.handleCalendarSlotCreate}
      createTimeEntryMutation={selectedEntry.createTimeEntryMutation}
      createWorkspaceFavoriteMutation={selectedEntry.createWorkspaceFavoriteMutation}
    />
  );
}

const TimerContentArea = React.memo(function TimerContentArea({
  displaySettings,
  showDeleteToast,
  setSplitDialogOpen,
  calendarDraftEntry,
  onEditEntry,
  onCalendarSlotCreate,
  createTimeEntryMutation,
  createWorkspaceFavoriteMutation,
}: {
  displaySettings: DisplaySettings;
  showDeleteToast: (snapshot: DeletedEntrySnapshot) => void;
  setSplitDialogOpen: (fn: boolean | ((prev: boolean) => boolean)) => void;
  calendarDraftEntry: GithubComTogglTogglApiInternalModelsTimeEntry | null;
  onEditEntry: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => void;
  onCalendarSlotCreate: (slot: { end: Date; start: Date }) => void;
  createTimeEntryMutation: ReturnType<typeof useSelectedEntryContext>["createTimeEntryMutation"];
  createWorkspaceFavoriteMutation: ReturnType<
    typeof useSelectedEntryContext
  >["createWorkspaceFavoriteMutation"];
}): ReactElement | null {
  const { t } = useTranslation("tracking");
  const workspace = useWorkspaceContext();
  const viewState = useViewStateContext();
  const timeEntries = useTimeEntriesContext();
  const runningTimer = useRunningTimerContext();
  const [timesheetAddRowOpen, setTimesheetAddRowOpen] = useState(false);

  const favoritesQuery = useFavoritesQuery(workspace.workspaceId);
  const favorites = Array.isArray(favoritesQuery.data) ? favoritesQuery.data : [];

  const handleTimesheetAddRow = useCallback(
    (projectId: number | null) => {
      setTimesheetAddRowOpen(false);
      if (viewState.weekDays.length === 0) return;
      const firstDay = viewState.weekDays[0];
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
    [viewState.weekDays, createTimeEntryMutation],
  );

  // Scroll to now on mount
  const hasScrolledToNow = useRef(false);
  useEffect(() => {
    if (hasScrolledToNow.current || viewState.view !== "calendar") return;
    if (timeEntries.timeEntriesQuery.isPending) return;
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
  }, [viewState.view, timeEntries.timeEntriesQuery.isPending]);

  if (timeEntries.timeEntriesQuery.isPending) {
    return <SurfaceMessage message={t("loadingTimeEntries")} />;
  }
  if (timeEntries.timeEntriesQuery.isError) {
    return <SurfaceMessage message={runningTimer.timerErrorMessage} tone="error" />;
  }

  return (
    <>
      {viewState.view === "list" ? (
        <ListView
          groups={timeEntries.groupedEntries}
          hasMore={viewState.hasMoreEntries}
          isLoadingMore={timeEntries.isLoadingMoreEntries}
          nowMs={runningTimer.nowMs}
          onLoadMore={viewState.loadMoreEntries}
          onBulkDelete={(ids) => {
            void timeEntries.handleBulkDelete(ids);
          }}
          onBulkEdit={(ids, updates) => {
            void timeEntries.handleBulkEdit(ids, updates);
          }}
          onContinueEntry={(entry) => {
            void runningTimer.handleContinueEntry(entry);
          }}
          onDeleteEntry={(entry) => {
            const wid = entry.workspace_id ?? entry.wid;
            if (typeof entry.id === "number" && typeof wid === "number") {
              const snapshot = snapshotEntryForUndo(entry);
              void workspace.deleteTimeEntryMutation
                .mutateAsync({ timeEntryId: entry.id, workspaceId: wid })
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
              void createTimeEntryMutation.mutateAsync({
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
          }}
          onDescriptionChange={(entry, description) => {
            const wid = entry.workspace_id ?? entry.wid;
            if (typeof entry.id === "number" && typeof wid === "number") {
              void workspace.updateTimeEntryMutation.mutateAsync({
                request: { description },
                timeEntryId: entry.id,
                workspaceId: wid,
              });
            }
          }}
          onEditEntry={onEditEntry}
          onFavoriteEntry={() => {}}
          onTagsChange={(entry, tagIds) => {
            const wid = entry.workspace_id ?? entry.wid;
            if (typeof entry.id === "number" && typeof wid === "number") {
              void workspace.updateTimeEntryMutation.mutateAsync({
                request: { tagIds },
                timeEntryId: entry.id,
                workspaceId: wid,
              });
            }
          }}
          onBillableToggle={(entry) => {
            const wid = entry.workspace_id ?? entry.wid;
            if (typeof entry.id === "number" && typeof wid === "number") {
              void workspace.updateTimeEntryMutation.mutateAsync({
                request: { billable: !entry.billable },
                timeEntryId: entry.id,
                workspaceId: wid,
              });
            }
          }}
          onSplitEntry={(entry) => {
            if (entry.start && entry.stop) {
              onEditEntry(entry, new DOMRect(0, 0, 0, 0));
              setSplitDialogOpen(() => true);
            }
          }}
          onProjectChange={(entry, projectId) => {
            const wid = entry.workspace_id ?? entry.wid;
            if (typeof entry.id === "number" && typeof wid === "number") {
              void workspace.updateTimeEntryMutation.mutateAsync({
                request: { projectId },
                timeEntryId: entry.id,
                workspaceId: wid,
              });
            }
          }}
          projects={workspace.projectOptions
            .filter((project) => project.id != null && project.active !== false)
            .map((project) => ({
              clientName: project.client_name ?? undefined,
              color: resolveProjectColorValue(project),
              id: project.id as number,
              name: project.name ?? "Untitled project",
              pinned: project.pinned === true,
            }))
            .sort((a, b) => Number(b.pinned) - Number(a.pinned))}
          tags={workspace.tagOptions}
          timezone={workspace.timezone}
          workspaceName={
            workspace.session.availableWorkspaces.find((w) => w.id === workspace.workspaceId)
              ?.name ?? "Workspace"
          }
        />
      ) : null}
      {viewState.view === "calendar" ? (
        <CalendarView
          calendarHours={displaySettings.calendarHours}
          draftEntry={calendarDraftEntry}
          entries={timeEntries.visibleEntries}
          isEntryFavorited={(entry) => isEntryAlreadyFavorited(entry, favorites)}
          nowMs={runningTimer.nowMs}
          onContinueEntry={(entry) => {
            void runningTimer.handleContinueEntry(entry);
          }}
          onContextMenuAction={(entry, action) => {
            if (action === "split" && entry.start && entry.stop) {
              onEditEntry(entry, new DOMRect(0, 0, 0, 0));
              setSplitDialogOpen(() => true);
              return;
            }
            handleCalendarContextMenuAction(
              entry,
              action,
              workspace,
              { createTimeEntryMutation, createWorkspaceFavoriteMutation },
              showDeleteToast,
              favorites,
            );
          }}
          onEditEntry={onEditEntry}
          onMoveEntry={(entryId, minutesDelta) => {
            void timeEntries.handleCalendarEntryMove(entryId, minutesDelta);
          }}
          onResizeEntry={(entryId, edge, minutesDelta) => {
            void timeEntries.handleCalendarEntryResize(entryId, edge, minutesDelta);
          }}
          onSelectSlot={(slot) => {
            onCalendarSlotCreate(slot);
          }}
          onStartEntry={() => {
            /* noop — handled by timer bar */
          }}
          onZoomIn={() => viewState.setCalendarZoom(viewState.calendarZoom + 1)}
          onZoomOut={() => viewState.setCalendarZoom(viewState.calendarZoom - 1)}
          runningEntry={runningTimer.runningEntry}
          subview={viewState.calendarSubview}
          timezone={workspace.timezone}
          weekDays={viewState.weekDays}
          weekStartsOn={workspace.beginningOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6}
          zoom={viewState.calendarZoom}
        />
      ) : null}
      {viewState.view === "timesheet" ? (
        <div className="relative min-h-screen">
          <TimesheetView
            onAddRow={() => setTimesheetAddRowOpen((prev) => !prev)}
            onCellEdit={(projectLabel, dayIndex, durationSeconds) => {
              void timeEntries.handleTimesheetCellEdit(projectLabel, dayIndex, durationSeconds);
            }}
            onCopyLastWeek={() => {
              void timeEntries.handleCopyLastWeek();
            }}
            rows={timeEntries.timesheetRows}
            timezone={workspace.timezone}
            weekDays={viewState.weekDays}
          />
          {timesheetAddRowOpen ? (
            <TimesheetAddRowPicker
              onClose={() => setTimesheetAddRowOpen(false)}
              onSelect={handleTimesheetAddRow}
              projectOptions={workspace.projectOptions}
              workspaceName={
                workspace.session.availableWorkspaces.find((w) => w.id === workspace.workspaceId)
                  ?.name ?? "Workspace"
              }
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
});

// ---------------------------------------------------------------------------
// EntryEditorSection: subscribes to SelectedEntry + Workspace + RunningTimer
// Does NOT subscribe to TimerInput or TimeEntries (except recentEntries).
// → Typing in the timer bar will NOT re-render the editor.
// → CalendarView changes will NOT re-render the editor.
// ---------------------------------------------------------------------------

function EntryEditorSection({
  showDeleteToast,
  setSplitDialogOpen,
}: {
  showDeleteToast: (snapshot: DeletedEntrySnapshot) => void;
  setSplitDialogOpen: (fn: boolean | ((prev: boolean) => boolean)) => void;
}): ReactElement | null {
  const { t } = useTranslation("tracking");
  const workspace = useWorkspaceContext();
  const runningTimer = useRunningTimerContext();
  const selectedEntry = useSelectedEntryContext();
  const timeEntries = useTimeEntriesContext();

  const favoritesQuery = useFavoritesQuery(workspace.workspaceId);
  const favorites = Array.isArray(favoritesQuery.data) ? favoritesQuery.data : [];

  if (!selectedEntry.selectedEntry || !selectedEntry.selectedEntryAnchor) return null;

  return (
    <TimeEntryEditorDialog
      anchor={selectedEntry.selectedEntryAnchor}
      currentWorkspaceId={selectedEntry.selectedEntryWorkspaceId}
      description={selectedEntry.selectedDescription}
      entry={selectedEntry.selectedEntry}
      isCreatingProject={selectedEntry.createProjectMutation.isPending}
      isCreatingTag={selectedEntry.createTagMutation.isPending}
      isDeleting={workspace.deleteTimeEntryMutation.isPending}
      isDirty={selectedEntry.selectedEntryDirty}
      isNewEntry={selectedEntry.isNewEntry}
      isPrimaryActionPending={runningTimer.timerMutationPending}
      isSaving={
        selectedEntry.isNewEntry
          ? selectedEntry.createTimeEntryMutation.isPending
          : workspace.updateTimeEntryMutation.isPending
      }
      onClose={selectedEntry.closeSelectedEntryEditor}
      onCreateProject={selectedEntry.handleSelectedEntryProjectCreate}
      onCreateTag={selectedEntry.handleSelectedEntryTagCreate}
      onBillableToggle={selectedEntry.handleSelectedEntryBillableToggle}
      onDuplicate={
        selectedEntry.isNewEntry
          ? undefined
          : () => {
              void selectedEntry.handleSelectedEntryDuplicate();
            }
      }
      onDelete={
        selectedEntry.isNewEntry
          ? undefined
          : () => {
              const snapshot = selectedEntry.selectedEntry
                ? snapshotEntryForUndo(selectedEntry.selectedEntry)
                : null;
              void selectedEntry
                .handleSelectedEntryDelete()
                .then(() => {
                  if (snapshot) showDeleteToast(snapshot);
                })
                .catch(() => {});
            }
      }
      onDescriptionChange={selectedEntry.setSelectedDescription}
      onFavorite={
        selectedEntry.isNewEntry ||
        isEntryAlreadyFavorited(
          {
            description: selectedEntry.selectedDescription,
            project_id: selectedEntry.selectedProjectId,
            tag_ids: selectedEntry.selectedTagIds,
          },
          favorites,
        )
          ? undefined
          : () => {
              void selectedEntry.handleSelectedEntryFavorite();
            }
      }
      onPrimaryAction={
        selectedEntry.isNewEntry
          ? undefined
          : () => {
              void selectedEntry.handleSelectedEntryPrimaryAction();
            }
      }
      onProjectSelect={selectedEntry.setSelectedProjectId}
      onSave={() => {
        void selectedEntry.handleSelectedEntrySave();
      }}
      onSplit={
        selectedEntry.isNewEntry
          ? undefined
          : () => {
              setSplitDialogOpen(() => true);
            }
      }
      onStartTimeChange={selectedEntry.handleSelectedEntryStartTimeChange}
      onStopTimeChange={selectedEntry.handleSelectedEntryStopTimeChange}
      onSuggestionEntrySelect={selectedEntry.handleSelectedEntrySuggestionSelect}
      onTagToggle={(tagId) => {
        selectedEntry.setSelectedTagIds((current) =>
          current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
        );
      }}
      onWorkspaceSelect={(nextWorkspaceId) => {
        workspace.switchWorkspace(nextWorkspaceId);
        selectedEntry.closeSelectedEntryEditor();
      }}
      primaryActionIcon={
        selectedEntry.selectedEntry.stop == null || (selectedEntry.selectedEntry.duration ?? 0) < 0
          ? "stop"
          : "play"
      }
      primaryActionLabel={
        selectedEntry.selectedEntry.stop == null || (selectedEntry.selectedEntry.duration ?? 0) < 0
          ? t("stopTimer")
          : t("continueTimeEntry")
      }
      projects={workspace.projectOptions
        .filter((project) => project.id != null && project.active !== false)
        .map((project) => ({
          clientName: project.client_name ?? undefined,
          color: resolveProjectColorValue(project),
          id: project.id as number,
          name: project.name ?? "Untitled project",
          pinned: project.pinned === true,
        }))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned))}
      recentEntries={timeEntries.recentWorkspaceEntries}
      saveError={selectedEntry.selectedEntryError}
      selectedProjectId={selectedEntry.selectedProjectId}
      selectedTagIds={selectedEntry.selectedTagIds}
      tags={workspace.tagOptions}
      timezone={workspace.timezone}
      workspaces={workspace.session.availableWorkspaces.map((w) => ({
        id: w.id,
        isCurrent: w.isCurrent,
        name: w.name,
      }))}
    />
  );
}

// ---------------------------------------------------------------------------
// ComposerSuggestionsSection: subscribes to TimerInput + Workspace + TimeEntries
// Does NOT subscribe to RunningTimer or SelectedEntry.
// ---------------------------------------------------------------------------

function ComposerSuggestionsSection(): ReactElement | null {
  const workspace = useWorkspaceContext();
  const timeEntries = useTimeEntriesContext();
  const timerInput = useTimerInputContext();

  const favoritesQuery = useFavoritesQuery(workspace.workspaceId);
  const favorites = Array.isArray(favoritesQuery.data) ? favoritesQuery.data : [];

  if (!timerInput.composerSuggestionsAnchor) return null;

  return (
    <TimerComposerSuggestionsDialog
      anchor={timerInput.composerSuggestionsAnchor}
      currentWorkspaceId={workspace.workspaceId}
      favorites={favorites}
      onClose={timerInput.closeComposerSuggestions}
      onFavoriteSelect={(fav) => {
        timerInput.setDraftDescription(fav.description ?? "");
        timerInput.setDraftProjectId(fav.project_id ?? null);
        timerInput.setDraftTagIds(fav.tag_ids ?? []);
        timerInput.setDraftBillable(fav.billable ?? false);
        timerInput.closeComposerSuggestions();
      }}
      query={timerInput.timerDescriptionValue}
      onProjectSelect={(projectId) => {
        timerInput.setDraftProjectId(projectId);
        timerInput.closeComposerSuggestions();
      }}
      onTimeEntrySelect={(entry) => {
        timerInput.setDraftDescription(entry.description ?? "");
        timerInput.setDraftProjectId(resolveTimeEntryProjectId(entry));
        timerInput.setDraftTagIds(entry.tag_ids ?? []);
        timerInput.closeComposerSuggestions();
      }}
      onWorkspaceSelect={(nextWorkspaceId) => {
        workspace.switchWorkspace(nextWorkspaceId);
        timerInput.closeComposerSuggestions();
      }}
      projects={workspace.projectOptions}
      searchResults={timerInput.searchedTimeEntries}
      timeEntries={timeEntries.recentWorkspaceEntries}
      workspaces={workspace.session.availableWorkspaces.map((w) => ({
        id: w.id,
        isCurrent: w.isCurrent,
        name: w.name,
      }))}
    />
  );
}

// ---------------------------------------------------------------------------
// Small isolated sections that subscribe to narrow contexts
// ---------------------------------------------------------------------------

function SidebarSection({ sidebarOpen }: { sidebarOpen: boolean }): ReactElement | null {
  const workspace = useWorkspaceContext();
  const runningTimer = useRunningTimerContext();
  const favoritesQuery = useFavoritesQuery(workspace.workspaceId);
  const deleteFavoriteMutation = useDeleteFavoriteMutation(workspace.workspaceId);
  const favorites = Array.isArray(favoritesQuery.data) ? favoritesQuery.data : [];
  const goalsQuery = useGoalsQuery(workspace.workspaceId, true);
  const goals = Array.isArray(goalsQuery.data) ? goalsQuery.data : [];

  if (!sidebarOpen) return null;

  return (
    <GoalsFavoritesSidebar
      favorites={favorites}
      goals={goals}
      workspaceId={workspace.workspaceId}
      onDeleteFavorite={(favoriteId) => {
        void deleteFavoriteMutation.mutateAsync(favoriteId);
      }}
      onStartFavorite={(fav) => {
        void runningTimer.handleContinueEntry({
          billable: fav.billable,
          description: fav.description,
          project_id: fav.project_id,
          tag_ids: fav.tag_ids,
          task_id: fav.task_id,
        } as Parameters<typeof runningTimer.handleContinueEntry>[0]);
      }}
    />
  );
}

function AutoStartEffect({ startParams }: { startParams?: StartParams }): null {
  const runningTimer = useRunningTimerContext();
  const startParamsConsumedRef = useRef(false);
  const currentEntryLoaded =
    !runningTimer.currentTimeEntryQuery.isPending && !runningTimer.currentTimeEntryQuery.isFetching;

  useEffect(() => {
    if (!startParams || startParamsConsumedRef.current || !currentEntryLoaded) return;
    startParamsConsumedRef.current = true;
    void runningTimer.handleStartFromUrl(startParams).then(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("description");
      url.searchParams.delete("desc");
      url.searchParams.delete("project_id");
      url.searchParams.delete("tag_ids");
      url.searchParams.delete("billable");
      url.searchParams.delete("wid");
      window.history.replaceState(window.history.state, "", url.toString());
    });
  }, [startParams, currentEntryLoaded, runningTimer]);

  return null;
}

function GlobalKeyboardShortcuts({
  setShortcutsOpen,
}: {
  setShortcutsOpen: (fn: (prev: boolean) => boolean) => void;
}): null {
  const runningTimer = useRunningTimerContext();
  const timerInput = useTimerInputContext();

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
        timerInput.timerDescriptionInputRef.current?.focus();
        return;
      }
      if (event.key === "s" && runningTimer.runningEntry?.id != null) {
        event.preventDefault();
        void timerInput.handleTimerAction();
      }
    },
    [runningTimer.runningEntry, timerInput, setShortcutsOpen],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [handleGlobalKeyDown]);

  return null;
}

function SplitDialogSection({
  splitDialogOpen,
  setSplitDialogOpen,
}: {
  splitDialogOpen: boolean;
  setSplitDialogOpen: (open: boolean) => void;
}): ReactElement | null {
  const selectedEntry = useSelectedEntryContext();

  if (
    !splitDialogOpen ||
    !selectedEntry.selectedEntry?.start ||
    !selectedEntry.selectedEntry?.stop
  ) {
    return null;
  }

  return (
    <SplitTimeEntryDialog
      start={selectedEntry.selectedEntry.start}
      stop={selectedEntry.selectedEntry.stop}
      onCancel={() => setSplitDialogOpen(false)}
      onConfirm={(splitAtMs) => {
        setSplitDialogOpen(false);
        void selectedEntry.handleSelectedEntrySplit(splitAtMs);
      }}
    />
  );
}

function DeleteToast({
  deleteToast,
  setDeleteToast,
  deleteToastTimerRef,
}: {
  deleteToast: DeletedEntrySnapshot | null;
  setDeleteToast: (toast: DeletedEntrySnapshot | null) => void;
  deleteToastTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}): ReactElement | null {
  const { t } = useTranslation("tracking");
  const selectedEntry = useSelectedEntryContext();

  const handleUndoDelete = useCallback(() => {
    if (!deleteToast) return;
    if (deleteToastTimerRef.current) {
      clearTimeout(deleteToastTimerRef.current);
      deleteToastTimerRef.current = null;
    }
    void selectedEntry.createTimeEntryMutation.mutateAsync({
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
  }, [deleteToast, selectedEntry.createTimeEntryMutation, setDeleteToast, deleteToastTimerRef]);

  if (!deleteToast) return null;

  return (
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
  );
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

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
  workspace: ReturnType<typeof useWorkspaceContext>,
  selectedEntryCtx: Pick<
    ReturnType<typeof useSelectedEntryContext>,
    "createTimeEntryMutation" | "createWorkspaceFavoriteMutation"
  >,
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
        void selectedEntryCtx.createTimeEntryMutation.mutateAsync({
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
        void workspace.deleteTimeEntryMutation
          .mutateAsync({ timeEntryId: entry.id, workspaceId: wid })
          .then(() => {
            if (snapshot) showDeleteToast(snapshot);
          });
      }
      break;
    }
    case "copy-description": {
      const description = (entry.description ?? "").trim();
      if (description) void navigator.clipboard.writeText(description);
      break;
    }
    case "copy-start-link": {
      const params = new URLSearchParams();
      if (entry.description) params.set("description", entry.description.trim());
      const projectId = resolveTimeEntryProjectId(entry);
      if (projectId != null) params.set("project_id", String(projectId));
      if (entry.tag_ids?.length) params.set("tag_ids", entry.tag_ids.join(","));
      if (entry.billable) params.set("billable", "true");
      void navigator.clipboard.writeText(`${window.location.origin}/timer?${params.toString()}`);
      break;
    }
    case "favorite": {
      if (isEntryAlreadyFavorited(entry, favorites)) break;
      void selectedEntryCtx.createWorkspaceFavoriteMutation.mutateAsync({
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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
  runningEntry: { id?: number | null; project_id?: number | null; pid?: number | null } | null;
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
          if (!containerRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
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
            if ((e.target as HTMLElement).tagName !== "INPUT") e.preventDefault();
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
          if (!containerRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
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
            if ((e.target as HTMLElement).tagName !== "INPUT") e.preventDefault();
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
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition hover:bg-white/5 ${isSelected ? "text-[var(--track-accent)]" : "text-white"}`}
                    key={tag.id}
                    onClick={() => onTagToggle(tag.id)}
                    type="button"
                  >
                    <span
                      className={`flex size-4 items-center justify-center rounded border text-[11px] ${isSelected ? "border-[var(--track-accent)] bg-[var(--track-accent)] text-white" : "border-[var(--track-border)]"}`}
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
                    if (typeof newTag?.id === "number") onTagToggle(newTag.id);
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

function TimerRangePicker(): ReactElement {
  const { t } = useTranslation("tracking");
  const viewState = useViewStateContext();
  const workspace = useWorkspaceContext();
  const isAllDates = viewState.view === "list" && viewState.listDateRange == null;
  const isDayMode = !isAllDates && viewState.view !== "list" && viewState.calendarSubview === "day";
  const mode = isDayMode ? "day" : "week";
  const [activeShortcut, setActiveShortcut] = useState<string | null>("this-week");
  const label = isAllDates
    ? t("allDates")
    : activeShortcut === "last-30-days"
      ? t("last30Days")
      : isDayMode
        ? formatDayLabel(viewState.selectedWeekDate)
        : formatWeekRangeLabel(viewState.selectedWeekDate, workspace.beginningOfWeek);
  const handleSelectDate = useCallback(
    (date: Date) => {
      if (viewState.view === "list") {
        const days = getWeekDaysForDate(date, workspace.beginningOfWeek);
        viewState.setListDateRange({
          startDate: formatTrackQueryDate(days[0]),
          endDate: formatTrackQueryDate(days[6]),
        });
      }
      viewState.setSelectedWeekDate(date);
      setActiveShortcut(null);
    },
    [viewState, workspace.beginningOfWeek],
  );
  const handlePrev = useCallback(() => {
    handleSelectDate(
      isDayMode
        ? shiftDay(viewState.selectedWeekDate, -1)
        : shiftWeek(viewState.selectedWeekDate, -1),
    );
  }, [handleSelectDate, isDayMode, viewState.selectedWeekDate]);
  const handleNext = useCallback(() => {
    handleSelectDate(
      isDayMode
        ? shiftDay(viewState.selectedWeekDate, 1)
        : shiftWeek(viewState.selectedWeekDate, 1),
    );
  }, [handleSelectDate, isDayMode, viewState.selectedWeekDate]);
  const handleShortcut = useCallback(
    (shortcutId: string, date: Date) => {
      setActiveShortcut(shortcutId);
      if (shortcutId === "all-dates") {
        viewState.setListDateRange(null);
        if (viewState.view !== "list") viewState.setView("list");
      } else if (shortcutId === "last-30-days") {
        if (viewState.view === "list")
          viewState.setListDateRange({
            startDate: formatTrackQueryDate(date),
            endDate: formatTrackQueryDate(new Date()),
          });
        else viewState.setCalendarSubview("week");
        viewState.setSelectedWeekDate(date);
      } else if (shortcutId === "today" || shortcutId === "yesterday") {
        if (viewState.view === "list") {
          const dayStr = formatTrackQueryDate(date);
          viewState.setListDateRange({ startDate: dayStr, endDate: dayStr });
        } else viewState.setCalendarSubview("day");
        viewState.setSelectedWeekDate(date);
      } else {
        if (viewState.view === "list") {
          const days = getWeekDaysForDate(date, workspace.beginningOfWeek);
          viewState.setListDateRange({
            startDate: formatTrackQueryDate(days[0]),
            endDate: formatTrackQueryDate(days[6]),
          });
        } else viewState.setCalendarSubview("week");
        viewState.setSelectedWeekDate(date);
      }
    },
    [viewState, workspace.beginningOfWeek],
  );
  return (
    <WeekRangePicker
      disabled={isAllDates}
      label={label}
      mode={mode}
      onNext={handleNext}
      onPrev={handlePrev}
      onSelectDate={handleSelectDate}
      selectedDate={viewState.selectedWeekDate}
      sidebar={
        <TimerDateShortcuts
          activeShortcut={activeShortcut}
          onShortcut={handleShortcut}
          shortcuts={viewState.view === "list" ? WEEK_SHORTCUTS : CALENDAR_SHORTCUTS}
        />
      }
      weekStartsOn={workspace.beginningOfWeek}
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
            className={`w-full rounded-lg px-3 py-2 text-left text-[14px] font-medium transition ${isActive ? "bg-[var(--track-accent-strong)] text-white" : "text-[var(--track-overlay-text-muted)] hover:bg-[var(--track-row-hover)] hover:text-white"}`}
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
  return projectId == null || projectId <= 0 ? null : projectId;
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
        if ((e.target as HTMLElement).tagName !== "INPUT") e.preventDefault();
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
