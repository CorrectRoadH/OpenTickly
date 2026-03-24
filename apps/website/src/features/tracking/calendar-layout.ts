import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { resolveEntryDurationSeconds } from "./overview-data.ts";

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
): Map<string, CalendarEventLayout> {
  const indexedEntries = entries
    .map((entry, index) => buildIndexedEntry(entry, index, timezone, nowMs))
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
): IndexedEntry {
  const startDate = new Date(entry.start ?? entry.at ?? nowMs);
  const startMinute = resolveMinutesSinceMidnight(startDate, timezone);
  const durationMinutes = Math.max(1, Math.round(resolveEntryDurationSeconds(entry, nowMs) / 60));
  const endMinute = Math.min(24 * 60, startMinute + durationMinutes);

  return {
    endMinute,
    entry,
    index,
    startMinute,
  };
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

export function resolveLayoutKey(
  entry: GithubComTogglTogglApiInternalModelsTimeEntry,
  index: number,
): string {
  return String(entry.id ?? `${entry.start ?? entry.at ?? "entry"}-${index}`);
}
