import { type ReactElement, useRef, useState } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
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
import type { TimerViewMode } from "./timer-view-mode.ts";
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
    <p className="flex items-baseline gap-3 text-[12px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
      <span>{label}</span>
      <span className="text-[18px] font-medium tabular-nums text-white">{value}</span>
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

export function ViewTabGroup({
  children,
  label,
  onSelect,
  options,
  value,
}: {
  children: React.ReactNode;
  label: string;
  onSelect: (view: TimerViewMode) => void;
  options: TimerViewMode[];
  value: TimerViewMode;
}) {
  const selectedIndex = options.indexOf(value);
  const groupRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    let nextIndex = selectedIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (selectedIndex + 1) % options.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (selectedIndex - 1 + options.length) % options.length;
    } else {
      return;
    }
    event.preventDefault();
    onSelect(options[nextIndex]);
    // Move focus to the newly selected tab so the user can immediately activate it with Space/Enter
    requestAnimationFrame(() => {
      const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>("button");
      buttons?.[nextIndex]?.focus();
    });
  }

  return (
    <div
      aria-label={label}
      className="flex rounded-md border border-[var(--track-border)] bg-[#111111] p-0.5"
      onKeyDown={handleKeyDown}
      ref={groupRef}
      role="radiogroup"
    >
      {children}
    </div>
  );
}

export function ViewTab({
  currentView,
  onSelect,
  targetView,
}: {
  currentView: TimerViewMode;
  onSelect: (view: TimerViewMode) => void;
  targetView: TimerViewMode;
}) {
  const isSelected = currentView === targetView;
  return (
    <button
      aria-pressed={isSelected}
      className={`rounded-[4px] px-4 py-1.5 text-[11px] font-medium focus-visible:outline-1 focus-visible:outline-offset-1 ${
        isSelected ? "bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]" : "text-white"
      }`}
      data-state={isSelected ? "active" : "inactive"}
      onClick={() => onSelect(targetView)}
      type="button"
    >
      {{ calendar: "Calendar", list: "List view", timesheet: "Timesheet" }[targetView]}
    </button>
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
  onEditEntry,
  timezone,
}: {
  groups: EntryGroup[];
  onEditEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => void;
  timezone: string;
}): ReactElement {
  if (groups.length === 0) {
    return <SurfaceMessage message="No time entries in this workspace yet." />;
  }

  return (
    <div className="border-t border-[var(--track-border)]" data-testid="timer-list-view">
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
                onClick={(event) =>
                  onEditEntry?.(entry, event.currentTarget.getBoundingClientRect())
                }
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
  nowMs,
  onMoveEntry,
  runningEntry,
  onEditEntry,
  onResizeEntry,
  onSelectSlot,
  onSelectSubviewDate,
  onSubviewChange,
  selectedSubviewDateIso,
  subview = "week",
  timezone,
  weekDays,
}: {
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  hours: number[];
  onMoveEntry?: (entryId: number, minutesDelta: number) => void;
  nowMs?: number;
  onEditEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => void;
  onResizeEntry?: (entryId: number, edge: "start" | "end", minutesDelta: number) => void;
  onSelectSlot?: (slot: { dayIso: string; minute: number }) => void;
  onSelectSubviewDate?: (dateIso: string) => void;
  onSubviewChange?: (subview: "day" | "week") => void;
  runningEntry?: GithubComTogglTogglApiInternalModelsTimeEntry | null;
  selectedSubviewDateIso?: string;
  subview?: "day" | "week";
  timezone: string;
  weekDays: Date[];
}): ReactElement {
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const now = new Date(nowMs ?? Date.now());
  const subviewRef = useRef<HTMLDivElement>(null);
  const subviewOptions: Array<"day" | "week"> = ["day", "week"];
  const selectedSubviewIndex = subviewOptions.indexOf(subview);
  const days = weekDays.map((day) => ({
    date: day,
    entries: entries
      .filter((entry) => isSameDay(entry, day, timezone))
      .sort((left, right) => {
        const leftStart = new Date(left.start ?? left.at ?? Date.now()).getTime();
        const rightStart = new Date(right.start ?? right.at ?? Date.now()).getTime();
        return leftStart - rightStart;
      }),
    showNowLine: isSameCalendarDate(now, day, timezone),
  }));

  function handleSubviewKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    let nextIndex = selectedSubviewIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (selectedSubviewIndex + 1) % subviewOptions.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (selectedSubviewIndex - 1 + subviewOptions.length) % subviewOptions.length;
    } else {
      return;
    }
    event.preventDefault();
    onSubviewChange?.(subviewOptions[nextIndex]);
    requestAnimationFrame(() => {
      const buttons = subviewRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
      buttons?.[nextIndex]?.focus();
    });
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col border-t border-[var(--track-border)] bg-[#141415]"
      data-testid="timer-calendar-view"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--track-border)] bg-[#171718] px-5 py-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
          <TrackingIcon className="size-3.5" name="calendar" />
          <span>Calendar</span>
          <span className="rounded-full border border-[var(--track-border)] px-2 py-0.5 text-[10px] text-white">
            {subview === "day" ? "Day" : "Week"}
          </span>
        </div>
        <div
          aria-label="Calendar view"
          className="flex items-center gap-1 rounded-full border border-[var(--track-border)] bg-[#111112] p-1"
          data-testid="calendar-subview-controls"
          onKeyDown={handleSubviewKeyDown}
          ref={subviewRef}
          role="radiogroup"
        >
          <button
            aria-checked={subview === "day"}
            className={`rounded-full px-3 py-1 text-[11px] font-medium focus-visible:outline-1 focus-visible:outline-offset-1 ${
              subview === "day"
                ? "bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]"
                : "text-white"
            }`}
            onClick={() => onSubviewChange?.("day")}
            role="radio"
            tabIndex={subview === "day" ? 0 : -1}
            type="button"
          >
            Day
          </button>
          <button
            aria-checked={subview === "week"}
            className={`rounded-full px-3 py-1 text-[11px] font-medium focus-visible:outline-1 focus-visible:outline-offset-1 ${
              subview === "week"
                ? "bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]"
                : "text-white"
            }`}
            onClick={() => onSubviewChange?.("week")}
            role="radio"
            tabIndex={subview === "week" ? 0 : -1}
            type="button"
          >
            Week
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-x-auto">
        <div className="flex h-full min-h-0 min-w-[1232px] flex-col">
          <div
            className="sticky top-0 z-20 grid shrink-0 grid-cols-[42px_repeat(7,minmax(170px,1fr))] bg-[var(--track-surface)]"
            data-testid="calendar-sticky-header"
          >
            <div className="border-r border-[var(--track-border)] bg-[var(--track-surface)]" />
            {days.map(({ date, entries: dayEntries, showNowLine }) => (
              <div
                className="bg-[var(--track-surface)] px-3 py-3"
                data-testid={`calendar-day-header-${formatWeekday(date, timezone).toLowerCase()}`}
                key={date.toISOString()}
              >
                <button
                  aria-label={`Open day view for ${formatWeekday(date, timezone)} ${date.getDate()}`}
                  aria-pressed={selectedSubviewDateIso === formatDateIso(date)}
                  className="flex w-full items-center gap-2 rounded-[16px] text-left transition hover:bg-white/4"
                  onClick={() => onSelectSubviewDate?.(formatDateIso(date))}
                  type="button"
                >
                  <div
                    className={`flex h-[48px] min-w-[60px] shrink-0 items-center justify-center px-3 text-[25px] font-medium leading-none ${
                      showNowLine
                        ? "rounded-[999px] bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]"
                        : "text-white"
                    }`}
                  >
                    {date.getDate()}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-[14px] font-semibold uppercase tracking-[0.06em] ${
                        showNowLine ? "text-[var(--track-accent-text)]" : "text-white"
                      }`}
                    >
                      {formatWeekday(date, timezone)}
                    </p>
                    <p className="truncate text-[12px] font-medium tabular-nums text-[var(--track-text-muted)]">
                      {resolveCalendarHeaderSummary(dayEntries, timezone)}
                    </p>
                  </div>
                </button>
              </div>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto" data-testid="calendar-grid-scroll-area">
            <div className="grid grid-cols-[42px_repeat(7,minmax(170px,1fr))]">
              <div className="border-r border-[var(--track-border)]">
                {hours.map((hour) => (
                  <div
                    className="flex h-[60px] items-start justify-end border-t border-[var(--track-grid)] px-2 pt-0.5 text-[10px] text-[var(--track-text-muted)]"
                    key={hour}
                  >
                    {formatHourLabel(hour)}
                  </div>
                ))}
              </div>

              {days.map(({ date, entries: dayEntries, showNowLine }) => (
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
                    {hours.map((hour) => (
                      <button
                        aria-label={`Select time range on ${formatWeekday(date, timezone)} ${date.getDate()} at ${String(hour).padStart(2, "0")}:00`}
                        className="absolute inset-x-0 z-0 h-[60px] bg-transparent text-transparent"
                        key={`${date.toISOString()}-${hour}`}
                        onClick={() =>
                          onSelectSlot?.({ dayIso: formatDateIso(date), minute: hour * 60 })
                        }
                        style={{ top: `${hour * CALENDAR_HOUR_HEIGHT}px` }}
                        type="button"
                      >
                        Select slot
                      </button>
                    ))}
                    {dayEntries.map((entry) => (
                      <CalendarEventCard
                        entry={entry}
                        key={String(entry.id ?? entry.start)}
                        onEditEntry={onEditEntry}
                        onMoveEntry={onMoveEntry}
                        onResizeEntry={onResizeEntry}
                        timezone={timezone}
                      />
                    ))}
                    {showNowLine ? (
                      <RunningEntryLine
                        now={now}
                        runningEntry={runningEntry}
                        onEditEntry={onEditEntry}
                        timezone={timezone}
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RunningEntryLine({
  now,
  runningEntry,
  onEditEntry,
  timezone,
}: {
  now: Date;
  runningEntry?: GithubComTogglTogglApiInternalModelsTimeEntry | null;
  onEditEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => void;
  timezone: string;
}) {
  const top = resolveMinutesSinceMidnight(now, timezone);
  const clickable = Boolean(runningEntry && isRunningTimeEntry(runningEntry) && onEditEntry);

  if (!clickable || !runningEntry) {
    return (
      <div
        className="absolute left-0 right-0 z-10 h-4 -translate-y-1/2"
        data-testid="calendar-now-line"
        style={{ top: `${top}px` }}
      >
        <span
          className="absolute left-0 top-1/2 h-[3px] w-full -translate-y-1/2 rounded-full bg-[#ca74bf]"
          data-testid="calendar-now-line-track"
        />
        <span
          className="absolute left-0 top-1/2 block size-4 -translate-y-1/2 rounded-full bg-[#ca74bf]"
          data-testid="calendar-now-line-dot"
        />
      </div>
    );
  }

  return (
    <button
      aria-label={`Edit ${runningEntry.description?.trim() || runningEntry.project_name || "time entry"}`}
      className="absolute left-0 right-0 z-10 h-4 -translate-y-1/2 cursor-pointer bg-transparent"
      data-testid="calendar-now-line"
      onClick={(event) => onEditEntry?.(runningEntry, event.currentTarget.getBoundingClientRect())}
      style={{ top: `${top}px` }}
      type="button"
    >
      <span
        className="absolute left-0 top-1/2 h-[3px] w-full -translate-y-1/2 rounded-full bg-[#ca74bf]"
        data-testid="calendar-now-line-track"
      />
      <span
        className="absolute left-0 top-1/2 block size-4 -translate-y-1/2 rounded-full bg-[#ca74bf]"
        data-testid="calendar-now-line-dot"
      />
    </button>
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
    <div className="border-t border-[var(--track-border)] px-4" data-testid="timer-timesheet-view">
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
  onEditEntry,
  onContinueEntry,
  onMoveEntry,
  onResizeEntry,
  timezone,
}: {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  onEditEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => void;
  onContinueEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onMoveEntry?: (entryId: number, minutesDelta: number) => void;
  onResizeEntry?: (entryId: number, edge: "start" | "end", minutesDelta: number) => void;
  timezone: string;
}) {
  const start = new Date(entry.start ?? entry.at ?? Date.now());
  const durationSeconds = resolveEntryDurationSeconds(entry);
  const top = resolveMinutesSinceMidnight(start, timezone);
  const height = Math.max(22, Math.round(durationSeconds / 60));
  const color = resolveEntryColor(entry);
  const isRunning = !entry.stop && typeof entry.duration === "number" && entry.duration < 0;
  const [affordancesOpen, setAffordancesOpen] = useState(false);
  const entryId = typeof entry.id === "number" ? entry.id : null;
  const allowDirectEdit = !isRunning && entryId != null;

  return (
    <div
      className="absolute left-px right-px overflow-hidden rounded-[6px] px-1.5 py-1 text-left text-[9px] leading-[1.15] transition hover:brightness-110"
      style={{
        backgroundColor: colorToOverlay(color),
        backgroundImage: isRunning
          ? "repeating-linear-gradient(135deg, transparent 0 10px, rgba(255,255,255,0.08) 10px 20px)"
          : undefined,
        top: `${top}px`,
        height: `${Math.min(height, CALENDAR_TOTAL_HEIGHT - top)}px`,
      }}
    >
      <button
        aria-label={`Edit ${entry.description?.trim() || entry.project_name || "time entry"}`}
        className="flex h-full w-full flex-col text-left text-white"
        onClick={(event) => onEditEntry?.(entry, event.currentTarget.getBoundingClientRect())}
        type="button"
      >
        <p className="truncate font-semibold">
          {entry.description?.trim() || entry.project_name || "Entry"}
        </p>
        <p className="mt-0.5 truncate" style={{ color }}>
          {entry.project_name && entry.client_name
            ? `${entry.project_name} • ${entry.client_name}`
            : (entry.project_name ?? "(No project)")}
        </p>
        <div className="mt-0.5 flex items-center gap-1 text-white/72">
          <span>{formatClockDuration(durationSeconds)}</span>
          {entry.tags && entry.tags.length > 0 && <span className="truncate">{entry.tags[0]}</span>}
        </div>
      </button>
      <button
        aria-label={`Entry actions for ${entry.description?.trim() || entry.project_name || "time entry"}`}
        className="absolute right-1 top-1 flex size-4 items-center justify-center rounded text-white/70 transition hover:bg-white/10 hover:text-white"
        onClick={() => setAffordancesOpen((current) => !current)}
        type="button"
      >
        <TrackingIcon className="size-3" name="more" />
      </button>
      {affordancesOpen ? (
        <div className="absolute inset-x-1 bottom-1 flex flex-wrap gap-1 rounded-[6px] bg-[#141415]/95 p-1">
          {allowDirectEdit ? (
            <>
              <button
                aria-label={`Move entry ${entry.description?.trim() || entry.project_name || "time entry"}`}
                className="rounded bg-white/8 px-1.5 py-0.5 text-[9px] text-white"
                onClick={() => {
                  if (entryId != null) {
                    onMoveEntry?.(entryId, 15);
                  }
                }}
                type="button"
              >
                Move +15m
              </button>
              <button
                aria-label={`Resize start for ${entry.description?.trim() || entry.project_name || "time entry"}`}
                className="rounded bg-white/8 px-1.5 py-0.5 text-[9px] text-white"
                onClick={() => {
                  if (entryId != null) {
                    onResizeEntry?.(entryId, "start", -15);
                  }
                }}
                type="button"
              >
                Start -15m
              </button>
              <button
                aria-label={`Resize end for ${entry.description?.trim() || entry.project_name || "time entry"}`}
                className="rounded bg-white/8 px-1.5 py-0.5 text-[9px] text-white"
                onClick={() => {
                  if (entryId != null) {
                    onResizeEntry?.(entryId, "end", 15);
                  }
                }}
                type="button"
              >
                End +15m
              </button>
            </>
          ) : (
            <span className="px-1.5 py-0.5 text-[9px] text-white/70">
              Running entries are view-only here
            </span>
          )}
        </div>
      ) : null}
      {isRunning && onContinueEntry && (
        <button
          aria-label="Continue time entry"
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          onClick={() => onContinueEntry(entry)}
          type="button"
        >
          <svg width="10" height="10" viewBox="0 0 16 16">
            <path
              fill="currentColor"
              d="M13.5 7.13399C14.1667 7.51889 14.1667 8.48114 13.5 8.86604L4.5 14.0622C3.83333 14.4471 3 13.966 3 13.1962L3 2.80386C3 2.03406 3.83333 1.55293 4.5 1.93783L13.5 7.13399Z"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

function formatDateIso(date: Date): string {
  return date.toISOString().slice(0, 10);
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

function isRunningTimeEntry(entry: GithubComTogglTogglApiInternalModelsTimeEntry): boolean {
  return !entry.stop && typeof entry.duration === "number" && entry.duration < 0;
}

function isSameCalendarDate(left: Date, right: Date, timezone: string): boolean {
  return (
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    }).format(left) ===
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    }).format(right)
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

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12:00 AM";
  if (hour === 12) return "12:00 PM";
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
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

  return `rgb(${red}, ${green}, ${blue})`;
}
