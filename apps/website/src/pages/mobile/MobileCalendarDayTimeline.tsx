import { type ReactElement, useEffect, useMemo, useRef } from "react";

import i18n from "../../app/i18n.ts";
import {
  buildCalendarEventLayouts,
  resolveLayoutKey,
} from "../../features/tracking/calendar-layout.ts";
import {
  formatClockDuration,
  resolveEntryColor,
  resolveEntryDurationSeconds,
} from "../../features/tracking/overview-data.ts";
import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";

const HOUR_HEIGHT = 60; // px per hour
const TOTAL_MINUTES = 24 * 60;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

type MobileCalendarDayTimelineProps = {
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  nowMs: number;
  onEntryTap?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  timezone: string;
  viewDate?: Date;
};

export function MobileCalendarDayTimeline({
  entries,
  nowMs,
  onEntryTap,
  timezone,
  viewDate,
}: MobileCalendarDayTimelineProps): ReactElement {
  const { durationFormat } = useUserPreferences();
  const scrollRef = useRef<HTMLDivElement>(null);

  const layouts = useMemo(
    () => buildCalendarEventLayouts(entries, timezone, nowMs, viewDate),
    [entries, timezone, nowMs, viewDate],
  );

  // Current time position
  const nowDate = useMemo(() => new Date(nowMs), [nowMs]);
  const nowMinutes = useMemo(() => {
    const h = Number(
      new Intl.DateTimeFormat(i18n.language, {
        hour: "2-digit",
        hour12: false,
        timeZone: timezone,
      }).format(nowDate),
    );
    const m = Number(
      new Intl.DateTimeFormat(i18n.language, { minute: "2-digit", timeZone: timezone }).format(
        nowDate,
      ),
    );
    return h * 60 + m;
  }, [nowDate, timezone]);

  // Scroll to current hour on mount
  useEffect(() => {
    if (scrollRef.current) {
      const targetY = Math.max(0, (nowMinutes / 60 - 1) * HOUR_HEIGHT);
      scrollRef.current.scrollTop = targetY;
    }
  }, []);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="relative" style={{ height: (TOTAL_MINUTES / 60) * HOUR_HEIGHT }}>
        {/* Hour grid lines */}
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="absolute left-0 right-0 border-t border-[var(--track-border)]"
            style={{ top: hour * HOUR_HEIGHT }}
          >
            <span className="absolute -top-[8px] left-2 text-[10px] tabular-nums text-[var(--track-text-muted)]">
              {String(hour).padStart(2, "0")}:00
            </span>
          </div>
        ))}

        {/* Current time indicator */}
        <div
          className="absolute left-10 right-0 z-10 border-t-2 border-[var(--track-accent)]"
          style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}
        >
          <div className="absolute -left-1.5 -top-[5px] size-[8px] rounded-full bg-[var(--track-accent)]" />
        </div>

        {/* Time entries */}
        <div className="absolute bottom-0 left-14 right-2 top-0">
          {entries.map((entry, index) => {
            const key = resolveLayoutKey(entry, index);
            const layout = layouts.get(key);
            if (!layout) return null;

            const color = resolveEntryColor(entry);
            const seconds = resolveEntryDurationSeconds(entry, nowMs);
            const description = entry.description?.trim() || "No description";

            return (
              <button
                key={key}
                aria-label={`Edit ${description}`}
                className="absolute overflow-hidden rounded-[4px] border border-white/10 px-1.5 py-0.5 text-left"
                onClick={() => onEntryTap?.(entry)}
                type="button"
                style={{
                  top: (layout.top / 60) * HOUR_HEIGHT,
                  height: Math.max(20, (layout.height / 60) * HOUR_HEIGHT),
                  left: `${layout.left}%`,
                  width: `${layout.width}%`,
                  backgroundColor: color,
                }}
              >
                <p className="truncate text-[11px] font-medium leading-tight text-white">
                  {description}
                </p>
                {layout.height >= 30 ? (
                  <p className="text-[10px] leading-tight text-white/70">
                    {formatClockDuration(seconds, durationFormat)}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
