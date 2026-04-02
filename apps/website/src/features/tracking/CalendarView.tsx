import React, { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { mix, transparentize } from "polished";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import withDragAndDropModule from "react-big-calendar/lib/addons/dragAndDrop";
import { useTranslation } from "react-i18next";

import i18n from "../../app/i18n.ts";
import type { EventProps, SlotInfo } from "react-big-calendar";
import type { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import { format } from "date-fns/format";
import { getDay } from "date-fns/getDay";
import { parse } from "date-fns/parse";
import { startOfWeek } from "date-fns/startOfWeek";
import { enUS } from "date-fns/locale/en-US";
import "./calendar.css";

import { calendarDayLayout } from "./calendar-day-layout.ts";
import { CalendarEntryContextMenu } from "./CalendarEntryContextMenu.tsx";
import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  formatClockDuration,
  resolveEntryColor,
  resolveEntryDurationSeconds,
  sumForDate,
} from "./overview-data.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import type { CalendarSubview } from "./timer-view-mode.ts";
import { MinusIcon, PlayIcon, PlusIcon, TagsIcon } from "../../shared/ui/icons.tsx";

const withDragAndDrop =
  typeof withDragAndDropModule === "function"
    ? withDragAndDropModule
    : (
        withDragAndDropModule as {
          default?: typeof withDragAndDropModule;
        }
      ).default;

if (!withDragAndDrop) {
  throw new Error("react-big-calendar drag-and-drop addon failed to load");
}

const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar);

type CalendarEvent = {
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

/**
 * Split a time range into segments at each midnight boundary.
 * E.g. 22:00 Day1 → 02:00 Day2 becomes [{22:00→00:00}, {00:00→02:00}].
 * Returns a single-element array when start and end fall on the same calendar date.
 */
function splitAtMidnight(start: Date, end: Date): Array<{ end: Date; start: Date }> {
  const segments: Array<{ end: Date; start: Date }> = [];
  let cursor = start;

  while (true) {
    const nextMidnight = new Date(cursor);
    nextMidnight.setHours(24, 0, 0, 0);

    if (nextMidnight >= end) {
      segments.push({ end, start: cursor });
      break;
    }

    // End the segment 1ms before midnight so react-big-calendar keeps it
    // in the time grid instead of promoting it to an all-day header event.
    const segmentEnd = new Date(nextMidnight.getTime() - 1);
    segments.push({ end: segmentEnd, start: cursor });
    cursor = nextMidnight;
  }

  return segments;
}

function buildCalendarLocalizer(weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1) {
  return dateFnsLocalizer({
    format,
    getDay,
    locales: { "en-US": enUS },
    parse,
    startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn }),
  });
}

/**
 * Custom day column wrapper matching Toggl's StyledDayColumnWrapper.
 * Uses forwardRef because RBC's DayColumn passes a ref to dayColumnWrapper.
 * On the "today" column, appends a play button next to the RBC-rendered
 * .rbc-current-time-indicator.
 */
const CalendarDayColumnWrapper = React.forwardRef<
  HTMLDivElement,
  {
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    isNow?: boolean;
    onStartEntry?: () => void;
  }
>(function CalendarDayColumnWrapper({ children, className, style, isNow, onStartEntry }, ref) {
  const columnRef = useRef<HTMLDivElement>(null);
  const playRef = useRef<SVGSVGElement>(null);

  const setRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      (columnRef as { current: HTMLDivElement | null }).current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
    },
    [ref],
  );

  useEffect(() => {
    if (!isNow || !columnRef.current || !playRef.current) return;

    function syncPosition() {
      const indicator = columnRef.current?.querySelector<HTMLElement>(
        ".rbc-current-time-indicator",
      );
      if (indicator && playRef.current) {
        playRef.current.style.top = indicator.style.top;
      }
    }

    syncPosition();
    const interval = setInterval(syncPosition, 10_000);
    return () => clearInterval(interval);
  }, [isNow]);

  return (
    <div className={className} ref={setRef} style={style}>
      {children}
      {isNow ? (
        <svg
          className="calendar-indicator-play-btn absolute cursor-pointer"
          data-testid="current-time-indicator-play"
          fill="none"
          height="16"
          onClick={(e) => {
            e.stopPropagation();
            onStartEntry?.();
          }}
          ref={playRef}
          style={{ pointerEvents: "all", left: "-7px", marginTop: "-6.5px" }}
          viewBox="0 0 36 36"
          width="16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect fill="var(--track-accent)" height="36" rx="18" width="36" />
          <path
            d="M13 11.994c0-1.101.773-1.553 1.745-.997l10.51 6.005c.964.55.972 1.439 0 1.994l-10.51 6.007c-.964.55-1.745.102-1.745-.997V11.994z"
            fill="var(--track-canvas)"
          />
        </svg>
      ) : null}
    </div>
  );
});

export type CalendarContextMenuAction =
  | "copy-description"
  | "copy-start-link"
  | "delete"
  | "duplicate"
  | "favorite"
  | "go-to-project"
  | "split";

export function CalendarView({
  calendarHours = "all",
  draftEntry,
  entries,
  nowMs,
  isEntryFavorited,
  onContextMenuAction,
  onContinueEntry,
  onMoveEntry,
  onEditEntry,
  onResizeEntry,
  onSelectSlot,
  onSelectSubviewDate,
  onStartEntry,
  onZoomIn,
  onZoomOut,
  runningEntry,
  selectedSubviewDateIso,
  subview = "week",
  timezone,
  weekDays,
  weekStartsOn = 1,
  zoom = 0,
}: {
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
  nowMs?: number;
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
  timezone: string;
  weekDays: Date[];
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  zoom?: number;
}): ReactElement {
  const now = new Date(nowMs ?? Date.now());
  const calendarLocalizer = useMemo(() => buildCalendarLocalizer(weekStartsOn), [weekStartsOn]);
  const calendarDate = useMemo(() => {
    if (subview === "day" && selectedSubviewDateIso) {
      return new Date(`${selectedSubviewDateIso}T00:00:00`);
    }
    return weekDays[0] ?? now;
  }, [now, selectedSubviewDateIso, subview, weekDays]);
  // Build stopped/draft events without nowMs so they stay referentially
  // stable while a timer is running (nowMs ticks every second).
  const stoppedEvents = useMemo<CalendarEvent[]>(() => {
    const DRAFT_ENTRY_ID = -1;

    const calendarEvents: CalendarEvent[] = entries
      .filter(
        (entry): entry is GithubComTogglTogglApiInternalModelsTimeEntry & { id: number } =>
          typeof entry.id === "number" &&
          Boolean(entry.start ?? entry.at) &&
          !isRunningTimeEntry(entry),
      )
      .flatMap((entry) => {
        const start = new Date(entry.start ?? entry.at ?? Date.now());
        const end = new Date(entry.stop!);
        const resource = {
          color: resolveEntryColor(entry),
          isDraft: false,
          isLocked: false,
          isRunning: false,
        };
        const title = entry.description?.trim() || entry.project_name || "Entry";

        // Split cross-day entries at each midnight boundary so they render as
        // time-grid blocks instead of all-day header events.
        return splitAtMidnight(start, end).map((segment) => ({
          allDay: false,
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
      calendarEvents.push({
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

    return calendarEvents;
  }, [draftEntry, entries]);

  // Toggl updates running entries in the calendar every ~60 seconds, not every
  // second. This prevents RBC from re-rendering all event components on every
  // tick, which would destroy local state (e.g. context menu) in EventCards.
  // We round nowMs down to the nearest minute so the events array only changes
  // when the minute rolls over.
  const nowMinuteMs = useMemo(() => {
    if (nowMs == null) return undefined;
    return Math.floor(nowMs / 60_000) * 60_000;
  }, [nowMs]);

  const events = useMemo<CalendarEvent[]>(() => {
    // Include the running entry even if the time-entries query hasn't yet
    // returned it (e.g. immediately after starting a new timer).
    const entryIds = new Set(entries.map((e) => e.id));
    const runningEntries: GithubComTogglTogglApiInternalModelsTimeEntry[] = [];
    if (
      runningEntry != null &&
      typeof runningEntry.id === "number" &&
      !entryIds.has(runningEntry.id)
    ) {
      runningEntries.push(runningEntry);
    }
    // Also pick up any running entries already in the entries list
    for (const entry of entries) {
      if (typeof entry.id === "number" && isRunningTimeEntry(entry)) {
        runningEntries.push(entry);
      }
    }

    if (runningEntries.length === 0) {
      return stoppedEvents;
    }

    const runningEvents: CalendarEvent[] = runningEntries
      .filter(
        (entry): entry is GithubComTogglTogglApiInternalModelsTimeEntry & { id: number } =>
          typeof entry.id === "number" && Boolean(entry.start ?? entry.at),
      )
      .flatMap((entry) => {
        const start = new Date(entry.start ?? entry.at ?? Date.now());
        // Running entry end is "now" rounded to the current minute.
        // This matches Toggl's behavior: calendar events update every ~60s,
        // not every second, so RBC doesn't re-render and destroy event cards.
        const end = new Date(nowMinuteMs ?? Date.now());
        const resource = {
          color: resolveEntryColor(entry),
          isDraft: false,
          isLocked: false,
          isRunning: true,
        };
        const title = entry.description?.trim() || entry.project_name || "Entry";

        return splitAtMidnight(start, end).map((segment) => ({
          allDay: false,
          end: segment.end,
          entry,
          id: entry.id,
          resource,
          start: segment.start,
          title,
        }));
      });

    return [...stoppedEvents, ...runningEvents];
  }, [stoppedEvents, entries, nowMinuteMs, runningEntry]);
  const dailyTotals = useMemo(() => {
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
  }, [entries, weekDays, timezone]);

  const today = useMemo(() => new Date(), []);

  const currentView =
    subview === "day" ? Views.DAY : subview === "five-day" ? Views.WORK_WEEK : Views.WEEK;
  const minTime = useMemo(() => {
    const date = new Date(calendarDate);
    date.setHours(calendarHours === "business" ? 9 : 0, 0, 0, 0);
    return date;
  }, [calendarDate, calendarHours]);
  const maxTime = useMemo(() => {
    const date = new Date(calendarDate);
    if (calendarHours === "business") {
      date.setHours(17, 0, 0, 0);
    } else {
      date.setHours(23, 59, 59, 999);
    }
    return date;
  }, [calendarDate, calendarHours]);
  const step = zoom > 0 ? 15 : 30;
  const timeslots = zoom > 0 ? 4 : 2;

  // Context menu state lives at CalendarView level (not inside EventCard).
  // Toggl does the same — the menu is a sibling of the calendar grid in the
  // DOM, not inside the event card. This way RBC can re-render event cards
  // without destroying the menu state.
  const [contextMenuState, setContextMenuState] = useState<{
    entry: GithubComTogglTogglApiInternalModelsTimeEntry;
    x: number;
    y: number;
  } | null>(null);

  // Memoize the RBC components object so it doesn't change on every render.
  // Without this, every nowMs tick (1s) creates a new components object →
  // RBC re-mounts all event cards → local state (context menu) is lost.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calendarComponents = useMemo(
    () => ({
      event: (props: EventProps<CalendarEvent>) => (
        <CalendarEventCard
          event={props.event}
          onContextMenu={(entry, x, y) => setContextMenuState({ entry, x, y })}
          onContinueEntry={onContinueEntry}
          onEditEntry={onEditEntry}
        />
      ),
      header: ({ date }: { date: Date }) => {
        const dayNum = date.getDate();
        const dayName = new Intl.DateTimeFormat(i18n.language, { weekday: "short" })
          .format(date)
          .toUpperCase();
        const dateKey = new Intl.DateTimeFormat("en-CA", {
          day: "2-digit",
          month: "2-digit",
          timeZone: timezone,
          year: "numeric",
        }).format(date);
        const totalSeconds = dailyTotals.get(dateKey) ?? 0;
        const isToday =
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth() &&
          date.getDate() === today.getDate();
        return (
          <div
            className="flex w-full items-center gap-2 px-2 py-2"
            data-testid={`calendar-day-header-${dayName.toLowerCase()}`}
          >
            <span
              className={`flex h-[32px] w-[36px] items-center justify-center text-[22px] font-semibold leading-none ${
                isToday ? "rounded-full bg-[var(--track-accent)]/30 text-white p-2" : "text-white"
              }`}
            >
              {dayNum}
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span
                className={`text-[11px] font-medium tracking-wide ${
                  isToday ? "text-[var(--track-accent)]" : "text-[var(--track-text-soft)]"
                }`}
              >
                {dayName}
              </span>
              <span className="text-[11px] tabular-nums text-[var(--track-text-soft)]">
                {totalSeconds > 0 ? formatDayTotal(totalSeconds) : "0:00:00"}
              </span>
            </span>
          </div>
        );
      },
      timeGutterHeader: () => (
        <div
          className="flex items-center justify-center gap-1 py-2"
          data-testid="calendar-zoom-controls"
        >
          <button
            aria-label="Decrease zoom"
            className="flex size-6 items-center justify-center rounded text-[var(--track-text-soft)] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            disabled={zoom <= -1}
            onClick={onZoomOut}
            type="button"
          >
            <MinusIcon className="size-3" />
          </button>
          <button
            aria-label="Increase zoom"
            className="flex size-6 items-center justify-center rounded text-[var(--track-text-soft)] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            disabled={zoom >= 1}
            onClick={onZoomIn}
            type="button"
          >
            <PlusIcon className="size-3" />
          </button>
        </div>
      ),
      dayColumnWrapper: React.forwardRef<HTMLDivElement, Record<string, unknown>>(
        function DayColumnWrapperBridge(props, ref) {
          return (
            <CalendarDayColumnWrapper
              ref={ref}
              className={props.className as string | undefined}
              isNow={Boolean(
                typeof props.className === "string" &&
                (props.className as string).includes("rbc-now"),
              )}
              onStartEntry={onStartEntry}
              style={props.style as React.CSSProperties | undefined}
            >
              {props.children as React.ReactNode}
            </CalendarDayColumnWrapper>
          );
        },
      ),
    }),
    [
      onContextMenuAction,
      onContinueEntry,
      onEditEntry,
      timezone,
      dailyTotals,
      today,
      zoom,
      onZoomIn,
      onZoomOut,
      onStartEntry,
    ],
  );

  return (
    <div
      className="border-t border-[var(--track-border)] bg-[var(--track-surface)]"
      data-testid="timer-calendar-view"
    >
      <DnDCalendar
        components={calendarComponents}
        date={calendarDate}
        defaultView={Views.WEEK}
        getNow={() => new Date()}
        draggableAccessor={(event) =>
          !event.resource.isLocked && !event.resource.isRunning && !event.resource.isDraft
        }
        endAccessor={(event) => event.end}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dayLayoutAlgorithm={calendarDayLayout as any}
        eventPropGetter={(event) => ({
          className: event.resource.isRunning ? "rbc-event-running" : undefined,
          style: {
            backgroundColor: "transparent",
            border: event.resource.isDraft ? "1px dashed var(--track-accent-outline)" : "none",
            color: "var(--track-text)",
            opacity: event.resource.isDraft ? 0.7 : undefined,
          },
        })}
        events={events}
        localizer={calendarLocalizer}
        max={maxTime}
        messages={{
          day: "Day",
          next: "Next",
          previous: "Previous",
          today: "Today",
          week: "Week",
        }}
        min={minTime}
        onDrillDown={(date) => onSelectSubviewDate?.(formatDateIso(date))}
        onEventDrop={({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
          const nextStart = new Date(start);
          const nextEnd = new Date(end);
          const minutesDelta = Math.round((nextStart.getTime() - event.start.getTime()) / 60_000);
          if (minutesDelta !== 0) {
            void onMoveEntry?.(event.id, minutesDelta);
          }
          if (event.entry.stop && nextEnd.getTime() !== event.end.getTime()) {
            void onResizeEntry?.(
              event.id,
              "end",
              Math.round((nextEnd.getTime() - event.end.getTime()) / 60_000),
            );
          }
          (window as Window & { __calendarDragResult?: unknown }).__calendarDragResult = {
            eventId: event.id,
            minutesDelta,
            start: nextStart.toISOString(),
            end: nextEnd.toISOString(),
          };
        }}
        onEventResize={({ end, event, start }: EventInteractionArgs<CalendarEvent>) => {
          const nextStart = new Date(start);
          const nextEnd = new Date(end);
          const startDelta = Math.round((nextStart.getTime() - event.start.getTime()) / 60_000);
          const endDelta = Math.round((nextEnd.getTime() - event.end.getTime()) / 60_000);
          if (startDelta !== 0) {
            void onResizeEntry?.(event.id, "start", startDelta);
          } else if (endDelta !== 0) {
            void onResizeEntry?.(event.id, "end", endDelta);
          }
        }}
        onNavigate={() => undefined}
        onSelectEvent={(event, nativeEvent) => {
          const target = nativeEvent.currentTarget;
          if (target instanceof HTMLElement) {
            onEditEntry?.(event.entry, target.getBoundingClientRect());
          }
        }}
        onSelectSlot={(slotInfo: SlotInfo) => {
          if (slotInfo.start && slotInfo.end) {
            onSelectSlot?.({
              end: slotInfo.end,
              start: slotInfo.start,
            });
          }
        }}
        resizable
        resizableAccessor={(event) =>
          !event.resource.isLocked && !event.resource.isRunning && !event.resource.isDraft
        }
        selectable
        startAccessor={(event) => event.start}
        step={step}
        timeslots={timeslots}
        toolbar={false}
        onView={() => undefined}
        view={currentView}
        views={[Views.WEEK, Views.WORK_WEEK, Views.DAY]}
      />
      {/* Context menu rendered at CalendarView level (sibling of DnDCalendar),
          matching Toggl's architecture. Menu state survives event card re-renders. */}
      {contextMenuState ? (
        <CalendarEntryContextMenu
          entry={contextMenuState.entry}
          onClose={() => setContextMenuState(null)}
          onCopyDescription={() => {
            onContextMenuAction?.(contextMenuState.entry, "copy-description");
            setContextMenuState(null);
          }}
          onCopyStartLink={() => {
            onContextMenuAction?.(contextMenuState.entry, "copy-start-link");
            setContextMenuState(null);
          }}
          onDelete={() => {
            onContextMenuAction?.(contextMenuState.entry, "delete");
            setContextMenuState(null);
          }}
          onDuplicate={() => {
            onContextMenuAction?.(contextMenuState.entry, "duplicate");
            setContextMenuState(null);
          }}
          onFavorite={
            isEntryFavorited?.(contextMenuState.entry)
              ? undefined
              : () => {
                  onContextMenuAction?.(contextMenuState.entry, "favorite");
                  setContextMenuState(null);
                }
          }
          onSplit={
            contextMenuState.entry.stop
              ? () => {
                  onContextMenuAction?.(contextMenuState.entry, "split");
                  setContextMenuState(null);
                }
              : undefined
          }
          position={{ x: contextMenuState.x, y: contextMenuState.y }}
          projectPath={
            contextMenuState.entry.project_id || contextMenuState.entry.pid
              ? `/projects/${contextMenuState.entry.workspace_id ?? contextMenuState.entry.wid}/list`
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

function CalendarEventCard({
  event,
  onContextMenu,
  onContinueEntry,
  onEditEntry,
}: {
  event: CalendarEvent;
  onContextMenu?: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    x: number,
    y: number,
  ) => void;
  onContinueEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onEditEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => void;
}) {
  const { t } = useTranslation("tracking");
  const { durationFormat } = useUserPreferences();
  const entry = event.entry;
  const durationSeconds = resolveEntryDurationSeconds(entry);
  const color = event.resource.color;
  const isRunning = event.resource.isRunning;
  const cardRef = useRef<HTMLDivElement>(null);
  const entryId = event.id;
  const isDraft = event.resource.isDraft;
  const allowDirectEdit = !event.resource.isLocked && !isRunning && !isDraft;

  // Draft entries auto-open the editor anchored to their real DOM position
  useEffect(() => {
    if (!isDraft || !cardRef.current) return;
    onEditEntry?.(entry, cardRef.current.getBoundingClientRect());
  }, [isDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={cardRef}
      className={`group h-full ${allowDirectEdit ? "cursor-grab" : "cursor-default"}`}
      data-testid={`calendar-entry-${entryId ?? "unknown"}`}
      onClick={(e) => onEditEntry?.(entry, e.currentTarget.getBoundingClientRect())}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(entry, e.clientX, e.clientY);
      }}
    >
      {/* Inner EventBox — Toggl uses padding 4px 6px for entries ≥15min,
          0px for shorter ones. border-radius 4px always. */}
      <div
        className={`relative flex h-full flex-col justify-between overflow-hidden rounded-[4px] text-left text-[12px] text-[var(--track-text)] ${
          durationSeconds >= 900 ? "px-1.5 py-1" : "px-0 py-0"
        }`}
        style={{
          backgroundColor: isRunning ? colorToOverlay(color, 0.08) : colorToOverlay(color, 0.5),
          backgroundImage: isRunning
            ? `repeating-linear-gradient(-45deg, transparent 0 0.5em, ${transparentize(0.92, color)} 0.5em 0.6em)`
            : undefined,
        }}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span
            className={`truncate font-semibold leading-tight ${entry.description?.trim() ? "" : "text-[var(--track-text-muted)]"}`}
          >
            {entry.description?.trim() || t("addDescription")}
          </span>
          {entry.project_name ? (
            <span
              className="truncate text-[12px] font-medium leading-tight"
              style={{ color: vividColor(color) }}
            >
              {entry.project_name}
            </span>
          ) : null}
          {entry.tags && entry.tags.length > 0 ? (
            <span className="flex items-center gap-1 truncate text-[11px] leading-tight text-[var(--track-text-muted)]">
              <TagsIcon className="size-2.5 shrink-0" />
              <span className="truncate">{entry.tags.join(", ")}</span>
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <span className="shrink-0 text-[12px] font-semibold tabular-nums leading-tight">
            {formatClockDuration(durationSeconds, durationFormat)}
          </span>
        </div>
        <button
          aria-label="Continue time entry"
          className="absolute bottom-1 right-1 z-20 flex size-5 items-center justify-center rounded-full bg-[var(--track-accent-secondary)] text-[var(--track-surface)] opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onContinueEntry?.(entry);
          }}
          type="button"
        >
          <PlayIcon className="size-2.5" />
        </button>
      </div>
    </div>
  );
}

function formatDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayTotal(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function isRunningTimeEntry(entry: GithubComTogglTogglApiInternalModelsTimeEntry): boolean {
  return !entry.stop && typeof entry.duration === "number" && entry.duration < 0;
}

/** Lighten the project color for use as a readable label on dark backgrounds.
 *  Mix 60% project color with white to get a pastel-ish tint. */
function vividColor(color: string): string {
  if (!color?.startsWith("#")) return color ?? "var(--track-accent)";
  return mix(0.6, color, "#ffffff");
}

/** Surface color for the current theme (dark). Toggl mixes projectColor with the
 *  theme background; we use the design-token value so it stays in sync. */
const SURFACE_BG = "#1b1b1b";

/**
 * Mix the project color with the surface background, matching Toggl's polished.mix
 * algorithm.  weight 0 → pure background, 1 → pure project color.
 *
 * Toggl constants: normal=0.5, hover=0.8, running-stripe=0.08.
 */
function colorToOverlay(color: string, weight = 0.5): string {
  if (!color?.startsWith("#")) return color ?? SURFACE_BG;
  return mix(weight, color, SURFACE_BG);
}
