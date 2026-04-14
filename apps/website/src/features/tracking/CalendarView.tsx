import React, { type ReactElement, useEffect, useState } from "react";
import { Calendar, Views } from "react-big-calendar";
import withDragAndDropModule from "react-big-calendar/lib/addons/dragAndDrop";
import type { EventProps, SlotInfo } from "react-big-calendar";
import type { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import "./calendar.css";
import { calendarDayLayout } from "./calendar-day-layout.ts";
import { CalendarEntryContextMenu } from "./CalendarEntryContextMenu.tsx";
import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import type { CalendarEvent, CalendarViewProps } from "./calendar-types.ts";
import { buildCalendarLocalizer, formatDateIso } from "./calendar-types.ts";
export type { CalendarContextMenuAction } from "./calendar-types.ts";
import { CalendarDayColumnWrapper } from "./CalendarDayColumnWrapper.tsx";
import { CalendarDayHeader } from "./CalendarDayHeader.tsx";
import { CalendarEventCard } from "./CalendarEventCard.tsx";
import { CalendarZoomControls } from "./CalendarZoomControls.tsx";
import { buildDailyTotals, buildEvents } from "./calendar-events-builder.ts";

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

export function CalendarView({
  calendarHours = "all",
  draftEntry,
  entries,
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
}: CalendarViewProps): ReactElement {
  // Two independent ticks, co-scheduled on one setInterval to keep re-render
  // cadence predictable:
  //  - nowMinuteMs advances every minute, drives buildEvents for the
  //    running-entry live length in the grid.
  //  - todayDayStartMs advances at most once per local day, drives the
  //    isToday highlight in the day header.
  // Deriving `today` from its own state (instead of `new Date()` inline)
  // is what lets React Compiler keep `calendarComponents` ref-stable on
  // minute rollovers — without this, the inline `header` arrow closes
  // over a brand-new Date every render, forcing RBC to unmount+remount
  // the TimeGridHeader subtree. See e2e/calendar-header-rerender.spec.ts.
  const [nowMinuteMs, setNowMinuteMs] = useState(() => Math.floor(Date.now() / 60_000) * 60_000);
  const [todayDayStartMs, setTodayDayStartMs] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const nextMinute = Math.floor(Date.now() / 60_000) * 60_000;
      setNowMinuteMs((prev) => (prev === nextMinute ? prev : nextMinute));
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      const nextDay = d.getTime();
      setTodayDayStartMs((prev) => (prev === nextDay ? prev : nextDay));
    }, 5_000);
    return () => clearInterval(id);
  }, []);

  const now = new Date(nowMinuteMs);
  const calendarLocalizer = buildCalendarLocalizer(weekStartsOn);
  const calendarDate = (() => {
    if (subview === "day" && selectedSubviewDateIso) {
      return new Date(`${selectedSubviewDateIso}T00:00:00`);
    }
    return weekDays[0] ?? now;
  })();

  const events = buildEvents(entries, draftEntry, runningEntry, nowMinuteMs);
  const dailyTotals = buildDailyTotals(entries, weekDays, timezone);
  const today = new Date(todayDayStartMs);

  const currentView =
    subview === "day" ? Views.DAY : subview === "five-day" ? Views.WORK_WEEK : Views.WEEK;
  const minTime = (() => {
    const date = new Date(calendarDate);
    date.setHours(calendarHours === "business" ? 9 : 0, 0, 0, 0);
    return date;
  })();
  const maxTime = (() => {
    const date = new Date(calendarDate);
    if (calendarHours === "business") {
      date.setHours(17, 0, 0, 0);
    } else {
      date.setHours(23, 59, 59, 999);
    }
    return date;
  })();
  const step = zoom > 0 ? 15 : 30;
  const timeslots = zoom > 0 ? 4 : 2;

  const scrollToTime = (() => {
    const n = new Date();
    n.setMinutes(0, 0, 0);
    n.setHours(Math.max(0, n.getHours() - 1));
    return n;
  })();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const indicator = document.querySelector(".rbc-current-time-indicator");
      if (indicator) {
        indicator.scrollIntoView({ block: "center", behavior: "instant" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const [contextMenuState, setContextMenuState] = useState<{
    entry: GithubComTogglTogglApiInternalModelsTimeEntry;
    x: number;
    y: number;
  } | null>(null);

  // Stable handler so every call to `components.event(props)` below passes
  // the same onContextMenu reference. Inline-constructing this arrow made
  // CalendarEventCard's prop identity change on every RBC-internal render
  // (e.g. after clicking an event), defeating memoization and forcing all
  // event cards to re-render each time any one was clicked.
  const handleEventContextMenu = (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    x: number,
    y: number,
  ) => {
    setContextMenuState({ entry, x, y });
  };

  const calendarComponents = {
    event: (props: EventProps<CalendarEvent>) => (
      <CalendarEventCard
        event={props.event}
        onContextMenu={handleEventContextMenu}
        onContinueEntry={onContinueEntry}
        onEditEntry={onEditEntry}
      />
    ),
    header: ({ date }: { date: Date }) => (
      <CalendarDayHeader date={date} dailyTotals={dailyTotals} timezone={timezone} today={today} />
    ),
    timeGutterHeader: () => (
      <CalendarZoomControls zoom={zoom} onZoomIn={onZoomIn} onZoomOut={onZoomOut} />
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
  };

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
            onSelectSlot?.({ end: slotInfo.end, start: slotInfo.start });
          }
        }}
        resizable
        resizableAccessor={(event) =>
          !event.resource.isLocked && !event.resource.isRunning && !event.resource.isDraft
        }
        scrollToTime={scrollToTime}
        selectable
        startAccessor={(event) => event.start}
        step={step}
        timeslots={timeslots}
        toolbar={false}
        onView={() => undefined}
        view={currentView}
        views={[Views.WEEK, Views.WORK_WEEK, Views.DAY]}
      />
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
