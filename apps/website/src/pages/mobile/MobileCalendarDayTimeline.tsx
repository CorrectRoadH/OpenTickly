import { type ReactElement, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

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
  onEntryTap?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  timezone: string;
  viewDate?: Date;
};

export function MobileCalendarDayTimeline({
  entries,
  onEntryTap,
  timezone,
  viewDate,
}: MobileCalendarDayTimelineProps): ReactElement {
  const { t } = useTranslation("mobile");
  // Minute-resolution tick for running entry block position + current-time indicator
  const [nowMs, setNowMs] = useState(() => Math.floor(Date.now() / 60_000) * 60_000);
  useEffect(() => {
    const id = setInterval(() => {
      const next = Math.floor(Date.now() / 60_000) * 60_000;
      setNowMs((prev) => (prev === next ? prev : next));
    }, 5_000);
    return () => clearInterval(id);
  }, []);
  const { durationFormat } = useUserPreferences();
  const scrollRef = useRef<HTMLDivElement>(null);

  const layouts = buildCalendarEventLayouts(entries, timezone, nowMs, viewDate);

  // Current time position
  const nowDate = new Date(nowMs);
  const nowMinutes = (() => {
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
  })();

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

        {/* Current time indicator — purely visual, must not block taps on
            entries that overlap "now" (e.g. an entry running across the
            current minute). Without `pointer-events-none` the red line's
            full-width div intercepts clicks targeting the entry button
            beneath it, breaking the mobile calendar editor flow on CI
            runs that happen to land inside the entry's time range. */}
        <div
          className="pointer-events-none absolute left-10 right-0 z-10 border-t-2 border-[var(--track-accent)]"
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
            const description = entry.description?.trim() || t("noDescription");

            return (
              <button
                key={key}
                aria-label={t("editTimeEntry", { description })}
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
