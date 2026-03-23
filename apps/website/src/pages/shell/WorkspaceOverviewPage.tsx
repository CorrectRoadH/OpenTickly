import { Fragment, type ReactElement } from "react";
import { Link } from "@tanstack/react-router";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  buildEntryGroups,
  buildTimesheetRows,
  filterWorkspaceEntries,
  formatClockDuration,
  formatEntryRange,
  formatGroupLabel,
  formatHours,
  formatWeekday,
  getCalendarHours,
  getCurrentWeekDays,
  matchesWorkspace,
  resolveEntryColor,
  resolveEntryDurationSeconds,
  sortTimeEntries,
  summarizeProjects,
  sumForDate,
  type EntryGroup,
  type TimesheetRow,
} from "../../features/tracking/overview-data.ts";
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
  const trackStrip = summarizeProjects(entries).slice(0, 10);
  const todayTotalSeconds = sumForDate(
    entries,
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    }).format(new Date()),
    timezone,
  );
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
    <div className="min-w-[1180px] bg-[var(--track-surface)] text-white">
      <header className="border-b border-[var(--track-border)]">
        <div className="flex h-[84px] items-center gap-4 border-b border-[var(--track-border)] px-5">
          <div className="min-w-0 flex-1 text-[18px] font-medium text-white">{pageTitle}</div>
          <button
            className="flex h-[30px] items-center gap-2 rounded-md px-3 text-[14px] text-white"
            type="button"
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: displayColor }} />
            <span>{displayProject}</span>
          </button>
          <ChromeIconButton icon="tags" />
          <ChromeIconButton icon="subscription" />
          <div className="flex items-center gap-3 rounded-full text-[29px] font-medium tabular-nums text-white">
            <span>
              {formatClockDuration(resolveEntryDurationSeconds(runningEntry ?? { duration: 0 }))}
            </span>
            <button
              className="flex size-[42px] items-center justify-center rounded-full bg-[#ff7c66] text-black"
              type="button"
            >
              <TrackingIcon className="size-5" name="play-stop" />
            </button>
          </div>
          <ChromeIconButton icon="more" />
        </div>

        <div className="px-5 pb-4 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ToolbarButton
                icon={view === "calendar" ? "calendar" : "list"}
                label={view === "timesheet" ? "This week" : "Today"}
                suffix={formatWeekday(new Date(), timezone)}
              />
              {view !== "timesheet" ? (
                <SummaryStat label="Today" value={formatClockDuration(todayTotalSeconds)} />
              ) : null}
              <SummaryStat label="Week total" value={formatClockDuration(weekTotalSeconds)} />
            </div>
            <div className="flex items-center gap-3">
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
                <div key={item.label} className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-medium" style={{ color: item.color }}>
                    {item.label}
                  </div>
                  <div className="mt-1 h-1 rounded-full" style={{ backgroundColor: item.color }} />
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
        <div className="border-t border-[var(--track-border)] px-5 py-10">
          <button
            className="mx-auto flex h-9 items-center rounded-md bg-[var(--track-accent-soft)] px-5 text-[13px] font-medium text-[var(--track-accent-text)]"
            type="button"
          >
            View full history in reports
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ListView({ groups, timezone }: { groups: EntryGroup[]; timezone: string }): ReactElement {
  if (groups.length === 0) {
    return <SurfaceMessage message="No time entries in this workspace yet." />;
  }

  return (
    <div>
      {groups.map((group) => (
        <section key={group.key}>
          <div className="grid grid-cols-[32px_minmax(0,1fr)_110px_126px_82px_40px_30px] items-center border-b border-[var(--track-border)] px-5 py-[13px]">
            <span className="size-[14px] rounded-[4px] border border-[var(--track-border)]" />
            <p className="text-[14px] font-semibold text-white">
              {formatGroupLabel(group.key, timezone)}
            </p>
            <span />
            <span />
            <p className="text-right text-[14px] font-medium tabular-nums text-white">
              {formatClockDuration(group.totalSeconds)}
            </p>
            <span />
            <span />
          </div>
          {group.entries.map((entry) => (
            <div
              key={String(entry.id ?? `${entry.start}-${entry.description}`)}
              className="grid grid-cols-[32px_minmax(0,1fr)_110px_126px_82px_40px_30px] items-center border-b border-[var(--track-border)] px-5 py-[13px] text-[13px]"
            >
              <span />
              <div className="min-w-0">
                <p className="truncate text-[13px] text-[#efefef]">
                  {entry.description?.trim() || "(no description)"}
                </p>
                <p
                  className="mt-1 truncate text-[12px]"
                  style={{ color: resolveEntryColor(entry) }}
                >
                  {entry.project_name ?? "(No project)"}
                </p>
              </div>
              <p className="truncate text-[12px] text-[var(--track-text-muted)]">
                {entry.shared_with?.length ? `${entry.shared_with.length} shared` : ""}
              </p>
              <p className="text-right tabular-nums text-[12px] text-[var(--track-text-muted)]">
                {formatEntryRange(entry, timezone)}
              </p>
              <p className="text-right tabular-nums text-[12px] text-white">
                {formatClockDuration(resolveEntryDurationSeconds(entry))}
              </p>
              <div className="flex justify-center text-[var(--track-text-muted)]">
                <TrackingIcon className="size-4" name="edit" />
              </div>
              <div className="flex justify-end text-[var(--track-text-muted)]">
                <TrackingIcon className="size-4" name="more" />
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function CalendarView({
  entries,
  hours,
  timezone,
  weekDays,
}: {
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  hours: number[];
  timezone: string;
  weekDays: Date[];
}): ReactElement {
  return (
    <div className="grid grid-cols-[42px_repeat(7,minmax(160px,1fr))] border-t border-[var(--track-border)]">
      <div className="border-r border-[var(--track-border)]" />
      {weekDays.map((day) => (
        <div
          key={day.toISOString()}
          className="border-l border-b border-[var(--track-border)] px-3 py-3"
        >
          <p className="text-[28px] font-semibold text-white">{day.getDate()}</p>
          <p className="text-[12px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
            {formatWeekday(day, timezone)}
          </p>
        </div>
      ))}
      {hours.map((hour) => (
        <Fragment key={hour}>
          <div className="border-r border-b border-[var(--track-border)] px-2 py-5 text-right text-[11px] text-[var(--track-text-muted)]">
            {String(hour).padStart(2, "0")}:00
          </div>
          {weekDays.map((day) => (
            <div
              key={`${day.toISOString()}-${hour}`}
              className="min-h-24 border-l border-b border-[var(--track-border)] px-1 py-1"
            >
              {entries
                .filter(
                  (entry) =>
                    formatWeekday(new Date(entry.start ?? entry.at ?? Date.now()), timezone) ===
                    formatWeekday(day, timezone),
                )
                .slice(0, 2)
                .map((entry) => (
                  <div
                    key={String(entry.id ?? `${entry.start}-${entry.description}`)}
                    className="mb-1 rounded-[4px] px-2 py-1 text-[11px] leading-4 text-black"
                    style={{ backgroundColor: resolveEntryColor(entry) }}
                  >
                    <p className="truncate">
                      {entry.description?.trim() || entry.project_name || "Entry"}
                    </p>
                    <p className="truncate text-black/70">
                      {formatClockDuration(resolveEntryDurationSeconds(entry))}
                    </p>
                  </div>
                ))}
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  );
}

function TimesheetView({
  rows,
  timezone,
  weekDays,
}: {
  rows: TimesheetRow[];
  timezone: string;
  weekDays: Date[];
}): ReactElement {
  const totals = weekDays.map((_, index) =>
    rows.reduce((sum, row) => sum + (row.cells[index] ?? 0), 0),
  );
  const weekTotal = rows.reduce((sum, row) => sum + row.totalSeconds, 0);
  if (rows.length === 0)
    return <SurfaceMessage message="No week data available for this workspace." />;

  return (
    <div className="px-5">
      <div className="grid grid-cols-[minmax(280px,1fr)_repeat(7,55px)_72px] border-b border-[var(--track-border)] py-4 text-[10px] uppercase tracking-[0.06em] text-[var(--track-text-muted)]">
        <span>Project</span>
        {weekDays.map((day) => (
          <span key={day.toISOString()} className="text-center">
            {formatWeekday(day, timezone)}
          </span>
        ))}
        <span className="text-right">Total</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[minmax(280px,1fr)_repeat(7,55px)_72px] items-center border-b border-[var(--track-border)] py-3"
        >
          <div className="min-w-0 pr-3">
            <p className="truncate text-[13px] font-medium" style={{ color: row.color }}>
              {row.label}
            </p>
            <p className="mt-1 text-[12px] text-[var(--track-text-muted)]">
              {row.members > 0 ? `${row.members} shared` : "Private"}
            </p>
          </div>
          {row.cells.map((value, index) => (
            <div key={`${row.label}-${index}`} className="flex justify-center">
              <span className="min-w-[35px] rounded-[6px] border border-[var(--track-border)] px-1.5 py-0.5 text-center text-[12px] tabular-nums text-white">
                {value > 0 ? formatHours(value).replace(" h", "") : ""}
              </span>
            </div>
          ))}
          <p className="text-right text-[12px] tabular-nums text-white">
            {formatHours(row.totalSeconds)}
          </p>
        </div>
      ))}
      <div className="grid grid-cols-[minmax(280px,1fr)_repeat(7,55px)_72px] items-center py-4 text-[12px] font-medium text-white">
        <span>Total</span>
        {totals.map((value, index) => (
          <span key={index} className="text-center tabular-nums">
            {value > 0 ? formatHours(value).replace(" h", "") : "-"}
          </span>
        ))}
        <span className="text-right tabular-nums">{formatHours(weekTotal)}</span>
      </div>
    </div>
  );
}

function ViewTab({
  currentView,
  targetView,
  workspaceId,
}: {
  currentView: ShellViewMode;
  targetView: ShellViewMode;
  workspaceId: number;
}) {
  return (
    <Link
      className={`rounded-[4px] px-4 py-1.5 text-[12px] font-medium ${currentView === targetView ? "bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]" : "text-white"}`}
      params={{ workspaceId: String(workspaceId) }}
      search={{ view: targetView }}
      to="/workspaces/$workspaceId"
    >
      {{ calendar: "Calendar", list: "List view", timesheet: "Timesheet" }[targetView]}
    </Link>
  );
}

function ToolbarButton({
  icon,
  label,
  suffix,
}: {
  icon: "calendar" | "list";
  label: string;
  suffix: string;
}) {
  return (
    <button
      className="flex h-9 items-center gap-2 rounded-md border border-[var(--track-border)] bg-[#181818] px-4 text-[13px] text-white"
      type="button"
    >
      <TrackingIcon className="size-4 text-[var(--track-text-muted)]" name={icon} />
      <span>{label}</span>
      <span className="text-[var(--track-text-muted)]">· {suffix}</span>
    </button>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--track-text-muted)]">
      {label} <span className="ml-2 text-[12px] font-medium tabular-nums text-white">{value}</span>
    </p>
  );
}

function ChromeIconButton({
  icon,
}: {
  icon: "grid" | "more" | "settings" | "subscription" | "tags";
}) {
  return (
    <button
      className="flex size-[30px] items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[#222222] hover:text-white"
      type="button"
    >
      <TrackingIcon className="size-4" name={icon} />
    </button>
  );
}

function SurfaceMessage({
  message,
  tone = "muted",
}: {
  message: string;
  tone?: "error" | "muted";
}) {
  return (
    <div
      className={`border-t border-[var(--track-border)] px-5 py-6 text-sm ${tone === "error" ? "text-rose-300" : "text-[var(--track-text-muted)]"}`}
    >
      {message}
    </div>
  );
}
