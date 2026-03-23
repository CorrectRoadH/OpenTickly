import { type ChangeEvent, type ReactElement, useEffect, useMemo, useState } from "react";

import {
  buildEntryGroups,
  buildTimesheetRows,
  formatClockDuration,
  formatWeekday,
  getCalendarHours,
  getCurrentWeekDays,
  resolveEntryColor,
  resolveEntryDurationSeconds,
  sortTimeEntries,
  summarizeProjects,
  sumForDate,
} from "../../features/tracking/overview-data.ts";
import {
  CalendarView,
  ChromeIconButton,
  ListView,
  SummaryStat,
  SurfaceMessage,
  TimesheetView,
  ToolbarButton,
  ViewTab,
} from "../../features/tracking/overview-views.tsx";
import {
  TimeEntryEditorDialog,
  type TimeEntryEditorAnchor,
} from "../../features/tracking/TimeEntryEditorDialog.tsx";
import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import type {
  GithubComTogglTogglApiInternalModelsProject,
  GithubComTogglTogglApiInternalModelsTimeEntry,
} from "../../shared/api/generated/public-track/types.gen.ts";
import { WebApiError } from "../../shared/api/web-client.ts";
import {
  useCurrentTimeEntryQuery,
  useProjectsQuery,
  useStartTimeEntryMutation,
  useStopTimeEntryMutation,
  useTimeEntriesQuery,
  useTagsQuery,
  useUpdateTimeEntryMutation,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import type { TimerViewMode } from "../../features/tracking/timer-view-mode.ts";

export function WorkspaceTimerPage(): ReactElement {
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const timezone = session.user.timezone || "UTC";
  const [view, setView] = useState<TimerViewMode>("calendar");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const weekDays = useMemo(() => getCurrentWeekDays(), []);
  const weekRange = useMemo(
    () => ({
      endDate: formatTrackQueryDate(weekDays[6]),
      startDate: formatTrackQueryDate(weekDays[0]),
    }),
    [weekDays],
  );
  const timeEntriesQuery = useTimeEntriesQuery({
    ...weekRange,
  });
  const currentTimeEntryQuery = useCurrentTimeEntryQuery();
  const projectsQuery = useProjectsQuery(workspaceId, "all");
  const startTimeEntryMutation = useStartTimeEntryMutation(workspaceId);
  const stopTimeEntryMutation = useStopTimeEntryMutation();
  const tagsQuery = useTagsQuery(workspaceId);
  const updateTimeEntryMutation = useUpdateTimeEntryMutation();
  const [draftDescription, setDraftDescription] = useState("");
  const [selectedEntry, setSelectedEntry] =
    useState<GithubComTogglTogglApiInternalModelsTimeEntry | null>(null);
  const [selectedEntryAnchor, setSelectedEntryAnchor] = useState<TimeEntryEditorAnchor | null>(
    null,
  );
  const [selectedDescription, setSelectedDescription] = useState("");
  const [selectedEntryError, setSelectedEntryError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const entries = sortTimeEntries(timeEntriesQuery.data ?? []);
  const runningEntry = currentTimeEntryQuery.data;
  const projectOptions = useMemo(() => normalizeProjects(projectsQuery.data), [projectsQuery.data]);
  const tagOptions = useMemo(() => normalizeTags(tagsQuery.data), [tagsQuery.data]);
  const runningDurationSeconds = resolveEntryDurationSeconds(
    runningEntry ?? { duration: 0 },
    nowMs,
  );
  const displayProject =
    runningEntry?.project_name ||
    entries.find((entry) => entry.project_name)?.project_name ||
    "No project";
  const displayColor = resolveEntryColor(runningEntry ?? entries[0] ?? {});
  const groupedEntries = buildEntryGroups(entries, timezone);
  const trackStrip = summarizeProjects(entries).slice(0, 12);
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).format(new Date());
  const todayTotalSeconds = sumForDate(entries, todayKey, timezone);
  const weekTotalSeconds = weekDays.reduce(
    (total, day) =>
      total +
      sumForDate(
        entries,
        new Intl.DateTimeFormat("en-CA", {
          day: "2-digit",
          month: "2-digit",
          timeZone: timezone,
          year: "numeric",
        }).format(day),
        timezone,
      ),
    0,
  );
  const calendarHours = getCalendarHours(entries, weekDays, timezone);
  const timesheetRows = buildTimesheetRows(entries, weekDays, timezone).slice(0, 18);
  const timerMutationPending = startTimeEntryMutation.isPending || stopTimeEntryMutation.isPending;
  const timerErrorMessage = resolveTimerErrorMessage(
    timeEntriesQuery.error,
    startTimeEntryMutation.error,
    stopTimeEntryMutation.error,
  );

  useEffect(() => {
    if (!runningEntry) {
      return;
    }

    setNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [runningEntry]);

  useEffect(() => {
    if (!selectedEntry?.id) {
      return;
    }

    const refreshedEntry = entries.find((entry) => entry.id === selectedEntry.id);

    if (refreshedEntry) {
      setSelectedEntry(refreshedEntry);
      return;
    }

    if (runningEntry?.id === selectedEntry.id) {
      setSelectedEntry(runningEntry);
    }
  }, [entries, runningEntry, selectedEntry?.id]);

  useEffect(() => {
    setSelectedDescription(selectedEntry?.description ?? "");
    setSelectedProjectId(selectedEntry?.project_id ?? selectedEntry?.pid ?? null);
    setSelectedTagIds(selectedEntry?.tag_ids ?? []);
    setSelectedEntryError(null);
  }, [selectedEntry]);

  async function handleTimerAction() {
    if (runningEntry?.id != null) {
      const runningWorkspaceId = runningEntry.workspace_id ?? runningEntry.wid;
      if (typeof runningWorkspaceId === "number") {
        await stopTimeEntryMutation.mutateAsync({
          timeEntryId: runningEntry.id,
          workspaceId: runningWorkspaceId,
        });
      }
      return;
    }

    await startTimeEntryMutation.mutateAsync({
      description: draftDescription.trim(),
      start: new Date().toISOString(),
    });
    setDraftDescription("");
  }

  async function handleSelectedEntrySave() {
    if (!selectedEntry?.id) {
      return;
    }

    const selectedWorkspaceId = selectedEntry.workspace_id ?? selectedEntry.wid;
    if (typeof selectedWorkspaceId !== "number") {
      setSelectedEntryError("This time entry is missing a workspace and cannot be updated.");
      return;
    }

    try {
      const updatedEntry = await updateTimeEntryMutation.mutateAsync({
        request: {
          billable: selectedEntry.billable,
          description: selectedDescription.trim(),
          projectId: selectedProjectId,
          tagIds: selectedTagIds,
          taskId: selectedEntry.task_id ?? selectedEntry.tid,
        },
        timeEntryId: selectedEntry.id,
        workspaceId: selectedWorkspaceId,
      });
      setSelectedEntry(updatedEntry);
      setSelectedEntryError(null);
    } catch (error) {
      setSelectedEntryError(resolveSingleTimerErrorMessage(error));
    }
  }

  function handleEntryEdit(
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    anchorRect: DOMRect,
  ) {
    setSelectedEntry(entry);
    setSelectedEntryAnchor({
      height: anchorRect.height,
      left: anchorRect.left,
      top: anchorRect.top,
      width: anchorRect.width,
    });
  }

  return (
    <div
      className="w-full min-w-0 bg-[var(--track-surface)] text-white"
      data-testid="tracking-timer-page"
    >
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[84px] flex-wrap items-center gap-x-3 gap-y-3 border-b border-[var(--track-border)] px-5 py-4">
          <div className="min-w-[280px] flex-1 basis-[320px]">
            <label className="sr-only" htmlFor="timer-description">
              Time entry description
            </label>
            <input
              className="h-10 w-full bg-transparent text-[18px] font-medium text-white outline-none placeholder:text-white"
              disabled={Boolean(runningEntry)}
              id="timer-description"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setDraftDescription(event.target.value)
              }
              placeholder="What are you working on?"
              value={runningEntry?.description ?? draftDescription}
            />
          </div>
          <button
            className="flex h-[30px] min-w-0 max-w-[220px] shrink items-center gap-2 rounded-md px-3 text-[12px] text-white"
            type="button"
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: displayColor }}
            />
            <span className="min-w-0 truncate">{displayProject}</span>
          </button>
          <ChromeIconButton icon="tags" />
          <ChromeIconButton icon="subscription" />
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span
              className="text-[29px] font-medium tabular-nums text-white"
              data-testid="timer-elapsed"
            >
              {formatClockDuration(runningDurationSeconds)}
            </span>
            <button
              aria-label={runningEntry ? "Stop timer" : "Start timer"}
              className="flex size-[42px] items-center justify-center rounded-full bg-[#ff7a66] text-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
              data-icon={runningEntry ? "stop" : "play"}
              data-testid="timer-action-button"
              disabled={timerMutationPending}
              onClick={() => {
                void handleTimerAction();
              }}
              type="button"
            >
              <TrackingIcon className="size-5" name={runningEntry ? "stop" : "play"} />
            </button>
          </div>
        </div>

        <div className="px-5 pb-4 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-wrap items-center gap-4">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <button
                  className="flex size-9 items-center justify-center rounded-md border border-[var(--track-border)] bg-[#1b1b1b] text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
                  type="button"
                >
                  <TrackingIcon className="size-3" name="chevron-right" />
                </button>
                <ToolbarButton
                  icon={view === "calendar" ? "calendar" : "list"}
                  label={view === "timesheet" ? "This week" : "Today"}
                  suffix={
                    view === "timesheet"
                      ? `W${resolveIsoWeekNumber()}`
                      : formatWeekday(new Date(), timezone)
                  }
                />
                <button
                  className="flex size-9 items-center justify-center rounded-md border border-[var(--track-border)] bg-[#1b1b1b] text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
                  type="button"
                >
                  <TrackingIcon className="size-3" name="chevron-down" />
                </button>
              </div>
              {view !== "timesheet" ? (
                <SummaryStat label="Today total" value={formatClockDuration(todayTotalSeconds)} />
              ) : null}
              <SummaryStat label="Week total" value={formatClockDuration(weekTotalSeconds)} />
            </div>
            <div className="flex w-full flex-wrap items-center justify-start gap-3 lg:w-auto lg:justify-end">
              <button
                className="flex h-9 items-center gap-2 rounded-md border border-[var(--track-border)] bg-[#1b1b1b] px-3 text-[11px] font-medium text-white"
                type="button"
              >
                <span>Week view</span>
                <TrackingIcon
                  className="size-3 text-[var(--track-text-muted)]"
                  name="chevron-down"
                />
              </button>
              <div className="flex rounded-md border border-[var(--track-border)] bg-[#111111] p-0.5">
                <ViewTab currentView={view} onSelect={setView} targetView="calendar" />
                <ViewTab currentView={view} onSelect={setView} targetView="list" />
                <ViewTab currentView={view} onSelect={setView} targetView="timesheet" />
              </div>
              <ChromeIconButton icon="settings" />
            </div>
          </div>
          {trackStrip.length > 0 ? (
            <div className="mt-4 flex h-[30px] gap-0.5 overflow-hidden">
              {trackStrip.map((item) => (
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

      {timeEntriesQuery.isPending ? <SurfaceMessage message="Loading time entries..." /> : null}
      {timeEntriesQuery.isError ? (
        <SurfaceMessage message={timerErrorMessage} tone="error" />
      ) : null}
      {!timeEntriesQuery.isPending && !timeEntriesQuery.isError && view === "list" ? (
        <ListView groups={groupedEntries} onEditEntry={handleEntryEdit} timezone={timezone} />
      ) : null}
      {!timeEntriesQuery.isPending && !timeEntriesQuery.isError && view === "calendar" ? (
        <CalendarView
          entries={entries}
          hours={calendarHours}
          onEditEntry={handleEntryEdit}
          timezone={timezone}
          weekDays={weekDays}
        />
      ) : null}
      {!timeEntriesQuery.isPending && !timeEntriesQuery.isError && view === "timesheet" ? (
        <TimesheetView rows={timesheetRows} timezone={timezone} weekDays={weekDays} />
      ) : null}
      {selectedEntry && selectedEntryAnchor ? (
        <TimeEntryEditorDialog
          anchor={selectedEntryAnchor}
          description={selectedDescription}
          entry={selectedEntry}
          isSaving={updateTimeEntryMutation.isPending}
          onClose={() => {
            setSelectedEntry(null);
            setSelectedEntryAnchor(null);
            setSelectedEntryError(null);
          }}
          onDescriptionChange={setSelectedDescription}
          onProjectSelect={setSelectedProjectId}
          onSave={() => {
            void handleSelectedEntrySave();
          }}
          onTagToggle={(tagId) => {
            setSelectedTagIds((current) =>
              current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
            );
          }}
          projects={projectOptions
            .filter((project) => project.id != null)
            .map((project) => ({
              clientName: project.client_name ?? undefined,
              color: resolveProjectColor(project),
              id: project.id as number,
              name: project.name ?? "Untitled project",
            }))}
          saveError={selectedEntryError}
          selectedProjectId={selectedProjectId}
          selectedTagIds={selectedTagIds}
          tags={tagOptions}
          timezone={timezone}
          workspaceName={session.currentWorkspace.name}
        />
      ) : null}
    </div>
  );
}

function resolveTimerErrorMessage(
  timeEntriesError: unknown,
  startTimerError: unknown,
  stopTimerError: unknown,
): string {
  const failure = [startTimerError, stopTimerError, timeEntriesError].find(
    (candidate) => candidate instanceof WebApiError,
  );

  if (failure instanceof WebApiError) {
    return failure.message;
  }

  return "We could not load or update time entries right now.";
}

function resolveSingleTimerErrorMessage(error: unknown): string {
  if (error instanceof WebApiError) {
    if (typeof error.data === "string" && error.data.trim()) {
      return error.data;
    }

    if (
      error.data &&
      typeof error.data === "object" &&
      "message" in error.data &&
      typeof error.data.message === "string"
    ) {
      return error.data.message;
    }

    return error.message;
  }

  return "We could not update this time entry right now.";
}

function normalizeProjects(data: unknown): GithubComTogglTogglApiInternalModelsProject[] {
  if (Array.isArray(data)) {
    return data.filter((project): project is GithubComTogglTogglApiInternalModelsProject =>
      Boolean(project && typeof project === "object" && "id" in project),
    );
  }

  if (hasProjectArray(data, "projects")) {
    return data.projects;
  }

  if (hasProjectArray(data, "data")) {
    return data.data;
  }

  return [];
}

function hasProjectArray(
  value: unknown,
  key: "data" | "projects",
): value is Record<typeof key, GithubComTogglTogglApiInternalModelsProject[]> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>)[key])
  );
}

function normalizeTags(data: unknown): { id: number; name: string }[] {
  if (Array.isArray(data)) {
    return data.filter((tag): tag is { id: number; name: string } =>
      Boolean(tag && typeof tag === "object" && "id" in tag && "name" in tag),
    );
  }

  if (hasTagArray(data, "tags")) {
    return data.tags;
  }

  if (hasTagArray(data, "data")) {
    return data.data;
  }

  return [];
}

function hasTagArray(
  value: unknown,
  key: "data" | "tags",
): value is Record<typeof key, { id: number; name: string }[]> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>)[key])
  );
}

function resolveProjectColor(project: GithubComTogglTogglApiInternalModelsProject): string {
  return project.color || "#5fb0ff";
}

function formatTrackQueryDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function resolveIsoWeekNumber(): number {
  const now = new Date();
  const utcDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));

  return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
