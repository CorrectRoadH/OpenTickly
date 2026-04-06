import { type ReactElement, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { WeekRangePicker } from "../../features/tracking/WeekRangePicker.tsx";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { useWorkspaceWeeklyReportQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { DurationChart, DistributionPanel } from "../shell/ReportsCharts.tsx";
import { SummaryMetrics } from "../shell/ReportsSharedWidgets.tsx";
import { buildReportsPageModel, filterReportRows } from "../shell/reports-page-data.ts";
import { useReportsPageState } from "../shell/useReportsPageState.ts";

export function MobileReportPage(): ReactElement {
  const { t } = useTranslation("mobile");
  const { beginningOfWeek } = useUserPreferences();
  const session = useSession();
  const timezone = session.user.timezone ?? "UTC";
  const workspaceId = session.currentWorkspace.id;
  const state = useReportsPageState(timezone, beginningOfWeek);

  const weeklyReportQuery = useWorkspaceWeeklyReportQuery(workspaceId, {
    endDate: state.dateRange.endDate,
    startDate: state.dateRange.startDate,
  });

  const filteredReport = useMemo(
    () => filterReportRows(weeklyReportQuery.data, state.memberFilter, state.clientFilter),
    [weeklyReportQuery.data, state.memberFilter, state.clientFilter],
  );

  const model = useMemo(
    () =>
      buildReportsPageModel({
        endDate: state.dateRange.endDate,
        report: filteredReport,
        startDate: state.dateRange.startDate,
        timezone,
        weekStartsOn: beginningOfWeek,
      }),
    [filteredReport, state.dateRange, timezone, beginningOfWeek],
  );

  function handleSelectDate(date: Date) {
    const startDate = new Date(date);
    const weekday = startDate.getDay();
    const delta = ((weekday - beginningOfWeek + 7) % 7) * -1;
    startDate.setDate(startDate.getDate() + delta);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    state.selectDateRange({ startDate: fmt(startDate), endDate: fmt(endDate) });
  }

  return (
    <div className="flex flex-col gap-3 px-4 pb-4 pt-3">
      {/* Date picker */}
      <WeekRangePicker
        label={model?.rangeLabel ?? t("thisWeek")}
        mode="week"
        onNext={state.goNext}
        onPrev={state.goPrev}
        onSelectDate={handleSelectDate}
        selectedDate={new Date(state.dateRange.startDate)}
        weekStartsOn={beginningOfWeek}
      />

      {/* Metrics */}
      {model ? <SummaryMetrics metrics={model.metrics} /> : null}

      {/* Duration chart */}
      {model && model.weekRows.length > 0 ? (
        <section className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-3">
          <DurationChart weekRows={model.weekRows} />
        </section>
      ) : null}

      {/* Distribution donut */}
      {model && model.distributionSegments.length > 0 ? (
        <section className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-3">
          <DistributionPanel
            onSliceByChange={state.setSliceBy}
            distributionSegments={model.distributionSegments}
            sliceBy={state.sliceBy}
            totalDuration={model.totalDuration}
          />
        </section>
      ) : null}

      {/* Breakdown list */}
      {model && model.breakdownRows.length > 0 ? (
        <section className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]">
          <div className="flex flex-col divide-y divide-[var(--track-border)]">
            {model.breakdownRows.map((row) => (
              <div key={row.name} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="size-[8px] shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                <span className="min-w-0 flex-1 truncate text-[13px] text-white">{row.name}</span>
                <span className="shrink-0 text-[12px] tabular-nums text-[var(--track-text-muted)]">
                  {row.duration}
                </span>
                <span className="w-[48px] shrink-0 text-right text-[12px] tabular-nums text-[var(--track-text-muted)]">
                  {row.shareLabel}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {weeklyReportQuery.isPending ? (
        <p className="py-8 text-center text-[13px] text-[var(--track-text-muted)]">
          {t("loading")}
        </p>
      ) : null}
    </div>
  );
}
