import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { resolveEntryColor, sumForDate } from "./overview-data.ts";
import type { CalendarEvent } from "./calendar-types.ts";
import { isRunningTimeEntry, splitAtMidnight } from "./calendar-types.ts";

/**
 * react-big-calendar's dragAndDrop addon classifies any event whose start
 * and stop fall in the SAME MINUTE as "zero duration" and silently adds a
 * full day to the end before computing drag previews
 * (node_modules/.../dragAndDrop/common.js:58-60). That logic is meant for
 * all-day midnight events, but it misfires on legitimate sub-minute time
 * entries (e.g. 15:59:00 → 15:59:30), so we snap the display-only `end`
 * past the next minute boundary to stay clear of the trigger. The
 * persisted `entry.stop` is untouched; this only affects the Date we hand
 * to r-b-c for layout.
 */
const MINUTE_MS = 60_000;
function displayEndForCalendar(start: Date, end: Date): Date {
  const startMinute = Math.floor(start.getTime() / MINUTE_MS);
  const endMinute = Math.floor(end.getTime() / MINUTE_MS);
  if (startMinute !== endMinute) return end;
  return new Date((startMinute + 1) * MINUTE_MS);
}

export function buildEvents(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
  draftEntry: GithubComTogglTogglApiInternalModelsTimeEntry | null | undefined,
  runningEntry: GithubComTogglTogglApiInternalModelsTimeEntry | null | undefined,
  nowMinuteMs: number,
): CalendarEvent[] {
  const DRAFT_ENTRY_ID = -1;

  const stoppedEvents: CalendarEvent[] = entries
    .filter(
      (entry): entry is GithubComTogglTogglApiInternalModelsTimeEntry & { id: number } =>
        typeof entry.id === "number" &&
        Boolean(entry.start ?? entry.at) &&
        !isRunningTimeEntry(entry),
    )
    .flatMap((entry) => {
      const start = new Date(entry.start ?? entry.at ?? Date.now());
      const end = displayEndForCalendar(start, new Date(entry.stop!));
      const resource = {
        color: resolveEntryColor(entry),
        isDraft: false,
        isLocked: false,
        isRunning: false,
      };
      const title = entry.description?.trim() || entry.project_name || "Entry";
      return splitAtMidnight(start, end).map((segment) => ({
        allDay: false as const,
        end: segment.end,
        entry,
        id: entry.id,
        resource,
        start: segment.start,
        title,
      }));
    });

  if (draftEntry != null && draftEntry.start) {
    const draftWithId = {
      ...draftEntry,
      id: DRAFT_ENTRY_ID,
    } as GithubComTogglTogglApiInternalModelsTimeEntry & { id: number };
    const start = new Date(draftWithId.start ?? Date.now());
    const end = draftWithId.stop ? new Date(draftWithId.stop) : start;
    stoppedEvents.push({
      allDay: false,
      end,
      entry: draftWithId,
      id: draftWithId.id,
      resource: {
        color: resolveEntryColor(draftWithId),
        isDraft: true,
        isLocked: false,
        isRunning: false,
      },
      start,
      title: draftWithId.description?.trim() || draftWithId.project_name || "Entry",
    });
  }

  // Include running entries
  const entryIds = new Set(entries.map((e) => e.id));
  const runningEntries: GithubComTogglTogglApiInternalModelsTimeEntry[] = [];
  if (
    runningEntry != null &&
    typeof runningEntry.id === "number" &&
    !entryIds.has(runningEntry.id)
  ) {
    runningEntries.push(runningEntry);
  }
  for (const entry of entries) {
    if (typeof entry.id === "number" && isRunningTimeEntry(entry)) {
      runningEntries.push(entry);
    }
  }

  if (runningEntries.length === 0) return stoppedEvents;

  const runningEvents: CalendarEvent[] = runningEntries
    .filter(
      (entry): entry is GithubComTogglTogglApiInternalModelsTimeEntry & { id: number } =>
        typeof entry.id === "number" && Boolean(entry.start ?? entry.at),
    )
    .flatMap((entry) => {
      const start = new Date(entry.start ?? entry.at ?? Date.now());
      const end = new Date(nowMinuteMs);
      const resource = {
        color: resolveEntryColor(entry),
        isDraft: false,
        isLocked: false,
        isRunning: true,
      };
      const title = entry.description?.trim() || entry.project_name || "Entry";
      return splitAtMidnight(start, end).map((segment) => ({
        allDay: false as const,
        end: segment.end,
        entry,
        id: entry.id,
        resource,
        start: segment.start,
        title,
      }));
    });

  return [...stoppedEvents, ...runningEvents];
}

export function buildDailyTotals(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
  weekDays: Date[],
  timezone: string,
): Map<string, number> {
  const totals = new Map<string, number>();
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  });
  for (const day of weekDays) {
    const key = dateFormatter.format(day);
    totals.set(key, sumForDate(entries, key, timezone));
  }
  return totals;
}
