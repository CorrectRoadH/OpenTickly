import React, { type ReactElement, useEffect, useRef, useState } from "react";
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
import { formatClockTime } from "./overview-data.ts";

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
  timeFormat = "h:mm A",
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

  // Scroll-to-now on mount. The calendar uses window-level scroll (no
  // internal scrollbar, by design — see calendar.css:89), so we scroll
  // the window. Default target lands the current-time indicator at the
  // vertical middle of the viewport — the UX contract locked in
  // `time-entry-full-edit.spec.ts` ("current time indicator is centered
  // in the viewport").
  //
  // Refinement: if any entry card on the visible range renders ABOVE the
  // now-centered scroll target (e.g. an 01:00 entry when "now" is 16:00),
  // pull the scroll up so the earliest entry stays visible with a small
  // header margin. Without this, entries above "now" are in the DOM but
  // outside the scroll viewport — users report them as "invisible".
  //
  // The refinement only ever scrolls LESS than the now-centered target,
  // never more — so when entries are around or below "now" the indicator
  // still lands at viewport center and the existing contract holds.
  //
  // `.rbc-current-time-indicator` is added by RBC several layout passes
  // after our mount, so we can't read its position in a single frame.
  // We use a MutationObserver on the calendar wrapper — no time budget,
  // no flaky frame-count cap — and signal completion via the
  // `data-scroll-to-now` attribute on the wrapper:
  //   "pending"  — effect mounted, indicator not yet resolved
  //   "done"     — indicator found, window scrolled
  //   "skipped"  — indicator found, target ≤ 0 so we left scrollY alone
  // E2E gates on this attribute instead of timing guesses.
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const EARLIEST_EVENT_HEADER_MARGIN_PX = 80;

    const computeEarliestEventAbsoluteTop = (): number | null => {
      const cards = wrapper.querySelectorAll<HTMLElement>('[data-testid^="calendar-entry-"]');
      if (cards.length === 0) return null;
      let min = Number.POSITIVE_INFINITY;
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        // Skip zero-height placeholders during layout.
        if (rect.height <= 0) continue;
        const absoluteTop = rect.top + window.scrollY;
        if (absoluteTop < min) min = absoluteTop;
      }
      return Number.isFinite(min) ? min : null;
    };

    const applyScrollFor = (indicator: HTMLElement) => {
      const indicatorAbsoluteY = indicator.getBoundingClientRect().top + window.scrollY;
      const nowCenteredTarget = indicatorAbsoluteY - window.innerHeight / 2;
      const earliestEventTop = computeEarliestEventAbsoluteTop();
      const target =
        earliestEventTop !== null
          ? Math.min(nowCenteredTarget, earliestEventTop - EARLIEST_EVENT_HEADER_MARGIN_PX)
          : nowCenteredTarget;
      if (target > 0) {
        window.scrollTo({ top: target, behavior: "instant" });
        wrapper.dataset.scrollToNow = "done";
      } else {
        wrapper.dataset.scrollToNow = "skipped";
      }
    };

    const existing = wrapper.querySelector<HTMLElement>(".rbc-current-time-indicator");
    if (existing) {
      applyScrollFor(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = wrapper.querySelector<HTMLElement>(".rbc-current-time-indicator");
      if (el) {
        applyScrollFor(el);
        observer.disconnect();
      }
    });
    observer.observe(wrapper, { childList: true, subtree: true });
    return () => observer.disconnect();
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
    // No border-top here: `.rbc-time-header` owns the visual separator via its
    // own `border-top` (calendar.css). A second border on this wrapper stacks
    // with the timer bar's `border-bottom` when the page is scrolled to the
    // top (sticky is inactive, day-header is in natural flow), making the
    // seam visually jump from 1px to 2px once the user scrolls back to top.
    <div
      className="bg-[var(--track-surface)]"
      data-scroll-to-now="pending"
      data-testid="timer-calendar-view"
      ref={wrapperRef}
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
        formats={{
          timeGutterFormat: (date: Date) => formatClockTime(date, timezone, timeFormat),
        }}
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
          // A drop is a MOVE: onMoveEntry already shifts both start and
          // stop in a single PUT. Do NOT additionally fire onResizeEntry
          // here — that would issue a second concurrent PUT computed from
          // the stale pre-move snapshot, and last-write-wins would reset
          // `start` back to the original.
          if (minutesDelta !== 0) {
            void onMoveEntry?.(event.id, minutesDelta);
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
