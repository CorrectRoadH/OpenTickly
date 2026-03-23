import { Fragment, type ReactElement } from "react";
import { Link } from "@tanstack/react-router";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { useCurrentTimeEntryQuery, useTimeEntriesQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import type { ShellViewMode } from "../../shared/url-state/shell-view.ts";

type WorkspaceOverviewPageProps = {
  view: ShellViewMode;
};

type EntryGroup = {
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  key: string;
  totalSeconds: number;
};

type ProjectSummary = {
  color: string;
  label: string;
  totalSeconds: number;
};

type TimesheetRow = {
  cells: number[];
  color: string;
  label: string;
  members: number;
  totalSeconds: number;
};

export function WorkspaceOverviewPage({ view }: WorkspaceOverviewPageProps): ReactElement {
  const session = useSession();
  const timezone = session.user.timezone || "UTC";
  const weekDays = getCurrentWeekDays();
  const weekRange = {
    endDate: formatApiDate(weekDays[6]!),
    startDate: formatApiDate(weekDays[0]!),
  };
  const timeEntriesQuery = useTimeEntriesQuery({
    includeSharing: true,
    ...(view === "list" ? {} : weekRange),
  });
  const currentTimeEntryQuery = useCurrentTimeEntryQuery();
  const entries = sortTimeEntries(
    filterWorkspaceEntries(timeEntriesQuery.data ?? [], session.currentWorkspace.id),
  );
  const runningEntry = matchesWorkspace(currentTimeEntryQuery.data, session.currentWorkspace.id)
    ? currentTimeEntryQuery.data
    : undefined;
  const pageTitle =
    runningEntry?.description?.trim() ||
    entries.find((entry) => entry.description?.trim())?.description?.trim() ||
    "Time entries";
  const groupedEntries = buildEntryGroups(entries, timezone);
  const trackStrip = summarizeProjects(entries).slice(0, 6);
  const todayTotalSeconds = sumForDate(entries, formatDateKey(new Date(), timezone), timezone);
  const weekTotalSeconds = weekDays.reduce(
    (total, day) => total + sumForDate(entries, formatDateKey(day, timezone), timezone),
    0,
  );
  const calendarHours = getCalendarHours(entries, weekDays, timezone);
  const timesheetRows = buildTimesheetRows(entries, weekDays, timezone).slice(0, 12);
  const isPending = timeEntriesQuery.isPending;
  const isError = timeEntriesQuery.isError;

  return (
    <div className="min-w-[1080px] border-t border-white/8">
      <header className="border-b border-white/8 px-4 py-4">
        <h1 className="text-[30px] font-semibold text-white">{pageTitle}</h1>
      </header>

      <section className="border-b border-white/8 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ToolbarField label={view === "list" ? "All dates" : "This week"} />
            <Metric
              label="Today"
              value={formatClockDuration(todayTotalSeconds)}
              visible={view === "list"}
            />
            <Metric label="Week total" value={formatClockDuration(weekTotalSeconds)} />
          </div>
          <div className="flex items-center gap-3">
            {view === "calendar" ? (
              <p className="text-sm font-medium text-slate-300">Week view</p>
            ) : null}
            <div className="flex overflow-hidden rounded-md border border-white/12">
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
            <SquareIcon />
            <SquareIcon />
          </div>
        </div>
      </section>

      {trackStrip.length > 0 ? (
        <section className="border-b border-white/8 px-4 py-2">
          <div className="flex gap-4 overflow-hidden text-[12px] font-medium text-slate-300">
            {trackStrip.map((item) => (
              <div key={item.label} className="min-w-0 flex-1">
                <p className="truncate" style={{ color: item.color }}>
                  {item.label}
                </p>
                <div
                  className="mt-1 h-[3px] rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {isPending ? <SurfaceMessage message="Loading time entries..." /> : null}
      {isError ? (
        <SurfaceMessage message="Time entries are temporarily unavailable." tone="error" />
      ) : null}
      {!isPending && !isError && view === "list" ? (
        <ListView groups={groupedEntries} timezone={timezone} />
      ) : null}
      {!isPending && !isError && view === "calendar" ? (
        <CalendarView
          entries={entries}
          hours={calendarHours}
          timezone={timezone}
          weekDays={weekDays}
        />
      ) : null}
      {!isPending && !isError && view === "timesheet" ? (
        <TimesheetView rows={timesheetRows} timezone={timezone} weekDays={weekDays} />
      ) : null}
    </div>
  );
}

function ToolbarField({ label }: { label: string }): ReactElement {
  return (
    <button
      className="flex h-10 min-w-[240px] items-center justify-center rounded-md border border-white/12 bg-[#1b1b1d] px-4 text-sm font-medium text-white"
      type="button"
    >
      {label}
    </button>
  );
}

function Metric({
  label,
  value,
  visible = true,
}: {
  label: string;
  value: string;
  visible?: boolean;
}): ReactElement | null {
  if (!visible) {
    return null;
  }

  return (
    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400">
      {label}
      <span className="ml-2 text-[15px] text-slate-200">{value}</span>
    </p>
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
}): ReactElement {
  const active = currentView === targetView;
  const labels: Record<ShellViewMode, string> = {
    calendar: "Calendar",
    list: "List view",
    timesheet: "Timesheet",
  };

  return (
    <Link
      className={`px-5 py-2 text-sm font-medium ${
        active ? "bg-[#613766] text-[#e5b8ef]" : "bg-[#1b1b1d] text-white"
      }`}
      params={{ workspaceId: String(workspaceId) }}
      search={{ view: targetView }}
      to="/workspaces/$workspaceId"
    >
      {labels[targetView]}
    </Link>
  );
}

function SquareIcon(): ReactElement {
  return <div className="size-5 rounded-sm border border-white/12 bg-[#1b1b1d]" />;
}

function SurfaceMessage({
  message,
  tone = "muted",
}: {
  message: string;
  tone?: "error" | "muted";
}): ReactElement {
  return (
    <div
      className={`border-b border-white/8 px-4 py-5 text-sm ${tone === "error" ? "text-rose-200" : "text-slate-400"}`}
    >
      {message}
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
          <div className="grid grid-cols-[40px_minmax(0,1fr)_72px_128px_92px] items-center border-b border-white/8 px-4 py-3">
            <div className="size-3 rounded-sm border border-white/18" />
            <p className="text-[15px] font-semibold text-white">
              {formatGroupLabel(group.key, timezone)}
            </p>
            <span />
            <span />
            <p className="text-right text-[24px] font-semibold tabular-nums text-[#d8d4ce]">
              {formatClockDuration(group.totalSeconds)}
            </p>
          </div>
          {group.entries.map((entry) => (
            <div
              key={String(entry.id ?? `${entry.start}-${entry.description}`)}
              className="grid grid-cols-[40px_minmax(0,1fr)_72px_128px_92px] items-center border-b border-white/6 px-4 py-3 text-sm"
            >
              <span />
              <div className="min-w-0">
                <p className="truncate text-[15px] text-[#ece7df]">
                  {entry.description?.trim() || "(no description)"}
                </p>
                <p className="mt-1 truncate text-[12px] text-slate-400">
                  <span className="mr-2" style={{ color: resolveEntryColor(entry) }}>
                    {entry.project_name ?? "No project"}
                  </span>
                  {entry.tags?.length ? entry.tags.join(" · ") : (entry.client_name ?? "No client")}
                </p>
              </div>
              <p className="text-slate-400">
                {entry.shared_with?.length ? `${entry.shared_with.length} shared` : "-"}
              </p>
              <p className="text-right tabular-nums text-slate-300">
                {formatEntryRange(entry, timezone)}
              </p>
              <p className="text-right font-semibold tabular-nums text-[#ebe6de]">
                {formatClockDuration(resolveEntryDurationSeconds(entry))}
              </p>
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
    <div className="grid grid-cols-[42px_repeat(7,minmax(0,1fr))]">
      <div className="border-r border-white/8" />
      {weekDays.map((day) => (
        <div key={day.toISOString()} className="border-l border-b border-white/8 px-3 py-2">
          <p className="text-[28px] font-semibold text-white">{day.getDate()}</p>
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-slate-400">
            {formatWeekday(day, timezone)}
          </p>
        </div>
      ))}
      {hours.map((hour) => (
        <Fragment key={hour}>
          <div className="border-r border-b border-white/8 px-2 py-5 text-right text-[11px] text-slate-500">
            {String(hour).padStart(2, "0")}:00
          </div>
          {weekDays.map((day) => {
            const dayKey = formatDateKey(day, timezone);
            const hourEntries = entries.filter(
              (entry) =>
                formatDateKey(new Date(entry.start ?? entry.at ?? Date.now()), timezone) ===
                  dayKey &&
                getHourInTimezone(new Date(entry.start ?? entry.at ?? Date.now()), timezone) ===
                  hour,
            );

            return (
              <div key={`${dayKey}-${hour}`} className="border-l border-b border-white/8 px-1 py-1">
                {hourEntries.map((entry) => (
                  <div
                    key={String(entry.id ?? `${entry.start}-${entry.description}`)}
                    className="mb-1 rounded-sm px-2 py-1 text-[11px] leading-4 text-white"
                    style={{ backgroundColor: resolveEntryColor(entry) }}
                  >
                    <p className="truncate">
                      {entry.description?.trim() || entry.project_name || "Entry"}
                    </p>
                    <p className="truncate text-white/70">
                      {formatClockDuration(resolveEntryDurationSeconds(entry))}
                    </p>
                  </div>
                ))}
              </div>
            );
          })}
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
  const dayTotals = weekDays.map((_, dayIndex) =>
    rows.reduce((total, row) => total + (row.cells[dayIndex] ?? 0), 0),
  );
  const weekTotal = rows.reduce((total, row) => total + row.totalSeconds, 0);

  if (rows.length === 0) {
    return <SurfaceMessage message="No week data available for this workspace." />;
  }

  return (
    <div className="px-4">
      <div className="grid grid-cols-[minmax(0,360px)_repeat(7,74px)_80px] border-b border-white/8 py-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
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
          className="grid grid-cols-[minmax(0,360px)_repeat(7,74px)_80px] items-center border-b border-white/8 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" style={{ color: row.color }}>
              {row.label}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {row.members > 0 ? `${row.members} shared` : "Private"}
            </p>
          </div>
          {row.cells.map((value, index) => (
            <div key={`${row.label}-${index}`} className="flex justify-center">
              <span className="min-w-[48px] rounded-md border border-white/14 px-2 py-1 text-center text-sm tabular-nums text-slate-200">
                {value > 0 ? formatHours(value) : ""}
              </span>
            </div>
          ))}
          <p className="text-right text-sm font-semibold tabular-nums text-[#ece7df]">
            {formatHours(row.totalSeconds)}
          </p>
        </div>
      ))}
      <div className="grid grid-cols-[minmax(0,360px)_repeat(7,74px)_80px] items-center py-4 text-sm font-semibold text-[#ece7df]">
        <p>Total</p>
        {dayTotals.map((value, index) => (
          <p key={index} className="text-center tabular-nums">
            {value > 0 ? formatHours(value) : "-"}
          </p>
        ))}
        <p className="text-right tabular-nums">{formatHours(weekTotal)}</p>
      </div>
    </div>
  );
}

function filterWorkspaceEntries(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
  workspaceId: number,
): GithubComTogglTogglApiInternalModelsTimeEntry[] {
  return entries.filter((entry) => matchesWorkspace(entry, workspaceId));
}

function matchesWorkspace(
  entry: GithubComTogglTogglApiInternalModelsTimeEntry | undefined,
  workspaceId: number,
): boolean {
  if (!entry) {
    return false;
  }

  return (entry.workspace_id ?? entry.wid) === workspaceId;
}

function sortTimeEntries(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
): GithubComTogglTogglApiInternalModelsTimeEntry[] {
  return [...entries].sort((left, right) => {
    const leftTime = new Date(left.start ?? left.at ?? 0).getTime();
    const rightTime = new Date(right.start ?? right.at ?? 0).getTime();
    return rightTime - leftTime;
  });
}

function buildEntryGroups(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
  timezone: string,
): EntryGroup[] {
  const groups = new Map<string, EntryGroup>();

  for (const entry of entries) {
    const key = formatDateKey(new Date(entry.start ?? entry.at ?? Date.now()), timezone);
    const existing = groups.get(key);
    const durationSeconds = resolveEntryDurationSeconds(entry);

    if (existing) {
      existing.entries.push(entry);
      existing.totalSeconds += durationSeconds;
      continue;
    }

    groups.set(key, {
      entries: [entry],
      key,
      totalSeconds: durationSeconds,
    });
  }

  return [...groups.values()];
}

function summarizeProjects(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
): ProjectSummary[] {
  const summaries = new Map<string, ProjectSummary>();

  for (const entry of entries) {
    const label = entry.project_name ?? "No project";
    const existing = summaries.get(label);
    const totalSeconds = resolveEntryDurationSeconds(entry);

    if (existing) {
      existing.totalSeconds += totalSeconds;
      continue;
    }

    summaries.set(label, {
      color: resolveEntryColor(entry),
      label,
      totalSeconds,
    });
  }

  return [...summaries.values()].sort((left, right) => right.totalSeconds - left.totalSeconds);
}

function buildTimesheetRows(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
  weekDays: Date[],
  timezone: string,
): TimesheetRow[] {
  const rowMap = new Map<string, TimesheetRow>();

  for (const entry of entries) {
    const dayIndex = weekDays.findIndex(
      (day) =>
        formatDateKey(day, timezone) ===
        formatDateKey(new Date(entry.start ?? entry.at ?? Date.now()), timezone),
    );

    if (dayIndex < 0) {
      continue;
    }

    const label = entry.project_name ?? "No project";
    const existing = rowMap.get(label);
    const durationSeconds = resolveEntryDurationSeconds(entry);

    if (existing) {
      existing.cells[dayIndex] += durationSeconds;
      existing.totalSeconds += durationSeconds;
      existing.members = Math.max(existing.members, entry.shared_with?.length ?? 0);
      continue;
    }

    const cells = new Array(7).fill(0);
    cells[dayIndex] = durationSeconds;
    rowMap.set(label, {
      cells,
      color: resolveEntryColor(entry),
      label,
      members: entry.shared_with?.length ?? 0,
      totalSeconds: durationSeconds,
    });
  }

  return [...rowMap.values()].sort((left, right) => right.totalSeconds - left.totalSeconds);
}

function sumForDate(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
  dateKey: string,
  timezone: string,
): number {
  return entries.reduce((total, entry) => {
    const entryKey = formatDateKey(new Date(entry.start ?? entry.at ?? Date.now()), timezone);
    return entryKey === dateKey ? total + resolveEntryDurationSeconds(entry) : total;
  }, 0);
}

function getCurrentWeekDays(): Date[] {
  const today = new Date();
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayIndex = midnight.getDay() === 0 ? 6 : midnight.getDay() - 1;
  const monday = new Date(midnight);
  monday.setDate(midnight.getDate() - dayIndex);

  return new Array(7).fill(null).map((_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
}

function getCalendarHours(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
  weekDays: Date[],
  timezone: string,
): number[] {
  const hours = entries
    .filter((entry) =>
      weekDays.some(
        (day) =>
          formatDateKey(day, timezone) ===
          formatDateKey(new Date(entry.start ?? entry.at ?? Date.now()), timezone),
      ),
    )
    .map((entry) => getHourInTimezone(new Date(entry.start ?? entry.at ?? Date.now()), timezone));

  if (hours.length === 0) {
    return [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  }

  const minHour = Math.max(0, Math.min(...hours) - 1);
  const maxHour = Math.min(23, Math.max(...hours) + 1);
  return new Array(maxHour - minHour + 1).fill(null).map((_, index) => minHour + index);
}

function resolveEntryDurationSeconds(entry: GithubComTogglTogglApiInternalModelsTimeEntry): number {
  if (typeof entry.duration === "number") {
    if (entry.duration >= 0) {
      return entry.duration;
    }

    return Math.max(0, Math.floor(Date.now() / 1000) + entry.duration);
  }

  if (entry.start && entry.stop) {
    return Math.max(
      0,
      Math.floor((new Date(entry.stop).getTime() - new Date(entry.start).getTime()) / 1000),
    );
  }

  return 0;
}

function formatDateKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).format(date);
}

function formatApiDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatWeekday(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(date);
}

function formatGroupLabel(dateKey: string, timezone: string): string {
  const today = formatDateKey(new Date(), timezone);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = formatDateKey(yesterdayDate, timezone);

  if (dateKey === today) {
    return "Today";
  }

  if (dateKey === yesterday) {
    return "Yesterday";
  }

  return dateKey;
}

function formatEntryRange(
  entry: GithubComTogglTogglApiInternalModelsTimeEntry,
  timezone: string,
): string {
  if (!entry.start) {
    return "-";
  }

  const start = formatClockTime(new Date(entry.start), timezone);
  const stop = entry.stop ? formatClockTime(new Date(entry.stop), timezone) : "...";
  return `${start} - ${stop}`;
}

function formatClockTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

function getHourInTimezone(date: Date, timezone: string): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: timezone,
    }).format(date),
  );
}

function formatClockDuration(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;

  return [hours, minutes, remainder].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatHours(seconds: number): string {
  return `${(seconds / 3600).toFixed(1)} h`;
}

function resolveEntryColor(entry: GithubComTogglTogglApiInternalModelsTimeEntry): string {
  if (entry.project_color?.trim()) {
    return entry.project_color;
  }

  const palette = ["#d96aa7", "#d65143", "#d7c44d", "#6aa2e5", "#7dc27d", "#c6bb5a"];
  const seed = String(entry.project_id ?? entry.project_name ?? entry.id ?? "entry");
  const hash = [...seed].reduce((total, character) => total + character.charCodeAt(0), 0);
  return palette[hash % palette.length]!;
}
