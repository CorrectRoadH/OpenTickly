import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";

import { TrackingIcon } from "./tracking-icons.tsx";
import {
  buildMonthWeeks,
  formatDayLabel,
  formatTrackQueryDate,
  formatWeekRangeLabel,
  getWeekStart,
  isSameDay,
  isSameWeek,
  resolveIsoWeekNumber,
  shiftDay,
  shiftWeek,
  WEEK_SHORTCUTS,
} from "./week-range.ts";

export function QuickDateShortcuts({
  onDayShortcutSelect,
  onSelectDate,
  selectedDate,
  weekStartsOn = 1,
}: {
  onDayShortcutSelect?: (date: Date) => void;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  weekStartsOn?: number;
}): ReactElement {
  return (
    <div className="flex items-center gap-1 rounded-full border border-[var(--track-border)] bg-[#111112] p-0.5">
      {WEEK_SHORTCUTS.map((shortcut) => {
        const shortcutDate = shortcut.resolveDate(new Date());
        const isActive = isSameWeek(shortcutDate, selectedDate, weekStartsOn);

        return (
          <button
            aria-pressed={isActive}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
              isActive
                ? "bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]"
                : "text-white"
            }`}
            key={shortcut.id}
            onClick={() => {
              if ((shortcut.id === "today" || shortcut.id === "yesterday") && onDayShortcutSelect) {
                onDayShortcutSelect(shortcutDate);
              } else {
                onSelectDate(shortcutDate);
              }
            }}
            type="button"
          >
            {shortcut.label}
          </button>
        );
      })}
    </div>
  );
}

export function WeekRangePicker({
  mode = "week",
  onDayShortcutSelect,
  onSelectDate,
  selectedDate,
  weekStartsOn = 1,
}: {
  mode?: "day" | "week";
  onDayShortcutSelect?: (date: Date) => void;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  weekStartsOn?: number;
}): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const selectedWeekStart = getWeekStart(selectedDate, weekStartsOn);
  const weeks = useMemo(
    () => buildMonthWeeks(visibleMonth, weekStartsOn),
    [visibleMonth, weekStartsOn],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [isOpen, selectedDate]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      return;
    }
    triggerRef.current?.focus();
  }, [isOpen]);

  return (
    <div className="relative" ref={rootRef}>
      <div className="flex items-center gap-3">
        <button
          aria-label={mode === "day" ? "Previous day" : "Previous week"}
          className="flex size-7 items-center justify-center rounded text-[var(--track-text-muted)] transition hover:text-white"
          onClick={() =>
            onSelectDate(mode === "day" ? shiftDay(selectedDate, -1) : shiftWeek(selectedDate, -1))
          }
          type="button"
        >
          <TrackingIcon className="size-3 rotate-180" name="chevron-right" />
        </button>
        <button
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={
            mode === "day"
              ? `Day: ${formatDayLabel(selectedDate)}. Press Enter to open day picker.`
              : `Week range: ${formatWeekRangeLabel(selectedDate, weekStartsOn)}. Press Enter to open week picker.`
          }
          className="flex h-9 items-center gap-2 rounded-lg border border-[var(--track-border)] bg-[#1b1b1b] px-3 text-left text-white"
          onClick={() => setIsOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsOpen((current) => !current);
            }
          }}
          ref={triggerRef}
          type="button"
        >
          <TrackingIcon
            className="size-4 shrink-0 text-[var(--track-text-muted)]"
            name="calendar"
          />
          <span className="truncate text-[13px] font-medium">
            {mode === "day"
              ? formatDayLabel(selectedDate)
              : formatWeekRangeLabel(selectedDate, weekStartsOn)}
          </span>
          <TrackingIcon
            className="ml-auto size-3 shrink-0 text-[var(--track-text-muted)]"
            name="chevron-down"
          />
        </button>
        <button
          aria-label={mode === "day" ? "Next day" : "Next week"}
          className="flex size-7 items-center justify-center rounded text-[var(--track-text-muted)] transition hover:text-white"
          onClick={() =>
            onSelectDate(mode === "day" ? shiftDay(selectedDate, 1) : shiftWeek(selectedDate, 1))
          }
          type="button"
        >
          <TrackingIcon className="size-3" name="chevron-right" />
        </button>
      </div>

      {isOpen ? (
        <div
          aria-label="Select week range"
          aria-modal="false"
          className="absolute left-0 top-[calc(100%+8px)] z-30 w-[480px] rounded-lg border border-[var(--track-border)] bg-[#1b1b1b] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
          data-testid="week-range-dialog"
          role="dialog"
        >
          <div className="grid grid-cols-[148px_minmax(0,1fr)] gap-0">
            <div className="pr-3">
              <div className="flex flex-col gap-0.5">
                {WEEK_SHORTCUTS.map((shortcut) => {
                  const shortcutDate = shortcut.resolveDate(new Date());
                  // Today/Yesterday are active only when in day mode and the
                  // selected date matches that day. This week/Last week are
                  // active when in week mode and the selected week matches.
                  let isActive = false;
                  if (shortcut.id === "today" || shortcut.id === "yesterday") {
                    isActive = mode === "day" && isSameDay(shortcutDate, selectedDate);
                  } else {
                    isActive = mode === "week" && isSameWeek(shortcutDate, selectedDate, weekStartsOn);
                  }

                  return (
                    <button
                      aria-pressed={isActive}
                      className={`w-full rounded-lg px-3 py-2 text-left text-[14px] font-medium transition ${
                        isActive
                          ? "bg-[#b744ab] text-white"
                          : "text-[#cfcfcf] hover:bg-[var(--track-row-hover)] hover:text-white"
                      }`}
                      key={shortcut.id}
                      onClick={() => {
                        if (shortcut.id === "today" || shortcut.id === "yesterday") {
                          if (onDayShortcutSelect) {
                            onDayShortcutSelect(shortcutDate);
                          } else {
                            onSelectDate(shortcutDate);
                          }
                        } else {
                          onSelectDate(shortcutDate);
                        }
                        setIsOpen(false);
                      }}
                      type="button"
                    >
                      {shortcut.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <button
                  aria-label="Previous month"
                  className="flex size-7 items-center justify-center rounded text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
                  onClick={() =>
                    setVisibleMonth(
                      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1),
                    )
                  }
                  type="button"
                >
                  <TrackingIcon className="size-3 rotate-180" name="chevron-right" />
                </button>
                <h2 className="text-[16px] font-semibold text-white">
                  {new Intl.DateTimeFormat("en-US", { month: "long" }).format(visibleMonth)}
                  {" "}
                  {visibleMonth.getFullYear()}
                </h2>
                <button
                  aria-label="Next month"
                  className="flex size-7 items-center justify-center rounded text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
                  onClick={() =>
                    setVisibleMonth(
                      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1),
                    )
                  }
                  type="button"
                >
                  <TrackingIcon className="size-3" name="chevron-right" />
                </button>
              </div>

              <div className="grid grid-cols-[20px_repeat(7,minmax(0,1fr))] items-center text-center text-[11px] font-semibold text-[var(--track-text-muted)]">
                <span />
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>

              <div className="mt-1 flex flex-col">
                {weeks.map((week) => {
                  const weekStart = week[0];
                  const isSelectedWeek =
                    mode === "week" && isSameWeek(weekStart, selectedWeekStart, weekStartsOn);

                  if (mode === "day") {
                    return (
                      <div
                        className="grid grid-cols-[20px_repeat(7,minmax(0,1fr))] items-center text-left"
                        key={weekStart.toISOString()}
                      >
                        <span className="text-[12px] font-medium text-[var(--track-text-muted)]">
                          {resolveIsoWeekNumber(weekStart)}
                        </span>
                        {week.map((day) => {
                          const isInVisibleMonth = day.getMonth() === visibleMonth.getMonth();
                          const isToday = isSameDay(day, new Date());
                          const isDaySelected = isSameDay(day, selectedDate);

                          return (
                            <button
                              aria-label={`Select ${formatTrackQueryDate(day)}`}
                              className={`flex h-[29px] items-center justify-center text-[14px] font-medium transition hover:bg-[var(--track-row-hover)] ${
                                isDaySelected
                                  ? "rounded-lg bg-[#b744ab] text-white"
                                  : isInVisibleMonth
                                    ? "text-white"
                                    : "text-[var(--track-text-muted)]"
                              }`}
                              key={day.toISOString()}
                              onClick={() => {
                                onSelectDate(day);
                                setIsOpen(false);
                              }}
                              type="button"
                            >
                              <span
                                className={
                                  isToday && !isDaySelected
                                    ? "flex size-[26px] items-center justify-center rounded-full border border-[var(--track-border)]"
                                    : ""
                                }
                              >
                                {day.getDate()}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  }

                  return (
                    <button
                      aria-label={`Select week ${formatTrackQueryDate(week[0])} to ${formatTrackQueryDate(week[6])}`}
                      className="grid grid-cols-[20px_repeat(7,minmax(0,1fr))] items-center text-left transition hover:bg-[var(--track-row-hover)]"
                      key={weekStart.toISOString()}
                      onClick={() => {
                        onSelectDate(weekStart);
                        setIsOpen(false);
                      }}
                      type="button"
                    >
                      <span className="text-[12px] font-medium text-[var(--track-text-muted)]">
                        {resolveIsoWeekNumber(weekStart)}
                      </span>
                      {week.map((day, index) => {
                        const isStart = index === 0;
                        const isEnd = index === week.length - 1;
                        const isInVisibleMonth = day.getMonth() === visibleMonth.getMonth();
                        const isToday = isSameDay(day, new Date());

                        const selectedBorderRadius = isStart
                          ? "rounded-l-lg"
                          : isEnd
                            ? "rounded-r-lg"
                            : "";

                        return (
                          <span
                            className={`flex h-[29px] items-center justify-center text-[14px] font-medium ${
                              isSelectedWeek
                                ? `${
                                    isStart || isEnd
                                      ? `bg-[#b744ab] text-white ${selectedBorderRadius}`
                                      : "bg-[rgba(183,68,171,0.2)] text-[var(--track-accent-text)]"
                                  }`
                                : isInVisibleMonth
                                  ? "text-white"
                                  : "text-[var(--track-text-muted)]"
                            }`}
                            key={day.toISOString()}
                          >
                            <span
                              className={
                                isToday && !isSelectedWeek
                                  ? "flex size-[26px] items-center justify-center rounded-full border border-[var(--track-border)]"
                                  : ""
                              }
                            >
                              {day.getDate()}
                            </span>
                          </span>
                        );
                      })}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
