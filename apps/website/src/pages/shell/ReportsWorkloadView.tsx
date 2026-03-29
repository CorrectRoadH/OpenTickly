import { type ReactElement, useMemo, useState } from "react";

import type { SavedWeeklyReportData } from "../../shared/api/generated/public-reports/types.gen.ts";
import { formatClockDuration } from "../../features/tracking/overview-data.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { SummaryMetrics, ReportsSurfaceMessage } from "./ReportsSharedWidgets.tsx";
import type { ReportsPageMetric } from "./reports-page-data.ts";

type WorkloadMetric = "utilization" | "tracked" | "billable";

type MemberWorkload = {
  billableHours: number;
  billableSeconds: number;
  name: string;
  totalHours: number;
  totalSeconds: number;
  userId: number;
  utilization: number;
};

type ReportsWorkloadViewProps = {
  isPending: boolean;
  isError: boolean;
  report: SavedWeeklyReportData | undefined;
  roundingEnabled: boolean;
};

function buildMemberWorkloads(report: SavedWeeklyReportData | undefined): MemberWorkload[] {
  if (!report?.report?.length) return [];

  const memberMap = new Map<
    number,
    { billableSeconds: number; name: string; totalSeconds: number }
  >();

  for (const row of report.report) {
    const userId = row.user_id ?? 0;
    const name = row.user_name?.trim() || `User ${userId}`;
    const existing = memberMap.get(userId) ?? { billableSeconds: 0, name, totalSeconds: 0 };

    const rowTotal = (row.seconds ?? []).reduce((s, v) => s + v, 0);
    const rowBillable = (row.billable_seconds ?? []).reduce((s, v) => s + v, 0);

    existing.totalSeconds += rowTotal;
    existing.billableSeconds += rowBillable;
    memberMap.set(userId, existing);
  }

  return [...memberMap.values()]
    .map((m) => ({
      billableHours: m.billableSeconds / 3600,
      billableSeconds: m.billableSeconds,
      name: m.name,
      totalHours: m.totalSeconds / 3600,
      totalSeconds: m.totalSeconds,
      userId: 0,
      utilization: m.totalSeconds > 0 ? (m.billableSeconds / m.totalSeconds) * 100 : 0,
    }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds);
}

/** Round seconds up to the nearest 15-minute block. */
function roundTo15Min(seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.ceil(seconds / 900) * 900;
}

export function ReportsWorkloadView({
  isPending,
  isError,
  report,
  roundingEnabled,
}: ReportsWorkloadViewProps): ReactElement {
  const { durationFormat } = useUserPreferences();
  const [metric, setMetric] = useState<WorkloadMetric>("utilization");
  const [target] = useState(80);

  const members = useMemo(() => {
    const raw = buildMemberWorkloads(report);
    if (!roundingEnabled) return raw;
    return raw.map((m) => {
      const totalSeconds = roundTo15Min(m.totalSeconds);
      const billableSeconds = roundTo15Min(m.billableSeconds);
      return {
        ...m,
        billableHours: billableSeconds / 3600,
        billableSeconds,
        totalHours: totalSeconds / 3600,
        totalSeconds,
        utilization: totalSeconds > 0 ? (billableSeconds / totalSeconds) * 100 : 0,
      };
    });
  }, [report, roundingEnabled]);

  const totalSeconds = members.reduce((s, m) => s + m.totalSeconds, 0);
  const billableSeconds = members.reduce((s, m) => s + m.billableSeconds, 0);
  const trackedDays = 7; // period-based, simplified
  const avgDaily = trackedDays > 0 ? totalSeconds / 3600 / trackedDays : 0;

  const workloadMetrics: ReportsPageMetric[] = [
    { title: "Total Hours", value: formatClockDuration(totalSeconds, durationFormat) },
    { title: "Billable Hours", value: formatClockDuration(billableSeconds, durationFormat) },
    { title: "Average Daily Hours", value: `${avgDaily.toFixed(2)} Hours` },
  ];

  return (
    <>
      <SummaryMetrics metrics={workloadMetrics} />

      {isPending ? <ReportsSurfaceMessage message="Loading report data..." /> : null}
      {isError ? (
        <ReportsSurfaceMessage message="Reports data is temporarily unavailable." tone="error" />
      ) : null}

      {!isPending && !isError ? (
        <section
          className="mt-5 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]"
          data-testid="reports-workload-panel"
        >
          <div className="flex items-center justify-between border-b border-[var(--track-border)] px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-medium text-white">Member utilization</span>
              <span className="text-[12px] text-[var(--track-text-muted)]">({target}% target)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--track-text-muted)]">Show:</span>
              <select
                className="h-8 rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-2 text-[12px] text-white"
                data-testid="workload-metric-select"
                onChange={(e) => setMetric(e.target.value as WorkloadMetric)}
                value={metric}
              >
                <option value="utilization">Utilization</option>
                <option value="tracked">Tracked hours</option>
                <option value="billable">Billable hours</option>
              </select>
            </div>
          </div>

          {members.length === 0 ? (
            <WorkloadEmptyState />
          ) : (
            <div className="divide-y divide-[var(--track-border)]">
              {members.map((member) => (
                <MemberWorkloadRow
                  key={member.name}
                  member={member}
                  metric={metric}
                  target={target}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}

function MemberWorkloadRow({
  member,
  metric,
  target,
}: {
  member: MemberWorkload;
  metric: WorkloadMetric;
  target: number;
}): ReactElement {
  const { durationFormat } = useUserPreferences();
  let barValue: number;
  let barMax: number;
  let displayValue: string;

  switch (metric) {
    case "utilization":
      barValue = member.utilization;
      barMax = 100;
      displayValue = `${member.utilization.toFixed(1)}%`;
      break;
    case "tracked":
      barValue = member.totalHours;
      barMax = Math.max(member.totalHours, 40);
      displayValue = formatClockDuration(member.totalSeconds, durationFormat);
      break;
    case "billable":
      barValue = member.billableHours;
      barMax = Math.max(member.totalHours, 40);
      displayValue = formatClockDuration(member.billableSeconds, durationFormat);
      break;
  }

  const barWidth = barMax > 0 ? Math.min((barValue / barMax) * 100, 100) : 0;
  const meetsTarget = metric === "utilization" ? member.utilization >= target : true;

  return (
    <div className="flex items-center gap-4 px-5 py-3" data-testid="workload-member-row">
      <div className="flex w-[160px] shrink-0 items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--track-accent-soft)] text-[11px] font-semibold text-[var(--track-accent)]">
          {member.name.charAt(0).toUpperCase()}
        </div>
        <span className="truncate text-[13px] text-white">{member.name}</span>
      </div>
      <div className="relative flex-1">
        <div className="h-6 w-full rounded-[4px] bg-[var(--track-surface-muted)]">
          <div
            className={`h-full rounded-[4px] transition-all ${
              meetsTarget ? "bg-[var(--track-accent)]" : "bg-[var(--track-warning,#f59e0b)]"
            }`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
        {metric === "utilization" ? (
          <div
            className="absolute top-0 h-6 w-[2px] bg-white/40"
            style={{ left: `${Math.min(target, 100)}%` }}
            title={`${target}% target`}
          />
        ) : null}
      </div>
      <div className="w-[80px] shrink-0 text-right text-[13px] tabular-nums text-white">
        {displayValue}
      </div>
    </div>
  );
}

function WorkloadEmptyState(): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <h3 className="text-[18px] font-semibold text-white">Nothing to see here...</h3>
      <p className="max-w-[360px] text-[14px] leading-5 text-[var(--track-text-muted)]">
        We couldn't find any time entries. Try adjusting the date range or applying new filters.
      </p>
    </div>
  );
}
