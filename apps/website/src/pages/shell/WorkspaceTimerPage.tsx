import type * as React from "react";
import { type ChangeEvent, type ReactElement } from "react";

import {
  CalendarView,
  ChromeIconButton,
  ListView,
  SummaryStat,
  SurfaceMessage,
  TimesheetView,
  ViewTab,
  ViewTabGroup,
} from "../../features/tracking/overview-views.tsx";
import { TimeEntryEditorDialog } from "../../features/tracking/TimeEntryEditorDialog.tsx";
import { TimerComposerSuggestionsDialog } from "../../features/tracking/TimerComposerSuggestionsDialog.tsx";
import { WeekRangePicker } from "../../features/tracking/WeekRangePicker.tsx";
import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import { useTimerPageOrchestration } from "./useTimerPageOrchestration.ts";

export function WorkspaceTimerPage(): ReactElement {
  const orch = useTimerPageOrchestration();

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[var(--track-surface)] text-white"
      data-testid="tracking-timer-page"
    >
      <header className="shrink-0 border-b border-[var(--track-border)]">
        <div className="flex min-h-[84px] flex-wrap items-center gap-x-3 gap-y-3 border-b border-[var(--track-border)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="timer-description">
              Time entry description
            </label>
            <input
              className="h-10 w-full bg-transparent text-[18px] font-medium text-white outline-none placeholder:text-[var(--track-text-muted)]"
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
          <button
            aria-label={`Add a project${orch.displayProject !== "No project" ? `: ${orch.displayProject}` : ""}`}
            className="flex size-9 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
            onClick={() => {
              if (orch.runningEntry?.id == null) {
                orch.handleIdleDescriptionFocus();
              }
            }}
            type="button"
          >
            <TrackingIcon className="size-4" name="grid" />
          </button>
          <button
            aria-label="Select tags"
            className="flex size-9 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
            onClick={() => {
              if (orch.runningEntry?.id == null) {
                orch.handleIdleDescriptionFocus();
              }
            }}
            type="button"
          >
            <TrackingIcon className="size-4" name="tags" />
          </button>
          <button
            aria-label="Billable"
            className="flex size-9 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
            type="button"
          >
            <span className="text-[16px] font-semibold">$</span>
          </button>
          <div className="ml-auto flex shrink-0 items-center gap-3">
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
          </div>
        </div>

        <div className="px-5 pb-4 pt-4">
          <div className="flex items-center gap-4">
            <WeekRangePicker
              onSelectDate={orch.setSelectedWeekDate}
              selectedDate={orch.selectedWeekDate}
            />
            <SummaryStat
              label="Week total"
              value={
                orch.weekTotalSeconds > 0 ? formatClockDuration(orch.weekTotalSeconds) : "00:00:00"
              }
            />
            <div className="ml-auto flex items-center gap-3">
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
              <ChromeIconButton icon="settings" />
            </div>
          </div>
          {orch.trackStrip.length > 0 ? (
            <div className="mt-3 flex h-[22px] gap-px overflow-hidden">
              {orch.trackStrip.map((item) => (
                <div className="min-w-0 flex-1" key={item.label}>
                  <div
                    className="truncate text-[10px] font-medium uppercase tracking-wide"
                    style={{ color: item.color }}
                  >
                    {item.label}
                  </div>
                  <div className="mt-0.5 h-[3px]" style={{ backgroundColor: item.color }} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </header>
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
            onEditEntry={orch.handleEntryEdit}
            timezone={orch.timezone}
          />
        ) : null}
        {!orch.timeEntriesQuery.isPending &&
        !orch.timeEntriesQuery.isError &&
        orch.view === "calendar" ? (
          <CalendarView
            entries={orch.visibleEntries}
            nowMs={orch.nowMs}
            onEditEntry={orch.handleEntryEdit}
            onMoveEntry={(entryId, minutesDelta) => {
              void orch.handleCalendarEntryMove(entryId, minutesDelta);
            }}
            onResizeEntry={(entryId, edge, minutesDelta) => {
              void orch.handleCalendarEntryResize(entryId, edge, minutesDelta);
            }}
            onZoomIn={() => orch.setCalendarZoom(orch.calendarZoom + 1)}
            onZoomOut={() => orch.setCalendarZoom(orch.calendarZoom - 1)}
            runningEntry={orch.runningEntry}
            timezone={orch.timezone}
            weekDays={orch.weekDays}
            zoom={orch.calendarZoom}
          />
        ) : null}
        {!orch.timeEntriesQuery.isPending &&
        !orch.timeEntriesQuery.isError &&
        orch.view === "timesheet" ? (
          <TimesheetView
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
              void orch.handleSelectedEntryDelete();
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
      {orch.composerSuggestionsAnchor ? (
        <TimerComposerSuggestionsDialog
          anchor={orch.composerSuggestionsAnchor}
          currentWorkspaceId={orch.workspaceId}
          onClose={orch.closeComposerSuggestions}
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
