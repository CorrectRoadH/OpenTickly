import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { isTrackHexColor, pickTrackColorFromSeed } from "../../shared/lib/project-colors.ts";

export type EntryGroup = {
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  key: string;
  totalSeconds: number;
};

export type ProjectSummary = {
  color: string;
  label: string;
  totalSeconds: number;
};

export type TimesheetRow = {
  cells: number[];
  color: string;
  label: string;
  members: number;
  totalSeconds: number;
};

export function sortTimeEntries(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
): GithubComTogglTogglApiInternalModelsTimeEntry[] {
  return [...entries].sort(
    (left, right) =>
      new Date(right.start ?? right.at ?? 0).getTime() -
      new Date(left.start ?? left.at ?? 0).getTime(),
  );
}

export function buildEntryGroups(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
  timezone: string,
): EntryGroup[] {
  const groups = new Map<string, EntryGroup>();

  entries.forEach((entry) => {
    const key = formatDateKey(new Date(entry.start ?? entry.at ?? Date.now()), timezone);
    const current = groups.get(key);
    const duration = resolveEntryDurationSeconds(entry);

    if (current) {
      current.entries.push(entry);
      current.totalSeconds += duration;
      return;
    }

    groups.set(key, {
      entries: [entry],
      key,
      totalSeconds: duration,
    });
  });

  return [...groups.values()];
}

export function summarizeProjects(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
): ProjectSummary[] {
  const totals = new Map<string, ProjectSummary>();

  entries.forEach((entry) => {
    const label = entry.project_name?.trim() || "(No project)";
    const summary = totals.get(label) ?? {
      color: resolveEntryColor(entry),
      label,
      totalSeconds: 0,
    };

    summary.totalSeconds += resolveEntryDurationSeconds(entry);
    totals.set(label, summary);
  });

  return [...totals.values()].sort((left, right) => right.totalSeconds - left.totalSeconds);
}

export function buildTimesheetRows(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
  weekDays: Date[],
  timezone: string,
): TimesheetRow[] {
  const rows = new Map<string, TimesheetRow>();

  entries.forEach((entry) => {
    const label = entry.project_name?.trim() || "(No project)";
    const current = rows.get(label) ?? {
      cells: weekDays.map(() => 0),
      color: resolveEntryColor(entry),
      label,
      members: 0,
      totalSeconds: 0,
    };
    const entryDay = formatDateKey(new Date(entry.start ?? entry.at ?? Date.now()), timezone);
    const dayIndex = weekDays.findIndex((day) => formatDateKey(day, timezone) === entryDay);
    const duration = resolveEntryDurationSeconds(entry);

    if (dayIndex >= 0) {
      current.cells[dayIndex] += duration;
    }

    current.members = Math.max(current.members, entry.shared_with?.length ?? 0);
    current.totalSeconds += duration;
    rows.set(label, current);
  });

  return [...rows.values()].sort((left, right) => right.totalSeconds - left.totalSeconds);
}

export function sumForDate(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
  dateKey: string,
  timezone: string,
): number {
  return entries.reduce((total, entry) => {
    const entryKey = formatDateKey(new Date(entry.start ?? entry.at ?? Date.now()), timezone);
    return total + (entryKey === dateKey ? resolveEntryDurationSeconds(entry) : 0);
  }, 0);
}

/**
 * Returns the 7 days of the current week.
 * `weekStartsOn` uses JS getDay() convention: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
 */
export function getCurrentWeekDays(weekStartsOn = 1): Date[] {
  const today = new Date();
  const start = new Date(today);
  const weekday = start.getDay();
  const delta = ((weekday - weekStartsOn + 7) % 7) * -1;
  start.setDate(start.getDate() + delta);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function getCalendarHours(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
  weekDays: Date[],
  timezone: string,
): number[] {
  const hours = new Set<number>();

  entries.forEach((entry) => {
    const entryDate = new Date(entry.start ?? entry.at ?? Date.now());
    if (
      !weekDays.some((day) => formatDateKey(day, timezone) === formatDateKey(entryDate, timezone))
    ) {
      return;
    }
    hours.add(getHourInTimezone(entryDate, timezone));
  });

  if (hours.size === 0) {
    return Array.from({ length: 22 }, (_, index) => index + 1);
  }

  return [...hours].sort((left, right) => left - right);
}

/**
 * Resolves the effective duration of a time entry in seconds.
 *
 * Priority order:
 * 1. If both start and stop are present, compute (stop - start) in seconds.
 *    This handles entries with unreliable stored duration values (e.g. CLI-created).
 * 2. If running (no stop, negative duration), compute elapsed from start.
 * 3. If duration is non-negative, use it directly.
 */
export function resolveEntryDurationSeconds(
  entry: GithubComTogglTogglApiInternalModelsTimeEntry,
  nowMs = Date.now(),
): number {
  if (entry.start && entry.stop) {
    const startMs = new Date(entry.start).getTime();
    const stopMs = new Date(entry.stop).getTime();
    return Math.max(0, Math.round((stopMs - startMs) / 1000));
  }

  if (typeof entry.duration === "number" && entry.duration < 0 && entry.start) {
    return Math.max(0, Math.floor((nowMs - new Date(entry.start).getTime()) / 1000));
  }

  if (typeof entry.duration === "number" && entry.duration >= 0) {
    return entry.duration;
  }

  return 0;
}

export function formatDateKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).format(date);
}

export function formatWeekday(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(date);
}

export function formatGroupLabel(dateKey: string, timezone: string): string {
  const [year, month, day] = dateKey.split("-");
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);

  const now = new Date();
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).format(now);

  if (dateKey === todayKey) {
    return "Today";
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).format(yesterday);

  if (dateKey === yesterdayKey) {
    return "Yesterday";
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
    weekday: "short",
  });

  return formatter.format(date);
}

export function formatEntryRange(
  entry: GithubComTogglTogglApiInternalModelsTimeEntry,
  timezone: string,
): string {
  const start = new Date(entry.start ?? entry.at ?? Date.now());
  const stop = entry.stop ? new Date(entry.stop) : undefined;

  if (!stop) {
    return `${formatClockTime(start, timezone)} - running`;
  }

  return `${formatClockTime(start, timezone)} - ${formatClockTime(stop, timezone)}`;
}

export function formatClockTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

export function getHourInTimezone(date: Date, timezone: string): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hour12: false,
      timeZone: timezone,
    }).format(date),
  );
}

export function formatClockDuration(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;

  return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function formatHours(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

export function resolveEntryColor(entry: GithubComTogglTogglApiInternalModelsTimeEntry): string {
  const directColor = entry.project_color?.trim();
  if (isTrackHexColor(directColor)) {
    return directColor;
  }

  const seed = `${entry.project_name ?? entry.client_name ?? entry.description ?? "entry"}`;
  return pickTrackColorFromSeed(seed);
}
