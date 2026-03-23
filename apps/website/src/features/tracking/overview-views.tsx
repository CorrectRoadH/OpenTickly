import { Fragment, type ReactElement } from "react";
import { Link } from "@tanstack/react-router";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import type { ShellViewMode } from "../../shared/url-state/shell-view.ts";
import {
  formatClockDuration,
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
      className="flex h-9 items-center gap-2 rounded-md border border-[var(--track-border)] bg-[#181818] px-4 text-[13px] text-white"
      type="button"
    >
      <TrackingIcon className="size-4 text-[var(--track-text-muted)]" name={icon} />
      <span>{label}</span>
      <span className="text-[var(--track-text-muted)]">· {suffix}</span>
    </button>
  );
}

export function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--track-text-muted)]">
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
      className="flex size-[30px] items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[#222222] hover:text-white"
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
      className={`rounded-[4px] px-4 py-1.5 text-[12px] font-medium ${currentView === targetView ? "bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]" : "text-white"}`}
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
      className={`border-t border-[var(--track-border)] px-5 py-6 text-sm ${tone === "error" ? "text-rose-300" : "text-[var(--track-text-muted)]"}`}
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
  if (groups.length === 0)
    return <SurfaceMessage message="No time entries in this workspace yet." />;

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

export function CalendarView({
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
