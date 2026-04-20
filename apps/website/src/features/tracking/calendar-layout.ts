import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { formatDateKey, resolveEntryDurationSeconds } from "./overview-data.ts";

export type CalendarEventLayout = {
  column: number;
  columns: number;
  height: number;
  left: number;
  top: number;
  width: number;
};

type IndexedEntry = {
  endMinute: number;
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  index: number;
  startMinute: number;
};

type ActiveColumn = {
  column: number;
  endMinute: number;
};

export function buildCalendarEventLayouts(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
  timezone: string,
  nowMs: number,
  viewDate?: Date,
): Map<string, CalendarEventLayout> {
  const indexedEntries = entries
    .map((entry, index) => buildIndexedEntry(entry, index, timezone, nowMs, viewDate))
    .sort((left, right) => {
      if (left.startMinute !== right.startMinute) {
        return left.startMinute - right.startMinute;
      }

      if (left.endMinute !== right.endMinute) {
        return right.endMinute - left.endMinute;
      }

      return left.index - right.index;
    });
  const layouts = new Map<string, CalendarEventLayout>();
  let cluster: IndexedEntry[] = [];
  let clusterEndMinute = -1;

  indexedEntries.forEach((entry) => {
    if (cluster.length > 0 && entry.startMinute >= clusterEndMinute) {
      commitClusterLayouts(cluster, layouts);
      cluster = [];
      clusterEndMinute = -1;
    }

    cluster.push(entry);
    clusterEndMinute = Math.max(clusterEndMinute, entry.endMinute);
  });

  if (cluster.length > 0) {
    commitClusterLayouts(cluster, layouts);
  }

  return layouts;
}

function commitClusterLayouts(
  cluster: IndexedEntry[],
  layouts: Map<string, CalendarEventLayout>,
): void {
  const activeColumns: ActiveColumn[] = [];
  const assignedColumns = new Map<number, number>();
  let maxColumns = 1;

  cluster.forEach((entry) => {
    releaseFinishedColumns(activeColumns, entry.startMinute);
    const column = pickColumn(activeColumns);
    activeColumns.push({
      column,
      endMinute: entry.endMinute,
    });
    maxColumns = Math.max(maxColumns, activeColumns.length);
    assignedColumns.set(entry.index, column);
  });

  cluster.forEach((event) => {
    const width = 100 / maxColumns;
    const key = resolveLayoutKey(event.entry, event.index);
    const column = assignedColumns.get(event.index) ?? 0;
    layouts.set(key, {
      column,
      columns: maxColumns,
      height: Math.max(22, event.endMinute - event.startMinute),
      left: column * width,
      top: event.startMinute,
      width,
    });
  });
}

function releaseFinishedColumns(activeColumns: ActiveColumn[], startMinute: number): void {
  for (let index = activeColumns.length - 1; index >= 0; index -= 1) {
    if (activeColumns[index]!.endMinute <= startMinute) {
      activeColumns.splice(index, 1);
    }
  }
}

function pickColumn(activeColumns: ActiveColumn[]): number {
  const used = new Set(activeColumns.map((column) => column.column));
  let column = 0;

  while (used.has(column)) {
    column += 1;
  }

  return column;
}

function buildIndexedEntry(
  entry: GithubComTogglTogglApiInternalModelsTimeEntry,
  index: number,
  timezone: string,
  nowMs: number,
  viewDate?: Date,
): IndexedEntry {
  const startDate = new Date(entry.start ?? entry.at ?? nowMs);
  const startDateKey = viewDate ? formatDateKey(startDate, timezone) : null;
  const viewDateKey = viewDate ? formatDateKey(viewDate, timezone) : null;
  const startsOnViewDate = startDateKey === viewDateKey || !viewDate;

  let startMinute: number;
  let endMinute: number;

  if (startsOnViewDate) {
    // Entry starts on the viewed day — clamp end at midnight
    startMinute = resolveMinutesSinceMidnight(startDate, timezone);
    const durationMinutes = Math.max(1, Math.round(resolveEntryDurationSeconds(entry, nowMs) / 60));
    endMinute = Math.min(24 * 60, startMinute + durationMinutes);
  } else {
    // Entry started on a previous day — show from midnight to its stop time
    startMinute = 0;
    const stopDate = entry.stop ? new Date(entry.stop) : new Date(nowMs);
    endMinute = Math.max(1, resolveMinutesSinceMidnight(stopDate, timezone));
  }

  return {
    endMinute,
    entry,
    index,
    startMinute,
  };
}

/**
 * Minutes since midnight for `date` in the given IANA `timezone`. Uses
 * `en-US` + `formatToParts` on purpose: passing the UI's active language
 * (e.g. `i18n.language`) lets CJK locales append unit suffixes like
 * `"14时"` / `"30分"`, which `Number(...)` parses as NaN. See b022ca67 and
 * the mobile current-time indicator regression.
 */
export function resolveMinutesSinceMidnight(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: timezone,
  }).formatToParts(date);

  let hours = 0;
  let minutes = 0;
  for (const part of parts) {
    if (part.type === "hour") hours = Number(part.value);
    if (part.type === "minute") minutes = Number(part.value);
  }

  // en-US + hour12:false notoriously returns "24" for midnight in some V8
  // revisions; normalize so the result is always in [0, 1440).
  if (hours === 24) hours = 0;

  return hours * 60 + minutes;
}

export function resolveLayoutKey(
  entry: GithubComTogglTogglApiInternalModelsTimeEntry,
  index: number,
): string {
  return String(entry.id ?? `${entry.start ?? entry.at ?? "entry"}-${index}`);
}
