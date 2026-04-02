import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { formatClockDuration } from "./overview-data.ts";
import { SummaryStat } from "./overview-views.tsx";
import { useTimerViewStore } from "./store/timer-view-store.ts";
import { useWorkspaceData } from "./useWorkspaceData.ts";
import { useTimeEntryViews } from "./useTimeEntryViews.ts";

/**
 * Self-contained header stats: today total, week total, and project filter strip.
 * Subscribes to useTimeEntryViews internally so the parent doesn't need to.
 */
export function TimerHeaderStats({ hideLabel }: { hideLabel: boolean }): ReactElement {
  const { t } = useTranslation("tracking");
  const { durationFormat } = useUserPreferences();
  const { workspaceId, timezone } = useWorkspaceData();
  const view = useTimerViewStore((s) => s.view);
  const views = useTimeEntryViews({ workspaceId, timezone, showAllEntries: false });

  return (
    <>
      {view === "list" ? (
        <SummaryStat
          hideLabel={hideLabel}
          label={t("todayTotal")}
          value={
            views.todayTotalSeconds > 0
              ? formatClockDuration(views.todayTotalSeconds, durationFormat)
              : "0:00:00"
          }
        />
      ) : null}
      <SummaryStat
        hideLabel={hideLabel}
        label={t("weekTotal")}
        value={formatClockDuration(views.weekTotalSeconds, durationFormat)}
      />
    </>
  );
}

export function ProjectFilterStrip(): ReactElement | null {
  const { workspaceId, timezone } = useWorkspaceData();
  const views = useTimeEntryViews({ workspaceId, timezone, showAllEntries: false });

  if (views.trackStrip.length === 0) return null;

  const totalSeconds = views.trackStrip.reduce((sum, item) => sum + item.totalSeconds, 0);

  return (
    <div className="mt-3 flex h-[22px] overflow-hidden" data-testid="project-filter-strip">
      {views.trackStrip.map((item) => {
        const pct =
          totalSeconds > 0
            ? (item.totalSeconds / totalSeconds) * 100
            : 100 / views.trackStrip.length;
        return (
          <div
            className="min-w-0 overflow-hidden border-r border-[var(--track-surface)] last:border-r-0"
            key={item.label}
            style={{ width: `${pct}%` }}
          >
            <div
              className="truncate px-1.5 text-[11px] font-medium uppercase tracking-wide"
              style={{ color: item.color }}
            >
              {item.label}
            </div>
            <div className="mt-0.5 h-[3px]" style={{ backgroundColor: item.color }} />
          </div>
        );
      })}
    </div>
  );
}
