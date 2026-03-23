import { type ReactElement } from "react";

import {
  buildEntryGroups,
  buildTimesheetRows,
  filterWorkspaceEntries,
  formatClockDuration,
  formatWeekday,
  getCalendarHours,
  getCurrentWeekDays,
  matchesWorkspace,
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
import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import { useCurrentTimeEntryQuery, useTimeEntriesQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import type { ShellViewMode } from "../../shared/url-state/shell-view.ts";

type WorkspaceOverviewPageProps = {
  view: ShellViewMode;
};

export function WorkspaceOverviewPage({ view }: WorkspaceOverviewPageProps): ReactElement {
  const session = useSession();
  const timeEntriesQuery = useTimeEntriesQuery();
  const currentTimeEntryQuery = useCurrentTimeEntryQuery();
  const timezone = session.user.timezone || "UTC";
  const entries = sortTimeEntries(
    filterWorkspaceEntries(timeEntriesQuery.data ?? [], session.currentWorkspace.id),
  );
  const runningEntry = matchesWorkspace(currentTimeEntryQuery.data, session.currentWorkspace.id)
    ? currentTimeEntryQuery.data
    : undefined;
  const pageTitle =
    runningEntry?.description?.trim() ||
    entries.find((entry) => entry.description?.trim())?.description?.trim() ||
    "What are you working on?";
  const displayProject =
    runningEntry?.project_name ||
    entries.find((entry) => entry.project_name)?.project_name ||
    "No project";
  const displayColor = resolveEntryColor(runningEntry ?? entries[0] ?? {});
  const weekDays = getCurrentWeekDays();
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

  return (
    <div
      className="min-w-[1384px] bg-[var(--track-surface)] text-white"
      data-testid="tracking-overview-page"
    >
      <header className="border-b border-[var(--track-border)]">
        <div className="flex h-[84px] items-center gap-3 border-b border-[var(--track-border)] px-5">
          <div className="min-w-0 flex-1 text-[18px] font-medium text-white">{pageTitle}</div>
          <button
            className="flex h-[30px] items-center gap-2 rounded-md px-3 text-[12px] text-white"
            type="button"
          >
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: displayColor }}
            />
            <span className="truncate">{displayProject}</span>
          </button>
          <ChromeIconButton icon="tags" />
          <ChromeIconButton icon="subscription" />
          <div className="ml-1 flex items-center gap-3">
            <span className="text-[29px] font-medium tabular-nums text-white">
              {formatClockDuration(resolveEntryDurationSeconds(runningEntry ?? { duration: 0 }))}
            </span>
            <button
              className="flex size-[42px] items-center justify-center rounded-full bg-[#ff7a66] text-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
              type="button"
            >
              <TrackingIcon className="size-5" name="play-stop" />
            </button>
          </div>
          <ChromeIconButton icon="more" />
        </div>

        <div className="px-5 pb-4 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-3">
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
                <ViewTab
                  currentView={view}
                  targetView="calendar"
                  workspaceId={session.currentWorkspace.id}
                />
                <ViewTab
                  currentView={view}
                  targetView="list"
                  workspaceId={session.currentWorkspace.id}
                />
                <ViewTab
                  currentView={view}
                  targetView="timesheet"
                  workspaceId={session.currentWorkspace.id}
                />
              </div>
              <ChromeIconButton icon="settings" />
              <ChromeIconButton icon="grid" />
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
        <SurfaceMessage message="Time entries are temporarily unavailable." tone="error" />
      ) : null}
      {!timeEntriesQuery.isPending && !timeEntriesQuery.isError && view === "list" ? (
        <ListView groups={groupedEntries} timezone={timezone} />
      ) : null}
      {!timeEntriesQuery.isPending && !timeEntriesQuery.isError && view === "calendar" ? (
        <CalendarView
          entries={entries}
          hours={calendarHours}
          timezone={timezone}
          weekDays={weekDays}
        />
      ) : null}
      {!timeEntriesQuery.isPending && !timeEntriesQuery.isError && view === "timesheet" ? (
        <TimesheetView rows={timesheetRows} timezone={timezone} weekDays={weekDays} />
      ) : null}

      {!timeEntriesQuery.isPending && !timeEntriesQuery.isError ? (
        <div className="border-t border-[var(--track-border)] px-5 py-6">
          <button
            className="mx-auto flex h-8 items-center rounded-md bg-[var(--track-accent-soft)] px-5 text-[11px] font-medium text-[var(--track-accent-text)]"
            type="button"
          >
            View full history in reports
          </button>
        </div>
      ) : null}
    </div>
  );
}

function resolveIsoWeekNumber() {
  const current = new Date();
  const date = new Date(Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));

  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
