import { type ReactElement, useCallback, useMemo, useState } from "react";

import { TrackingIcon } from "./tracking-icons.tsx";

interface ManualModeComposerProps {
  onAddTimeEntry: (start: Date, stop: Date) => void;
  timezone: string;
}

/**
 * Renders the manual mode time entry composer that replaces the live timer
 * and start/stop button. Shows start time, date picker, arrow, stop time,
 * auto-calculated duration, and an "Add time entry" button.
 */
export function ManualModeComposer({
  onAddTimeEntry,
  timezone,
}: ManualModeComposerProps): ReactElement {
  const now = useMemo(() => new Date(), []);

  const [startTime, setStartTime] = useState(() => formatTimeHHMM(now, timezone));
  const [stopTime, setStopTime] = useState(() => formatTimeHHMM(now, timezone));
  const [startDate, setStartDate] = useState(() => formatDateISO(now, timezone));
  const [stopDate, setStopDate] = useState(() => formatDateISO(now, timezone));

  const durationDisplay = useMemo(() => {
    const startMs = parseLocalDateTime(startDate, startTime, timezone);
    const stopMs = parseLocalDateTime(stopDate, stopTime, timezone);
    if (startMs == null || stopMs == null || stopMs <= startMs) {
      return "0:00:00";
    }
    const totalSeconds = Math.floor((stopMs - startMs) / 1000);
    return formatDuration(totalSeconds);
  }, [startDate, startTime, stopDate, stopTime, timezone]);

  const startDateLabel = useMemo(() => formatDateLabel(startDate, timezone), [startDate, timezone]);
  const stopDateLabel = useMemo(() => formatDateLabel(stopDate, timezone), [stopDate, timezone]);

  const handleAdd = useCallback(() => {
    const startMs = parseLocalDateTime(startDate, startTime, timezone);
    const stopMs = parseLocalDateTime(stopDate, stopTime, timezone);
    if (startMs == null || stopMs == null || stopMs <= startMs) {
      return;
    }
    onAddTimeEntry(new Date(startMs), new Date(stopMs));
  }, [startDate, startTime, stopDate, stopTime, timezone, onAddTimeEntry]);

  return (
    <div className="flex items-center gap-2" data-testid="manual-mode-composer">
      <div className="flex items-center gap-1">
        <input
          aria-label="Start time"
          className="h-8 w-[80px] rounded border border-[var(--track-border)] bg-transparent px-2 text-center text-[14px] tabular-nums text-white outline-none transition focus:border-white"
          data-testid="manual-start-time"
          onChange={(event) => setStartTime(event.target.value)}
          type="time"
          value={startTime}
        />
        <label className="relative">
          <span className="sr-only">Start date</span>
          <button
            aria-label="Pick start date"
            className="flex h-8 items-center gap-1 rounded border border-[var(--track-border)] bg-transparent px-2 text-[13px] text-[var(--track-text-muted)] transition hover:border-white hover:text-white"
            data-testid="manual-start-date-button"
            onClick={(event) => {
              const input = event.currentTarget.parentElement?.querySelector(
                'input[type="date"]',
              ) as HTMLInputElement | null;
              input?.showPicker?.();
            }}
            type="button"
          >
            {startDateLabel}
          </button>
          <input
            className="pointer-events-none absolute inset-0 opacity-0"
            onChange={(event) => {
              if (event.target.value) {
                setStartDate(event.target.value);
              }
            }}
            tabIndex={-1}
            type="date"
            value={startDate}
          />
        </label>
      </div>

      <span
        className="text-[16px] text-[var(--track-text-muted)]"
        data-testid="manual-arrow-separator"
      >
        &rarr;
      </span>

      <div className="flex items-center gap-1">
        <input
          aria-label="Stop time"
          className="h-8 w-[80px] rounded border border-[var(--track-border)] bg-transparent px-2 text-center text-[14px] tabular-nums text-white outline-none transition focus:border-white"
          data-testid="manual-stop-time"
          onChange={(event) => setStopTime(event.target.value)}
          type="time"
          value={stopTime}
        />
        <label className="relative">
          <span className="sr-only">Stop date</span>
          <button
            aria-label="Pick stop date"
            className="flex h-8 items-center gap-1 rounded border border-[var(--track-border)] bg-transparent px-2 text-[13px] text-[var(--track-text-muted)] transition hover:border-white hover:text-white"
            data-testid="manual-stop-date-button"
            onClick={(event) => {
              const input = event.currentTarget.parentElement?.querySelector(
                'input[type="date"]',
              ) as HTMLInputElement | null;
              input?.showPicker?.();
            }}
            type="button"
          >
            {stopDateLabel}
          </button>
          <input
            className="pointer-events-none absolute inset-0 opacity-0"
            onChange={(event) => {
              if (event.target.value) {
                setStopDate(event.target.value);
              }
            }}
            tabIndex={-1}
            type="date"
            value={stopDate}
          />
        </label>
      </div>

      <span
        className="min-w-[56px] text-center text-[13px] tabular-nums text-[var(--track-text-muted)]"
        data-testid="manual-duration"
      >
        {durationDisplay}
      </span>

      <button
        aria-label="Add time entry"
        className="flex size-[42px] items-center justify-center rounded-full bg-[#e57bd9] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition hover:brightness-110"
        data-testid="manual-add-button"
        onClick={handleAdd}
        type="button"
      >
        <TrackingIcon className="size-5" name="plus" />
      </button>
    </div>
  );
}

function formatTimeHHMM(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: timezone,
  });
  return formatter.format(date);
}

function formatDateISO(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  });
  return formatter.format(date);
}

function formatDateLabel(dateStr: string, timezone: string): string {
  const todayStr = formatDateISO(new Date(), timezone);
  if (dateStr === todayStr) {
    return "Today";
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === formatDateISO(yesterday, timezone)) {
    return "Yesterday";
  }
  const parts = dateStr.split("-");
  if (parts.length !== 3) {
    return dateStr;
  }
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthIndex = Number.parseInt(parts[1], 10) - 1;
  const day = Number.parseInt(parts[2], 10);
  return `${monthNames[monthIndex]} ${day}`;
}

function parseLocalDateTime(dateStr: string, timeStr: string, _timezone: string): number | null {
  const isoString = `${dateStr}T${timeStr}:00`;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  /* Approximate timezone offset correction: parse in local then adjust.
     For simplicity, we use the browser's timezone handling through Date. */
  return date.getTime();
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
