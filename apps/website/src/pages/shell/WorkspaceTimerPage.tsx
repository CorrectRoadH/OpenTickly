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
} from "../../features/tracking/overview-views.tsx";
import { TimeEntryEditorDialog } from "../../features/tracking/TimeEntryEditorDialog.tsx";
import { TimerComposerSuggestionsDialog } from "../../features/tracking/TimerComposerSuggestionsDialog.tsx";
import { WeekRangePicker, QuickDateShortcuts } from "../../features/tracking/WeekRangePicker.tsx";
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
              className="h-10 w-full bg-transparent text-[18px] font-medium text-white outline-none placeholder:text-white"
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
            className="flex h-[30px] min-w-0 max-w-[220px] shrink items-center gap-2 rounded-md px-3 text-[12px] text-white"
            onClick={() => {
              if (orch.runningEntry?.id == null) {
                orch.handleIdleDescriptionFocus();
              }
            }}
            type="button"
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: orch.displayColor }}
            />
            <span className="min-w-0 truncate">{orch.displayProject}</span>
          </button>
          <button
            className="flex h-9 min-w-[36px] max-w-[220px] items-center justify-center gap-2 rounded-md px-3 text-[12px] text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
            onClick={() => {
              if (orch.runningEntry?.id == null) {
                orch.handleIdleDescriptionFocus();
              }
            }}
            type="button"
          >
            <TrackingIcon className="size-4 shrink-0" name="tags" />
            {orch.draftTags.length > 0 ? (
              <span className="min-w-0 truncate text-white">
                {orch.draftTags[0]?.name}
                {orch.draftTags.length > 1 ? ` +${orch.draftTags.length - 1}` : ""}
              </span>
            ) : null}
          </button>
          <ChromeIconButton icon="subscription" />
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span
              className="text-[29px] font-medium tabular-nums text-white"
              data-testid="timer-elapsed"
            >
              {orch.runningDurationSeconds > 0
                ? formatClockDuration(orch.runningDurationSeconds)
                : "00:00:00"}
            </span>
            <button
              aria-label={orch.runningEntry ? "Stop timer" : "Start timer"}
              className="flex size-[42px] items-center justify-center rounded-full bg-[#ff7a66] text-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-6">
              <QuickDateShortcuts
                onSelectDate={orch.setSelectedWeekDate}
                selectedDate={orch.selectedWeekDate}
              />
              <WeekRangePicker
                onSelectDate={orch.setSelectedWeekDate}
                selectedDate={orch.selectedWeekDate}
              />
              <SummaryStat
                label="Week total"
                value={
                  orch.weekTotalSeconds > 0
                    ? formatClockDuration(orch.weekTotalSeconds)
                    : "00:00:00"
                }
              />
            </div>
            <div className="flex w-full flex-wrap items-center justify-start gap-3 lg:w-auto lg:justify-end">
              <div className="flex rounded-md border border-[var(--track-border)] bg-[#111111] p-0.5">
                <ViewTab currentView={orch.view} onSelect={orch.setView} targetView="calendar" />
                <ViewTab currentView={orch.view} onSelect={orch.setView} targetView="list" />
                <ViewTab currentView={orch.view} onSelect={orch.setView} targetView="timesheet" />
              </div>
              <ChromeIconButton icon="settings" />
            </div>
          </div>
          {orch.trackStrip.length > 0 ? (
            <div className="mt-4 flex h-[30px] gap-0.5 overflow-hidden">
              {orch.trackStrip.map((item) => (
                <div className="min-w-0 flex-1" key={item.label}>
                  <div className="truncate text-[10px] font-medium" style={{ color: item.color }}>
                    {item.label}
                  </div>
                  <div
                    className="mt-1 h-0.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
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
            hours={orch.calendarHours}
            nowMs={orch.nowMs}
            onEditEntry={orch.handleEntryEdit}
            runningEntry={orch.runningEntry}
            timezone={orch.timezone}
            weekDays={orch.weekDays}
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
            onDuplicate={() => {
              void orch.handleSelectedEntryDuplicate();
            }}
            onDelete={() => {
              void orch.handleSelectedEntryDelete();
            }}
            onDescriptionChange={orch.setSelectedDescription}
            onPrimaryAction={() => {
              void orch.handleSelectedEntryPrimaryAction();
            }}
            onProjectSelect={orch.setSelectedProjectId}
            onSave={() => {
              void orch.handleSelectedEntrySave();
            }}
            onStartTimeChange={orch.handleSelectedEntryStartTimeChange}
            onStopTimeChange={orch.handleSelectedEntryStopTimeChange}
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
                : "Continue entry"
            }
            projects={orch.projectOptions
              .filter((project) => project.id != null)
              .map((project) => ({
                clientName: project.client_name ?? undefined,
                color: resolveProjectColorValue(project),
                id: project.id as number,
                name: project.name ?? "Untitled project",
              }))}
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
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
