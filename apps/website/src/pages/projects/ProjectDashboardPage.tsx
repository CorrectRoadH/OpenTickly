import { type ReactElement, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { TimeEntriesTable } from "../../features/tracking/TimeEntriesTable.tsx";
import {
  useProjectDetailQuery,
  useProjectStatisticsQuery,
  useTimeEntriesQuery,
} from "../../shared/query/web-shell.ts";
import { ProjectDetailLayout } from "./ProjectDetailLayout.tsx";

type ProjectDashboardPageProps = {
  projectId: number;
  workspaceId: number;
};

function last90DaysRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  return {
    endDate: end.toISOString().slice(0, 10),
    startDate: start.toISOString().slice(0, 10),
  };
}

export function ProjectDashboardPage({
  projectId,
  workspaceId,
}: ProjectDashboardPageProps): ReactElement {
  const projectQuery = useProjectDetailQuery(workspaceId, projectId);
  const statisticsQuery = useProjectStatisticsQuery(workspaceId, projectId);
  const project = projectQuery.data;
  const totalSeconds = project?.actual_seconds ?? 0;
  const billableSeconds = project?.billable ? totalSeconds : 0;

  const dateRange = last90DaysRange();
  const entriesQuery = useTimeEntriesQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const filteredEntries = (() => {
    if (!entriesQuery.data) return [];
    return (entriesQuery.data as GithubComTogglTogglApiInternalModelsTimeEntry[])
      .filter((entry) => (entry.duration ?? 0) >= 0)
      .filter((entry) => entry.project_id === projectId)
      .sort((a, b) => (b.start ?? "").localeCompare(a.start ?? ""));
  })();

  return (
    <ProjectDetailLayout activeTab="dashboard" projectId={projectId} workspaceId={workspaceId}>
      {projectQuery.isPending ? (
        <p className="mt-4 rounded-lg border border-[var(--track-border)] px-4 py-3 text-sm text-[var(--track-text-muted)]">
          Loading dashboard...
        </p>
      ) : null}
      {projectQuery.isError ? (
        <p className="mt-4 rounded-lg border border-rose-600/40 px-4 py-3 text-sm text-rose-300">
          Dashboard is temporarily unavailable.
        </p>
      ) : null}
      {project ? (
        <section className="pt-3">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Total hours" value={formatDuration(totalSeconds)} />
            <StatCard label="Billable hours" value={formatDuration(billableSeconds)} />
            <StatCard
              label="Billable %"
              value={
                totalSeconds > 0 ? `${Math.round((billableSeconds / totalSeconds) * 100)}%` : "0%"
              }
            />
          </div>
          <div className="mt-6 flex justify-center">
            <ProjectDonut billableSeconds={billableSeconds} totalSeconds={totalSeconds} />
          </div>
          {statisticsQuery.data?.earliest_time_entry || statisticsQuery.data?.latest_time_entry ? (
            <div className="mt-6 text-[12px] text-[var(--track-text-muted)]">
              <p>First entry: {statisticsQuery.data.earliest_time_entry ?? "-"}</p>
              <p className="mt-1">Last entry: {statisticsQuery.data.latest_time_entry ?? "-"}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mt-8">
        <TimeEntriesTable entries={filteredEntries} isPending={entriesQuery.isPending} />
      </div>
    </ProjectDetailLayout>
  );
}

function StatCard({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-lg border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-[20px] font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

function ProjectDonut({
  billableSeconds,
  totalSeconds,
}: {
  billableSeconds: number;
  totalSeconds: number;
}): ReactElement {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const nonBillable = Math.max(0, totalSeconds - billableSeconds);
  const hasData = totalSeconds > 0;
  const data = hasData
    ? [
        { name: "Billable", value: billableSeconds, fill: "var(--track-chart-series-billable)" },
        ...(nonBillable > 0
          ? [
              {
                name: "Non-billable",
                value: nonBillable,
                fill: "var(--track-chart-series-non-billable)",
              },
            ]
          : []),
      ]
    : [{ name: "empty", value: 100, fill: "var(--track-border)" }];

  const percent =
    hasData && totalSeconds > 0 ? Math.round((billableSeconds / totalSeconds) * 100) : 0;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 106, height: 106 }}>
      {hoveredIndex != null && data[hoveredIndex] && data[hoveredIndex].name !== "empty" ? (
        <div className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--track-tooltip-surface)] px-2.5 py-1.5 text-[11px] font-medium text-white shadow-[0_4px_12px_var(--track-shadow-tooltip)]">
          <span
            className="mr-1.5 inline-block size-2 rounded-full"
            style={{ backgroundColor: data[hoveredIndex].fill }}
          />
          <span>{data[hoveredIndex].name}</span>
          <span className="ml-1.5 tabular-nums text-[var(--track-text-soft)]">
            {formatDuration(data[hoveredIndex].value)}
          </span>
        </div>
      ) : null}
      <PieChart height={106} width={106}>
        <Pie
          cx="50%"
          cy="50%"
          data={data}
          dataKey="value"
          innerRadius={31}
          isAnimationActive={false}
          outerRadius={53}
          paddingAngle={0}
          startAngle={90}
          endAngle={-270}
          stroke="none"
          onMouseEnter={(_, index) => hasData && setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {data.map((entry, index) => (
            <Cell
              fill={entry.fill}
              key={entry.name ?? index}
              stroke="none"
              style={{ cursor: hasData ? "pointer" : "default", outline: "none" }}
            />
          ))}
        </Pie>
      </PieChart>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-[11px] font-semibold text-white">
        {hasData ? `${percent}%` : ""}
      </div>
    </div>
  );
}

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
