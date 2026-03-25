import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";

import { TrackingIcon } from "./tracking-icons.tsx";
import {
  buildMonthWeeks,
  formatTrackQueryDate,
  formatWeekRangeLabel,
  getWeekStart,
  isSameDay,
  isSameWeek,
  resolveIsoWeekNumber,
  shiftWeek,
  WEEK_SHORTCUTS,
} from "./week-range.ts";

export function QuickDateShortcuts({
  onSelectDate,
  selectedDate,
}: {
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
}): ReactElement {
  return (
    <div className="flex items-center gap-1 rounded-full border border-[var(--track-border)] bg-[#111112] p-0.5">
      {WEEK_SHORTCUTS.map((shortcut) => {
        const shortcutDate = shortcut.resolveDate(new Date());
        const isActive = isSameWeek(shortcutDate, selectedDate);

        return (
          <button
            aria-pressed={isActive}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
              isActive
                ? "bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]"
                : "text-white"
            }`}
            key={shortcut.id}
            onClick={() => onSelectDate(shortcutDate)}
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
  onSelectDate,
  selectedDate,
}: {
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
}): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const selectedWeekStart = getWeekStart(selectedDate);
  const weeks = useMemo(() => buildMonthWeeks(visibleMonth), [visibleMonth]);

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
          aria-label="Previous week"
          className="flex size-9 items-center justify-center rounded-md border border-[var(--track-border)] bg-[#1b1b1b] text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
          onClick={() => onSelectDate(shiftWeek(selectedDate, -1))}
          type="button"
        >
          <TrackingIcon className="size-3 rotate-180" name="chevron-right" />
        </button>
        <button
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={`Week range: ${formatWeekRangeLabel(selectedDate)}. Press Enter to open week picker.`}
          className="flex h-14 min-w-[min(100%,34rem)] items-center gap-4 rounded-2xl border border-[var(--track-border)] bg-[#1b1b1b] px-6 text-left text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]"
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
          <TrackingIcon className="size-5 shrink-0 text-white" name="calendar" />
          <span className="truncate text-[18px] font-medium tracking-[0.01em]">
            {formatWeekRangeLabel(selectedDate)}
          </span>
          <TrackingIcon
            className="ml-auto size-3 shrink-0 text-[var(--track-text-muted)]"
            name="chevron-down"
          />
        </button>
        <button
          aria-label="Next week"
          className="flex size-9 items-center justify-center rounded-md border border-[var(--track-border)] bg-[#1b1b1b] text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
          onClick={() => onSelectDate(shiftWeek(selectedDate, 1))}
          type="button"
        >
          <TrackingIcon className="size-3" name="chevron-right" />
        </button>
      </div>

      {isOpen ? (
        <div
          aria-label="Select week range"
          aria-modal="false"
          className="absolute left-0 top-[calc(100%+16px)] z-30 w-[min(100vw-4rem,59rem)] rounded-3xl border border-[var(--track-border)] bg-[#1b1b1b] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          data-testid="week-range-dialog"
          role="dialog"
        >
          <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="border-b border-[var(--track-border)] pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
              <div className="flex flex-col gap-3">
                {WEEK_SHORTCUTS.map((shortcut) => {
                  const shortcutDate = shortcut.resolveDate(new Date());
                  const isActive = isSameWeek(shortcutDate, selectedDate);

                  return (
                    <button
                      aria-pressed={isActive}
                      className={`w-full rounded-2xl px-4 py-3 text-left text-[18px] font-medium transition ${
                        isActive
                          ? "bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]"
                          : "text-[#cfcfcf] hover:bg-[var(--track-row-hover)] hover:text-white"
                      }`}
                      key={shortcut.id}
                      onClick={() => {
                        onSelectDate(shortcutDate);
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
              <div className="mb-8 flex items-center justify-between gap-4">
                <button
                  aria-label="Previous month"
                  className="flex size-14 items-center justify-center rounded-2xl border border-[var(--track-border)] text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
                  onClick={() =>
                    setVisibleMonth(
                      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1),
                    )
                  }
                  type="button"
                >
                  <TrackingIcon className="size-4 rotate-180" name="chevron-right" />
                </button>
                <h2 className="flex items-center gap-3 text-[28px] font-semibold tracking-[0.01em] text-white">
                  <span>
                    {new Intl.DateTimeFormat("en-US", { month: "long" }).format(visibleMonth)}
                  </span>
                  <span>{visibleMonth.getFullYear()}</span>
                  <TrackingIcon
                    className="size-4 text-[var(--track-text-muted)]"
                    name="chevron-down"
                  />
                </h2>
                <button
                  aria-label="Next month"
                  className="flex size-14 items-center justify-center rounded-2xl border border-[var(--track-border)] text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
                  onClick={() =>
                    setVisibleMonth(
                      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1),
                    )
                  }
                  type="button"
                >
                  <TrackingIcon className="size-4" name="chevron-right" />
                </button>
              </div>

              <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] items-center gap-y-2 text-center text-[15px] font-medium text-[var(--track-text-muted)]">
                <span />
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {weeks.map((week) => {
                  const weekStart = week[0];
                  const isSelectedWeek = isSameWeek(weekStart, selectedWeekStart);

                  return (
                    <button
                      aria-label={`Select week ${formatTrackQueryDate(week[0])} to ${formatTrackQueryDate(week[6])}`}
                      className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] items-center gap-y-2 rounded-2xl px-2 py-2 text-left transition hover:bg-[var(--track-row-hover)]"
                      key={weekStart.toISOString()}
                      onClick={() => {
                        onSelectDate(weekStart);
                        setIsOpen(false);
                      }}
                      type="button"
                    >
                      <span className="pr-3 text-[18px] font-medium text-[var(--track-text-muted)]">
                        W{resolveIsoWeekNumber(weekStart)}
                      </span>
                      {week.map((day, index) => {
                        const isEdge = index === 0 || index === week.length - 1;
                        const isInVisibleMonth = day.getMonth() === visibleMonth.getMonth();

                        return (
                          <span
                            className={`flex h-12 items-center justify-center text-[20px] font-medium ${
                              isSelectedWeek
                                ? `bg-[var(--track-accent-soft)] text-[var(--track-accent-text)] ${
                                    isEdge ? "rounded-2xl" : ""
                                  }`
                                : isInVisibleMonth
                                  ? "text-white"
                                  : "text-[var(--track-text-muted)]"
                            }`}
                            key={day.toISOString()}
                          >
                            <span
                              className={
                                isSameDay(day, new Date()) && !isSelectedWeek
                                  ? "rounded-full border border-[var(--track-border)] px-3 py-1"
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
