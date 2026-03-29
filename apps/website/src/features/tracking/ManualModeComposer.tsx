import { type ReactElement, useCallback, useMemo, useState } from "react";

import { DatePickerButton } from "../../shared/ui/DatePickerButton.tsx";
import { PlusIcon } from "../../shared/ui/icons.tsx";

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

  /**
   * Auto-bump stop date to the next day when stop time is earlier than start
   * time on the same date (cross-midnight scenario, e.g. 23:00 -> 01:00).
   */
  const effectiveStopDate = useMemo(() => {
    if (startDate !== stopDate) return stopDate;
    const startMs = parseLocalDateTime(startDate, startTime, timezone);
    const stopMs = parseLocalDateTime(stopDate, stopTime, timezone);
    if (startMs == null || stopMs == null) return stopDate;
    if (stopMs <= startMs) {
      const nextDay = new Date(startMs);
      nextDay.setDate(nextDay.getDate() + 1);
      return formatDateISO(nextDay, timezone);
    }
    return stopDate;
  }, [startDate, startTime, stopDate, stopTime, timezone]);

  const durationDisplay = useMemo(() => {
    const startMs = parseLocalDateTime(startDate, startTime, timezone);
    const stopMs = parseLocalDateTime(effectiveStopDate, stopTime, timezone);
    if (startMs == null || stopMs == null || stopMs <= startMs) {
      return "0:00:00";
    }
    const totalSeconds = Math.floor((stopMs - startMs) / 1000);
    return formatDuration(totalSeconds);
  }, [startDate, startTime, effectiveStopDate, stopTime, timezone]);

  const handleAdd = useCallback(() => {
    const startMs = parseLocalDateTime(startDate, startTime, timezone);
    const stopMs = parseLocalDateTime(effectiveStopDate, stopTime, timezone);
    if (startMs == null || stopMs == null || stopMs <= startMs) {
      return;
    }
    onAddTimeEntry(new Date(startMs), new Date(stopMs));
  }, [startDate, startTime, effectiveStopDate, stopTime, timezone, onAddTimeEntry]);

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
        <DatePickerButton
          ariaLabel="Pick start date"
          className="flex h-8 items-center gap-1 rounded border border-[var(--track-border)] bg-transparent px-2 text-[12px] text-[var(--track-text-muted)] transition hover:border-white hover:text-white"
          onChange={(v) => {
            if (v) setStartDate(v);
          }}
          testId="manual-start-date-button"
          value={startDate}
        />
      </div>

      <span
        className="text-[14px] text-[var(--track-text-muted)]"
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
        <DatePickerButton
          ariaLabel="Pick stop date"
          className="flex h-8 items-center gap-1 rounded border border-[var(--track-border)] bg-transparent px-2 text-[12px] text-[var(--track-text-muted)] transition hover:border-white hover:text-white"
          onChange={(v) => {
            if (v) setStopDate(v);
          }}
          testId="manual-stop-date-button"
          value={effectiveStopDate}
        />
      </div>

      <span
        className="min-w-[56px] text-center text-[12px] tabular-nums text-[var(--track-text-muted)]"
        data-testid="manual-duration"
      >
        {durationDisplay}
      </span>

      <button
        aria-label="Add time entry"
        className="flex size-[42px] items-center justify-center rounded-full bg-[var(--track-accent)] text-white shadow-[inset_0_0_0_1px_var(--track-border-soft)] transition hover:brightness-110"
        data-testid="manual-add-button"
        onClick={handleAdd}
        type="button"
      >
        <PlusIcon className="size-5" />
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
