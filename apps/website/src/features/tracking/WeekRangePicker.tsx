import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import i18n from "../../app/i18n.ts";
import { CalendarIcon, ChevronRightIcon } from "../../shared/ui/icons.tsx";
import { useDismiss } from "../../shared/ui/useDismiss.ts";
import {
  buildMonthWeeks,
  formatTrackQueryDate,
  getWeekStart,
  isSameDay,
  isSameWeek,
  resolveIsoWeekNumber,
} from "./week-range.ts";

export function WeekRangePicker({
  disabled = false,
  label,
  mode = "week",
  onNext,
  onPrev,
  onSelectDate,
  onSelectRange,
  rangeEnd: rangeEndProp,
  rangeStart: rangeStartProp,
  selectedDate,
  sidebar,
  weekStartsOn = 1,
}: {
  disabled?: boolean;
  label: string;
  mode?: "day" | "range" | "week";
  onNext: () => void;
  onPrev: () => void;
  onSelectDate: (date: Date) => void;
  onSelectRange?: (start: Date, end: Date) => void;
  rangeEnd?: Date;
  rangeStart?: Date;
  selectedDate: Date;
  sidebar?: ReactNode;
  weekStartsOn?: number;
}): ReactElement {
  const { t } = useTranslation("tracking");
  const [isOpen, setIsOpen] = useState(false);
  const [headerPicker, setHeaderPicker] = useState<"month" | "year" | null>(null);
  const [yearPageStart, setYearPageStart] = useState(() => new Date().getFullYear() - 5);
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

  // Range mode state: first click sets pendingStart, second click completes the range
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setHeaderPicker(null);
      setPendingStart(null);
      setHoverDate(null);
      return;
    }

    setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [isOpen, selectedDate]);

  const handleDismiss = useCallback(() => setIsOpen(false), []);
  useDismiss(rootRef, isOpen, handleDismiss);

  useEffect(() => {
    if (isOpen) {
      return;
    }
    triggerRef.current?.focus();
  }, [isOpen]);

  const close = useCallback(() => setIsOpen(false), []);

  const hasSidebar = sidebar != null;

  return (
    <div className="relative" ref={rootRef}>
      <div className="flex h-10 min-w-[228px] items-center gap-1 rounded-[10px] border border-[var(--track-border)] bg-[var(--track-surface)] px-1 text-white shadow-[var(--track-depth-shadow-rest)]">
        <button
          aria-label={
            mode === "day"
              ? t("previousDay")
              : mode === "range"
                ? t("previousPeriod")
                : t("previousWeek")
          }
          className={`flex size-8 shrink-0 items-center justify-center rounded-[8px] text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white ${disabled ? "opacity-40" : ""}`}
          disabled={disabled}
          onClick={onPrev}
          type="button"
        >
          <ChevronRightIcon className="size-3 rotate-180" />
        </button>
        <button
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={`${label}. Press Enter to open date picker.`}
          className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-[8px] px-3 text-left transition hover:bg-[var(--track-row-hover)]"
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
          <CalendarIcon className="size-4 shrink-0 text-[var(--track-text-muted)]" />
          <span className="truncate text-[12px] font-semibold">{label}</span>
        </button>
        <button
          aria-label={
            mode === "day" ? t("nextDay") : mode === "range" ? t("nextPeriod") : t("nextWeek")
          }
          className={`flex size-8 shrink-0 items-center justify-center rounded-[8px] text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white ${disabled ? "opacity-40" : ""}`}
          disabled={disabled}
          onClick={onNext}
          type="button"
        >
          <ChevronRightIcon className="size-3" />
        </button>
      </div>

      {isOpen ? (
        <div
          aria-label={t("selectDateRange")}
          aria-modal="false"
          className={`absolute left-0 top-[calc(100%+8px)] z-30 rounded-[12px] border border-[var(--track-border)] bg-[var(--track-surface)] p-4 shadow-[0_18px_48px_var(--track-shadow-elevated)] ${hasSidebar ? "w-[480px]" : "w-[320px]"}`}
          data-testid="week-range-dialog"
          role="dialog"
        >
          <div className={hasSidebar ? "grid grid-cols-[148px_minmax(0,1fr)] gap-0" : ""}>
            {hasSidebar ? (
              <RangePickerSidebarSlot close={close}>{sidebar}</RangePickerSidebarSlot>
            ) : null}

            <div>
              <div className="relative mb-3 flex items-center justify-between gap-2">
                <button
                  aria-label={t("previousMonth")}
                  className="flex size-7 items-center justify-center rounded text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
                  onClick={() => {
                    setHeaderPicker(null);
                    setVisibleMonth(
                      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1),
                    );
                  }}
                  type="button"
                >
                  <ChevronRightIcon className="size-3 rotate-180" />
                </button>
                <div className="flex items-center gap-1">
                  <button
                    className="rounded px-1.5 py-0.5 text-[14px] font-semibold text-white transition hover:bg-[var(--track-row-hover)]"
                    onClick={() => setHeaderPicker(headerPicker === "month" ? null : "month")}
                    type="button"
                  >
                    {new Intl.DateTimeFormat(i18n.language, { month: "long" }).format(visibleMonth)}
                  </button>
                  <button
                    className="rounded px-1.5 py-0.5 text-[14px] font-semibold text-white transition hover:bg-[var(--track-row-hover)]"
                    onClick={() => {
                      if (headerPicker === "year") {
                        setHeaderPicker(null);
                      } else {
                        setYearPageStart(visibleMonth.getFullYear() - 5);
                        setHeaderPicker("year");
                      }
                    }}
                    type="button"
                  >
                    {visibleMonth.getFullYear()}
                  </button>
                </div>
                <button
                  aria-label={t("nextMonth")}
                  className="flex size-7 items-center justify-center rounded text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
                  onClick={() => {
                    setHeaderPicker(null);
                    setVisibleMonth(
                      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1),
                    );
                  }}
                  type="button"
                >
                  <ChevronRightIcon className="size-3" />
                </button>

                {headerPicker === "month" ? (
                  <div className="absolute left-0 top-[calc(100%+4px)] z-10 grid w-full grid-cols-3 gap-1 rounded-lg border border-[var(--track-border)] bg-[var(--track-surface)] p-2 shadow-lg">
                    {Array.from({ length: 12 }, (_, i) => {
                      const monthLabel = new Intl.DateTimeFormat(i18n.language, {
                        month: "short",
                      }).format(new Date(2000, i));
                      const isCurrent = i === visibleMonth.getMonth();
                      return (
                        <button
                          className={`rounded-lg px-2 py-1.5 text-[12px] font-medium transition ${
                            isCurrent
                              ? "bg-[var(--track-accent-strong)] text-white"
                              : "text-[var(--track-overlay-text-muted)] hover:bg-[var(--track-row-hover)] hover:text-white"
                          }`}
                          key={i}
                          onClick={() => {
                            setVisibleMonth(new Date(visibleMonth.getFullYear(), i, 1));
                            setHeaderPicker(null);
                          }}
                          type="button"
                        >
                          {monthLabel}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {headerPicker === "year" ? (
                  <div className="absolute left-0 top-[calc(100%+4px)] z-10 w-full rounded-lg border border-[var(--track-border)] bg-[var(--track-surface)] p-2 shadow-lg">
                    <div className="mb-1 flex items-center justify-between">
                      <button
                        aria-label={t("previousYears")}
                        className="flex size-7 items-center justify-center rounded text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
                        onClick={() => setYearPageStart((y) => y - 12)}
                        type="button"
                      >
                        <ChevronRightIcon className="size-3 rotate-180" />
                      </button>
                      <span className="text-[12px] font-medium text-[var(--track-text-muted)]">
                        {yearPageStart} – {yearPageStart + 11}
                      </span>
                      <button
                        aria-label={t("nextYears")}
                        className="flex size-7 items-center justify-center rounded text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
                        onClick={() => setYearPageStart((y) => y + 12)}
                        type="button"
                      >
                        <ChevronRightIcon className="size-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {Array.from({ length: 12 }, (_, i) => {
                        const year = yearPageStart + i;
                        const isCurrent = year === visibleMonth.getFullYear();
                        return (
                          <button
                            className={`rounded-lg px-2 py-1.5 text-[12px] font-medium transition ${
                              isCurrent
                                ? "bg-[var(--track-accent-strong)] text-white"
                                : "text-[var(--track-overlay-text-muted)] hover:bg-[var(--track-row-hover)] hover:text-white"
                            }`}
                            key={year}
                            onClick={() => {
                              setVisibleMonth(new Date(year, visibleMonth.getMonth(), 1));
                              setHeaderPicker(null);
                            }}
                            type="button"
                          >
                            {year}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-[20px_repeat(7,minmax(0,1fr))] items-center text-center text-[11px] font-semibold text-[var(--track-text-muted)]">
                <span />
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayLabel) => (
                  <span key={dayLabel}>{dayLabel}</span>
                ))}
              </div>

              <div className="mt-1 flex flex-col">
                {weeks.map((week) => {
                  const weekStart = week[0];
                  const isSelectedWeek =
                    mode === "week" && isSameWeek(weekStart, selectedWeekStart, weekStartsOn);

                  if (mode === "range") {
                    // Determine the effective range for highlighting
                    const effectiveStart = pendingStart ?? rangeStartProp;
                    const effectiveEnd = pendingStart
                      ? hoverDate // While selecting, show preview to hover
                      : rangeEndProp;

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

                          // Range highlight logic
                          let rangeClass = "";
                          if (effectiveStart && effectiveEnd) {
                            const lo =
                              effectiveStart <= effectiveEnd ? effectiveStart : effectiveEnd;
                            const hi =
                              effectiveStart <= effectiveEnd ? effectiveEnd : effectiveStart;
                            const dayTime = new Date(
                              day.getFullYear(),
                              day.getMonth(),
                              day.getDate(),
                            ).getTime();
                            const loTime = new Date(
                              lo.getFullYear(),
                              lo.getMonth(),
                              lo.getDate(),
                            ).getTime();
                            const hiTime = new Date(
                              hi.getFullYear(),
                              hi.getMonth(),
                              hi.getDate(),
                            ).getTime();

                            if (dayTime === loTime) {
                              rangeClass =
                                "range-start rounded-l-lg bg-[var(--track-accent-strong)] text-white";
                            } else if (dayTime === hiTime) {
                              rangeClass =
                                "range-end rounded-r-lg bg-[var(--track-accent-strong)] text-white";
                            } else if (dayTime > loTime && dayTime < hiTime) {
                              rangeClass =
                                "range-mid bg-[var(--track-accent-tint)] text-[var(--track-accent-text)]";
                            }
                          } else if (effectiveStart && isSameDay(day, effectiveStart)) {
                            rangeClass =
                              "range-start rounded-lg bg-[var(--track-accent-strong)] text-white";
                          }

                          return (
                            <button
                              aria-label={`Select ${formatTrackQueryDate(day)}`}
                              className={`flex h-[29px] items-center justify-center text-[14px] font-medium transition hover:bg-[var(--track-row-hover)] ${
                                rangeClass
                                  ? rangeClass
                                  : isInVisibleMonth
                                    ? "text-white"
                                    : "text-[var(--track-text-muted)]"
                              }`}
                              key={day.toISOString()}
                              onClick={() => {
                                if (pendingStart == null) {
                                  // First click — set start
                                  setPendingStart(day);
                                } else {
                                  // Second click — complete range
                                  const a = pendingStart;
                                  const b = day;
                                  const start = a <= b ? a : b;
                                  const end = a <= b ? b : a;
                                  setPendingStart(null);
                                  setHoverDate(null);
                                  onSelectRange?.(start, end);
                                  setIsOpen(false);
                                }
                              }}
                              onMouseEnter={() => {
                                if (pendingStart != null) {
                                  setHoverDate(day);
                                }
                              }}
                              type="button"
                            >
                              <span
                                className={
                                  isToday && !rangeClass
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
                                  ? "rounded-lg bg-[var(--track-accent-strong)] text-white"
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
                                      ? `bg-[var(--track-accent-strong)] text-white ${selectedBorderRadius}`
                                      : "bg-[var(--track-accent-tint)] text-[var(--track-accent-text)]"
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

/**
 * Wraps the sidebar ReactNode, cloning onClick handlers to auto-close the picker.
 * Sidebar children that are <button> elements get an automatic close-on-click wrapper.
 */
function RangePickerSidebarSlot({
  children,
  close,
}: {
  children: ReactNode;
  close: () => void;
}): ReactElement {
  return (
    <RangePickerCloseContext.Provider value={close}>
      <div className="pr-3">
        <div className="flex flex-col gap-0.5">{children}</div>
      </div>
    </RangePickerCloseContext.Provider>
  );
}

import { createContext, useContext } from "react";

const RangePickerCloseContext = createContext<(() => void) | null>(null);

/** Hook for sidebar items to close the picker after selection. */
export function useRangePickerClose(): () => void {
  const close = useContext(RangePickerCloseContext);
  if (!close) {
    throw new Error("useRangePickerClose must be used inside WeekRangePicker sidebar");
  }
  return close;
}
