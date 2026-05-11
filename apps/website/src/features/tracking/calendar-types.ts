import { dateFnsLocalizer } from "react-big-calendar";
import { mix } from "polished";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import type { TimeFormat } from "./overview-data.ts";
import type { CalendarSubview } from "./timer-view-mode.ts";
import { format } from "date-fns/format";
import { getDay } from "date-fns/getDay";
import { parse } from "date-fns/parse";
import { startOfWeek } from "date-fns/startOfWeek";
import { enUS } from "date-fns/locale/en-US";

export type CalendarEvent = {
  allDay: false;
  end: Date;
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  id: number;
  resource: {
    color: string;
    isDraft: boolean;
    isLocked: boolean;
    isRunning: boolean;
  };
  start: Date;
  title: string;
};

export type CalendarContextMenuAction =
  | "copy-description"
  | "copy-start-link"
  | "delete"
  | "duplicate"
  | "favorite"
  | "go-to-project"
  | "split";

export type CalendarViewProps = {
  calendarHours?: "all" | "business";
  draftEntry?: GithubComTogglTogglApiInternalModelsTimeEntry | null;
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  isEntryFavorited?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => boolean;
  onContextMenuAction?: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    action: CalendarContextMenuAction,
  ) => void;
  onContinueEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onMoveEntry?: (entryId: number, minutesDelta: number) => void;
  onEditEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => void;
  onResizeEntry?: (entryId: number, edge: "start" | "end", minutesDelta: number) => void;
  onSelectSlot?: (slot: { end: Date; start: Date }) => void;
  onSelectSubviewDate?: (dateIso: string) => void;
  onStartEntry?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  runningEntry?: GithubComTogglTogglApiInternalModelsTimeEntry | null;
  selectedSubviewDateIso?: string;
  subview?: CalendarSubview;
  timeFormat?: TimeFormat;
  timezone: string;
  weekDays: Date[];
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  zoom?: number;
};

/**
 * Split a time range into segments at each midnight boundary.
 * E.g. 22:00 Day1 -> 02:00 Day2 becomes [{22:00->00:00}, {00:00->02:00}].
 * Returns a single-element array when start and end fall on the same calendar date.
 */
export function splitAtMidnight(start: Date, end: Date): Array<{ end: Date; start: Date }> {
  const segments: Array<{ end: Date; start: Date }> = [];
  let cursor = start;

  while (true) {
    const nextMidnight = new Date(cursor);
    nextMidnight.setHours(24, 0, 0, 0);

    if (nextMidnight > end) {
      segments.push({ end, start: cursor });
      break;
    }

    // End the segment 1ms before midnight so react-big-calendar keeps it
    // in the time grid instead of promoting it to an all-day header event.
    // This also covers the nextMidnight === end case (entry stopping exactly
    // at midnight of the next day): we clip the tail and break without
    // emitting a zero-duration segment on the following day.
    const segmentEnd = new Date(nextMidnight.getTime() - 1);
    segments.push({ end: segmentEnd, start: cursor });
    if (nextMidnight.getTime() === end.getTime()) break;
    cursor = nextMidnight;
  }

  return segments;
}

export function buildCalendarLocalizer(weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1) {
  return dateFnsLocalizer({
    format,
    getDay,
    locales: { "en-US": enUS },
    parse,
    startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn }),
  });
}

export function formatDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDayTotal(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function isRunningTimeEntry(entry: GithubComTogglTogglApiInternalModelsTimeEntry): boolean {
  return !entry.stop && typeof entry.duration === "number" && entry.duration < 0;
}

/** Lighten the project color for use as a readable label on dark backgrounds.
 *  Mix 60% project color with white to get a pastel-ish tint. */
export function vividColor(color: string): string {
  if (!color?.startsWith("#")) return color ?? "var(--track-accent)";
  return mix(0.6, color, "#ffffff");
}

/** Surface color for the current theme (dark). Toggl mixes projectColor with the
 *  theme background; we use the design-token value so it stays in sync. */
const SURFACE_BG = "#1b1b1b";

/**
 * Mix the project color with the surface background, matching Toggl's polished.mix
 * algorithm.  weight 0 -> pure background, 1 -> pure project color.
 *
 * Toggl constants: normal=0.5, hover=0.8, running-stripe=0.08.
 */
export function colorToOverlay(color: string, weight = 0.5): string {
  if (!color?.startsWith("#")) return color ?? SURFACE_BG;
  return mix(weight, color, SURFACE_BG);
}
