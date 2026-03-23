import { Link } from "@tanstack/react-router";
import { type ReactElement } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import type { ShellViewMode } from "../../shared/url-state/shell-view.ts";
import {
  formatClockDuration,
  formatClockTime,
  formatEntryRange,
  formatGroupLabel,
  formatHours,
  formatWeekday,
  resolveEntryColor,
  resolveEntryDurationSeconds,
  type EntryGroup,
  type TimesheetRow,
} from "./overview-data.ts";
import { TrackingIcon } from "./tracking-icons.tsx";

const CALENDAR_HOUR_HEIGHT = 60;
const CALENDAR_TOTAL_HEIGHT = CALENDAR_HOUR_HEIGHT * 24;

export function ToolbarButton({
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
      className="flex h-9 items-center gap-2 rounded-md border border-[var(--track-border)] bg-[#1b1b1b] px-4 text-[12px] font-medium text-white"
      type="button"
    >
      <TrackingIcon className="size-3.5 text-[var(--track-text-muted)]" name={icon} />
      <span>{label}</span>
      <span className="text-[var(--track-text-muted)]">· {suffix}</span>
      <TrackingIcon className="size-3 text-[var(--track-text-muted)]" name="chevron-down" />
    </button>
  );
}

export function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
      {label}
      <span className="ml-2 text-[12px] font-medium tabular-nums text-white">{value}</span>
    </p>
  );
}

export function ChromeIconButton({
  icon,
}: {
  icon: "grid" | "more" | "settings" | "subscription" | "tags";
}) {
  return (
    <button
      className="flex size-9 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
      type="button"
    >
      <TrackingIcon className="size-4" name={icon} />
    </button>
  );
}

export function ViewTab({
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
      className={`rounded-[4px] px-4 py-1.5 text-[11px] font-medium ${
        currentView === targetView
          ? "bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]"
          : "text-white"
      }`}
      params={{ workspaceId: String(workspaceId) }}
      search={{ view: targetView }}
      to="/workspaces/$workspaceId"
    >
      {{ calendar: "Calendar", list: "List view", timesheet: "Timesheet" }[targetView]}
    </Link>
  );
}

export function SurfaceMessage({
  message,
  tone = "muted",
}: {
  message: string;
  tone?: "error" | "muted";
}) {
  return (
    <div
      className={`border-t border-[var(--track-border)] px-5 py-8 text-sm ${
        tone === "error" ? "text-rose-300" : "text-[var(--track-text-muted)]"
      }`}
    >
      {message}
    </div>
  );
}

export function ListView({
  groups,
  timezone,
}: {
  groups: EntryGroup[];
  timezone: string;
}): ReactElement {
  if (groups.length === 0) {
    return <SurfaceMessage message="No time entries in this workspace yet." />;
  }

  return (
    <div className="border-t border-[var(--track-border)]">
      {groups.map((group) => (
        <section key={group.key}>
          <div className="grid grid-cols-[28px_minmax(0,1fr)_90px_110px_92px_28px] items-center border-b border-[var(--track-border)] px-6 py-3">
            <span className="size-[10px] rounded-[3px] border border-[var(--track-border)]" />
            <p className="text-[13px] font-medium text-white">
              {formatGroupLabel(group.key, timezone)}
            </p>
            <span />
            <span />
            <p className="text-right text-[12px] font-medium tabular-nums text-white">
              {formatClockDuration(group.totalSeconds)}
            </p>
            <span />
          </div>
          {group.entries.map((entry) => (
            <div
              key={String(entry.id ?? `${entry.start}-${entry.description}`)}
              className="grid grid-cols-[28px_minmax(0,1fr)_90px_110px_92px_28px] items-center px-6 py-2.5 text-[12px] text-white"
            >
              <span />
              <div className="min-w-0">
                <p className="truncate">{entry.description?.trim() || "(no description)"}</p>
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                  <span style={{ color: resolveEntryColor(entry) }}>
                    {entry.project_name ?? "(No project)"}
                  </span>
                  <span className="text-[var(--track-text-muted)]">
                    {entry.shared_with?.length ? `${entry.shared_with.length} 余眼` : ""}
                  </span>
                </div>
              </div>
              <p className="text-right text-[11px] text-[var(--track-text-muted)]">
                {entry.shared_with?.length ? `${entry.shared_with.length} 余眼` : ""}
              </p>
              <p className="text-right font-medium tabular-nums text-[var(--track-text-muted)]">
                {formatEntryRange(entry, timezone)}
              </p>
              <p className="text-right font-medium tabular-nums text-white">
                {formatClockDuration(resolveEntryDurationSeconds(entry))}
              </p>
              <button
                aria-label={`Edit ${entry.description?.trim() || "time entry"}`}
                className="flex size-7 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
                type="button"
              >
                <TrackingIcon className="size-3.5" name="edit" />
              </button>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

export function CalendarView({
  entries,
  timezone,
  weekDays,
}: {
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  hours: number[];
  timezone: string;
  weekDays: Date[];
}): ReactElement {
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const days = weekDays.map((day) => ({
    date: day,
    entries: entries
      .filter((entry) => isSameDay(entry, day, timezone))
      .sort((left, right) => {
        const leftStart = new Date(left.start ?? left.at ?? Date.now()).getTime();
        const rightStart = new Date(right.start ?? right.at ?? Date.now()).getTime();
        return leftStart - rightStart;
      }),
  }));

  return (
    <div className="border-t border-[var(--track-border)]">
      <div className="grid grid-cols-[42px_repeat(7,minmax(170px,1fr))]">
        <div className="border-r border-[var(--track-border)]" />
        {days.map(({ date, entries: dayEntries }) => (
          <div
            className="border-l border-[var(--track-border)] px-3 py-2.5"
            key={date.toISOString()}
          >
            <p className="text-[27px] font-medium text-white">{date.getDate()}</p>
            <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
              <span>{formatWeekday(date, timezone)}</span>
              <span className="truncate text-[10px] normal-case tracking-normal">
                {resolveCalendarHeaderSummary(dayEntries, timezone)}
              </span>
            </div>
          </div>
        ))}

        <div className="border-r border-[var(--track-border)]">
          {hours.map((hour) => (
            <div
              className="flex h-[60px] items-start justify-end border-t border-[var(--track-grid)] px-2 pt-0.5 text-[10px] text-[var(--track-text-muted)]"
              key={hour}
            >
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {days.map(({ date, entries: dayEntries }) => (
          <div
            className="relative border-l border-[var(--track-border)]"
            key={`${date.toISOString()}-grid`}
          >
            <div
              className="relative"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, transparent 0, transparent 59px, var(--track-grid) 59px, var(--track-grid) 60px)",
                height: `${CALENDAR_TOTAL_HEIGHT}px`,
              }}
            >
              {dayEntries.map((entry) => (
                <CalendarEventCard
                  entry={entry}
                  key={String(entry.id ?? entry.start)}
                  timezone={timezone}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TimesheetView({
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

  if (rows.length === 0) {
    return <SurfaceMessage message="No week data available for this workspace." />;
  }

  return (
    <div className="border-t border-[var(--track-border)] px-4">
      <div className="grid grid-cols-[minmax(280px,1fr)_88px_repeat(7,55px)_72px] border-b border-[var(--track-border)] py-4 text-[10px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
        <span>Project</span>
        <span>Members</span>
        {weekDays.map((day) => (
          <span className="text-center" key={day.toISOString()}>
            {formatWeekday(day, timezone)}
          </span>
        ))}
        <span className="text-right">Total</span>
      </div>
      {rows.map((row) => (
        <div
          className="grid grid-cols-[minmax(280px,1fr)_88px_repeat(7,55px)_72px] items-center border-b border-[var(--track-border)] py-3"
          key={row.label}
        >
          <div className="flex min-w-0 items-center gap-2 pr-4">
            <span
              className="size-1.5 rounded-full shrink-0"
              style={{ backgroundColor: row.color }}
            />
            <span className="truncate text-[12px] text-white">{row.label}</span>
          </div>
          <span className="text-[11px] text-[var(--track-text-muted)]">{row.members} 余眼</span>
          {row.cells.map((seconds, index) => (
            <div className="flex justify-center" key={`${row.label}-${index}`}>
              <TimesheetCell seconds={seconds} />
            </div>
          ))}
          <span className="text-right text-[12px] font-medium text-white">
            {formatHours(row.totalSeconds)}
          </span>
        </div>
      ))}
      <div className="grid grid-cols-[minmax(280px,1fr)_88px_repeat(7,55px)_72px] items-center border-b border-[var(--track-border)] py-3 text-[12px] text-[var(--track-text-muted)]">
        <button
          className="flex items-center gap-2 text-left transition hover:text-white"
          type="button"
        >
          <TrackingIcon className="size-3.5" name="plus" />
          <span>Add row</span>
        </button>
        <span />
        {weekDays.map((_, index) => (
          <div className="flex justify-center" key={`placeholder-${index}`}>
            <TimesheetCell seconds={0} />
          </div>
        ))}
        <span />
      </div>
      <div className="grid grid-cols-[minmax(280px,1fr)_88px_repeat(7,55px)_72px] items-center py-3 text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
        <button
          className="w-fit rounded-md border border-[var(--track-border)] bg-[#171717] px-3 py-2 text-[11px] normal-case tracking-normal text-white transition hover:bg-[var(--track-row-hover)]"
          type="button"
        >
          Copy last week
        </button>
        <span>Total</span>
        {totals.map((seconds, index) => (
          <span className="text-center text-white" key={`total-${index}`}>
            {seconds > 0 ? formatHours(seconds) : "-"}
          </span>
        ))}
        <span className="text-right text-white">{formatHours(weekTotal)}</span>
      </div>
    </div>
  );
}

function CalendarEventCard({
  entry,
  timezone,
}: {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  timezone: string;
}) {
  const start = new Date(entry.start ?? entry.at ?? Date.now());
  const durationSeconds = resolveEntryDurationSeconds(entry);
  const top = resolveMinutesSinceMidnight(start, timezone);
  const height = Math.max(22, Math.round(durationSeconds / 60));
  const color = resolveEntryColor(entry);

  return (
    <div
      className="absolute left-1.5 right-1.5 overflow-hidden rounded-[2px] border border-black/25 px-2 py-1 text-[10px] leading-3 text-white"
      style={{
        backgroundColor: colorToOverlay(color),
        borderBottomColor: color,
        borderBottomWidth: "2px",
        top: `${top}px`,
        height: `${Math.min(height, CALENDAR_TOTAL_HEIGHT - top)}px`,
      }}
    >
      <p className="truncate font-medium">
        {entry.description?.trim() || entry.project_name || "Entry"}
      </p>
      <p className="mt-1 truncate" style={{ color }}>
        {entry.project_name ?? "(No project)"}
      </p>
      <p className="mt-1 truncate text-white/75">{formatClockTime(start, timezone)}</p>
    </div>
  );
}

function TimesheetCell({ seconds }: { seconds: number }) {
  return (
    <span
      className={`flex h-5 min-w-[36px] items-center justify-center rounded-[6px] border px-2 text-[10px] font-medium ${
        seconds > 0
          ? "border-[#4a4a4a] bg-[#202020] text-white"
          : "border-[#3b3b3b] bg-transparent text-transparent"
      }`}
    >
      {seconds > 0 ? formatHours(seconds).replace(" h", "") : "0"}
    </span>
  );
}

function resolveCalendarHeaderSummary(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
  timezone: string,
): string {
  if (entries.length === 0) {
    return "00:00-00:00";
  }

  const firstEntry = entries[0];
  return formatEntryRange(firstEntry, timezone);
}

function isSameDay(
  entry: GithubComTogglTogglApiInternalModelsTimeEntry,
  day: Date,
  timezone: string,
) {
  const entryDate = new Date(entry.start ?? entry.at ?? Date.now());
  return (
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    }).format(entryDate) ===
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    }).format(day)
  );
}

function resolveMinutesSinceMidnight(date: Date, timezone: string): number {
  const hours = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hour12: false,
      timeZone: timezone,
    }).format(date),
  );
  const minutes = Number(
    new Intl.DateTimeFormat("en-US", {
      minute: "2-digit",
      timeZone: timezone,
    }).format(date),
  );

  return hours * 60 + minutes;
}

function colorToOverlay(color: string): string {
  const normalized = color.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;
  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, 0.24)`;
}
