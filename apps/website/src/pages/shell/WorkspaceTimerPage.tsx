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
import { TimeEntryEditorDialog } from "../../features/tracking/TimeEntryEditorDialog.tsx";
import { TimerComposerSuggestionsDialog } from "../../features/tracking/TimerComposerSuggestionsDialog.tsx";
import { WeekRangePicker } from "../../features/tracking/WeekRangePicker.tsx";
import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
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

export function WorkspaceTimerPage(): ReactElement {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(() =>
    readDisplaySettings(),
  );
  const [deleteToast, setDeleteToast] = useState<DeletedEntrySnapshot | null>(null);
  const deleteToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orch = useTimerPageOrchestration({ showAllEntries });

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

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[var(--track-surface)] text-white"
      data-testid="tracking-timer-page"
    >
      <header className="shrink-0 border-b border-[var(--track-border)]">
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
            onProjectSelect={orch.setDraftProjectId}
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
              orch.setDraftTagIds(
                orch.draftTagIds.includes(tagId)
                  ? orch.draftTagIds.filter((id) => id !== tagId)
                  : [...orch.draftTagIds, tagId],
              );
            }}
            runningEntry={orch.runningEntry}
            tagOptions={orch.tagOptions}
          />
          <button
            aria-label={orch.draftBillable ? "Set as non-billable" : "Set as billable"}
            className={`flex size-9 items-center justify-center rounded-md transition hover:bg-[var(--track-row-hover)] ${
              (orch.runningEntry?.id != null ? orch.runningEntry.billable : orch.draftBillable)
                ? "text-[#e57bd9]"
                : "text-[var(--track-text-muted)] hover:text-white"
            }`}
            onClick={() => {
              if (orch.runningEntry?.id == null) {
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
                onAddTimeEntry={(_start, _stop) => {
                  /* Manual entry creation will be implemented in a follow-up */
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
                    ? formatClockDuration(orch.runningDurationSeconds)
                    : "0:00:00"}
                </span>
                <button
                  aria-label={orch.runningEntry ? "Stop timer" : "Start timer"}
                  className="flex size-[42px] items-center justify-center rounded-full bg-[#e57bd9] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  data-icon={orch.runningEntry ? "stop" : "play"}
                  data-testid="timer-action-button"
                  disabled={orch.timerMutationPending}
                  onClick={() => {
                    void orch.handleTimerAction();
                  }}
                  type="button"
                >
                  <TrackingIcon className="size-5" name={orch.runningEntry ? "stop" : "play"} />
                </button>
              </>
            )}
            <button
              aria-label={
                orch.timerInputMode === "automatic"
                  ? "Switch to manual mode"
                  : "Switch to automatic mode"
              }
              className="flex size-7 items-center justify-center rounded text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
              data-testid="timer-input-mode-toggle"
              onClick={() => {
                orch.setTimerInputMode(
                  orch.timerInputMode === "automatic" ? "manual" : "automatic",
                );
              }}
              title={
                orch.timerInputMode === "automatic"
                  ? "Switch to manual mode"
                  : "Switch to automatic mode"
              }
              type="button"
            >
              <TrackingIcon
                className="size-3.5"
                name={orch.timerInputMode === "automatic" ? "manual-mode" : "timer"}
              />
            </button>
          </div>
        </div>

        <div className="px-5 pb-4 pt-4">
          <div className="flex items-center gap-4">
            {orch.view === "list" ? (
              <AllDatesLabel />
            ) : (
              <WeekRangePicker
                mode={orch.calendarSubview === "day" ? "day" : "week"}
                onDayShortcutSelect={(date) => {
                  orch.setCalendarSubview("day");
                  orch.setSelectedWeekDate(date);
                }}
                onSelectDate={(date) => {
                  orch.setSelectedWeekDate(date);
                  if (orch.calendarSubview === "day") {
                    // Stay in day mode when navigating via arrows or calendar click
                  }
                }}
                selectedDate={orch.selectedWeekDate}
                weekStartsOn={orch.beginningOfWeek}
              />
            )}
            {orch.view === "list" ? (
              <SummaryStat
                label="Today total"
                value={
                  orch.todayTotalSeconds > 0
                    ? formatClockDuration(orch.todayTotalSeconds)
                    : "0:00:00"
                }
              />
            ) : null}
            <SummaryStat
              label="Week total"
              value={
                orch.weekTotalSeconds > 0 ? formatClockDuration(orch.weekTotalSeconds) : "00:00:00"
              }
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
                  icon="settings"
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
                icon="grid"
                onClick={() => setSidebarOpen((prev) => !prev)}
              />
            </div>
          </div>
          {orch.trackStrip.length > 0 ? <ProjectFilterStrip items={orch.trackStrip} /> : null}
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div
          className={`relative min-h-0 flex-1 overflow-x-hidden ${
            !orch.timeEntriesQuery.isPending &&
            !orch.timeEntriesQuery.isError &&
            orch.view === "calendar"
              ? "overflow-y-hidden"
              : "overflow-y-auto"
          }`}
          data-testid="tracking-timer-scroll-area"
          ref={orch.scrollAreaRef as unknown as React.LegacyRef<HTMLDivElement>}
        >
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
              nowMs={orch.nowMs}
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
              onEditEntry={orch.handleEntryEdit}
              onFavoriteEntry={() => {
                // Pin as favorite is handled through the editor dialog
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
              onSplitEntry={() => {
                // Split is a complex feature — placeholder for now
                window.alert("Split is not yet available.");
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
              entries={orch.visibleEntries}
              nowMs={orch.nowMs}
              onEditEntry={orch.handleEntryEdit}
              onMoveEntry={(entryId, minutesDelta) => {
                void orch.handleCalendarEntryMove(entryId, minutesDelta);
              }}
              onResizeEntry={(entryId, edge, minutesDelta) => {
                void orch.handleCalendarEntryResize(entryId, edge, minutesDelta);
              }}
              onSelectSlot={(slot) => {
                void orch.handleCalendarSlotCreate(slot);
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
            <TimesheetView
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
          ) : null}
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
              isPrimaryActionPending={orch.timerMutationPending}
              isSaving={orch.updateTimeEntryMutation.isPending}
              onClose={orch.closeSelectedEntryEditor}
              onCreateProject={orch.handleSelectedEntryProjectCreate}
              onCreateTag={orch.handleSelectedEntryTagCreate}
              onBillableToggle={orch.handleSelectedEntryBillableToggle}
              onDuplicate={() => {
                void orch.handleSelectedEntryDuplicate();
              }}
              onDelete={() => {
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
              }}
              onDescriptionChange={orch.setSelectedDescription}
              onFavorite={() => {
                void orch.handleSelectedEntryFavorite();
              }}
              onPrimaryAction={() => {
                void orch.handleSelectedEntryPrimaryAction();
              }}
              onProjectSelect={orch.setSelectedProjectId}
              onSave={() => {
                void orch.handleSelectedEntrySave();
              }}
              onSplit={() => {
                void orch.handleSelectedEntrySplit();
              }}
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
        {sidebarOpen ? <GoalsFavoritesSidebar /> : null}
      </div>
      {shortcutsOpen ? <KeyboardShortcutsDialog onClose={() => setShortcutsOpen(false)} /> : null}
      {orch.composerSuggestionsAnchor ? (
        <TimerComposerSuggestionsDialog
          anchor={orch.composerSuggestionsAnchor}
          currentWorkspaceId={orch.workspaceId}
          onClose={orch.closeComposerSuggestions}
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
      {deleteToast ? (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-lg border border-[var(--track-border)] bg-[var(--track-surface)] px-5 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
          <span className="text-[14px] text-white">Time entry deleted</span>
          <button
            className="text-[14px] font-semibold text-[#e57bd9] transition hover:text-[#f09de6]"
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
        .filter((p) => p.id != null)
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
            ? "h-9 max-w-[180px] px-2 text-[#e57bd9]"
            : hasProject
              ? "size-9 text-[#e57bd9]"
              : "size-9 text-[var(--track-text-muted)] hover:text-white"
        }`}
        onClick={() => {
          if (runningEntry?.id == null) {
            setOpen((prev) => !prev);
            setSearch("");
          }
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
          <TrackingIcon className="size-4 shrink-0" name="projects" />
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
          onMouseDown={(e) => e.preventDefault()}
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
              ? "h-9 max-w-[160px] px-2 text-[#e57bd9]"
              : "size-9 text-[#e57bd9]"
            : "size-9 text-[var(--track-text-muted)] hover:text-white"
        }`}
        onClick={() => {
          if (runningEntry?.id == null) {
            setOpen((prev) => !prev);
            setSearch("");
          }
        }}
        onBlur={(e) => {
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
        type="button"
      >
        <TrackingIcon className="size-4 shrink-0" name="tags" />
        {tagLabel ? (
          <span className="min-w-0 truncate text-[13px] font-medium">{tagLabel}</span>
        ) : null}
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[220px] rounded-xl border border-[#3d3d42] bg-[#1f1f20] py-2 shadow-[0_14px_32px_rgba(0,0,0,0.34)]"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-[#999]">
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
            <div className="px-3 py-2 text-[13px] text-[#999]">No tags available</div>
          ) : filteredTags.length > 0 ? (
            <div className="max-h-[200px] overflow-y-auto">
              {filteredTags.map((tag) => {
                const isSelected = draftTagIds.includes(tag.id);
                return (
                  <button
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition hover:bg-white/5 ${
                      isSelected ? "text-[#e57bd9]" : "text-white"
                    }`}
                    key={tag.id}
                    onClick={() => onTagToggle(tag.id)}
                    type="button"
                  >
                    <span
                      className={`flex size-4 items-center justify-center rounded border text-[10px] ${
                        isSelected
                          ? "border-[#e57bd9] bg-[#e57bd9] text-white"
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
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#e57bd9] transition hover:bg-white/5 disabled:opacity-60"
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
 * Static "All dates" label shown in list view mode, matching Toggl's behavior
 * where list view is unbounded by week range.
 */
function AllDatesLabel(): ReactElement {
  return (
    <div className="flex items-center gap-3">
      <button
        aria-label="Previous week"
        className="flex size-7 items-center justify-center rounded text-[var(--track-text-muted)] opacity-40"
        disabled
        type="button"
      >
        <TrackingIcon className="size-3 rotate-180" name="chevron-right" />
      </button>
      <div className="flex h-9 items-center gap-2 rounded-lg border border-[var(--track-border)] bg-[#1b1b1b] px-3 text-left text-white">
        <TrackingIcon className="size-4 shrink-0 text-[var(--track-text-muted)]" name="calendar" />
        <span className="truncate text-[13px] font-medium">All dates</span>
      </div>
      <button
        aria-label="Next week"
        className="flex size-7 items-center justify-center rounded text-[var(--track-text-muted)] opacity-40"
        disabled
        type="button"
      >
        <TrackingIcon className="size-3" name="chevron-right" />
      </button>
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

function formatClockDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
