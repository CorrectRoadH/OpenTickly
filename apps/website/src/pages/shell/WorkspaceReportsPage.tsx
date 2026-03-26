import { type ReactElement, useMemo, useState } from "react";

import {
  useProjectsQuery,
  useTagsQuery,
  useWorkspaceWeeklyReportQuery,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { ReportsBreakdownPanel } from "./ReportsBreakdownPanel.tsx";
import { DurationChart, DistributionPanel } from "./ReportsCharts.tsx";
import { ReportsFilterDropdown } from "./ReportsFilterDropdown.tsx";
import { ReportsPeriodPicker } from "./ReportsPeriodPicker.tsx";
import { buildReportsPageModel } from "./reports-page-data.ts";
import { useReportsPageState } from "./useReportsPageState.ts";

const SUMMARY_TABS = ["Summary", "Detailed", "Workload", "Profitability", "My reports"] as const;
type ReportsTab = (typeof SUMMARY_TABS)[number];

export function WorkspaceReportsPage(): ReactElement {
  const [activeTab, setActiveTab] = useState<ReportsTab>("Summary");
  const session = useSession();
  const timezone = session.user.timezone ?? "UTC";
  const weekStartsOn = session.user.beginningOfWeek ?? 1;
  const workspaceId = session.currentWorkspace.id;

  const state = useReportsPageState(timezone, weekStartsOn);

  const projectsQuery = useProjectsQuery(workspaceId);
  const tagsQuery = useTagsQuery(workspaceId);

  const weeklyReportQuery = useWorkspaceWeeklyReportQuery(workspaceId, {
    endDate: state.dateRange.endDate,
    projectIds: state.filters.projectIds,
    startDate: state.dateRange.startDate,
    tagIds: state.filters.tagIds,
  });

  const liveModel = useMemo(
    () =>
      buildReportsPageModel({
        endDate: state.dateRange.endDate,
        report: weeklyReportQuery.data,
        startDate: state.dateRange.startDate,
        timezone,
        weekStartsOn,
      }),
    [
      state.dateRange.endDate,
      state.dateRange.startDate,
      timezone,
      weekStartsOn,
      weeklyReportQuery.data,
    ],
  );

  const projectOptions = useMemo(
    () =>
      (projectsQuery.data ?? [])
        .filter((p) => p.id != null && p.name)
        .map((p) => ({ id: p.id!, label: p.name! })),
    [projectsQuery.data],
  );

  const tagOptions = useMemo(
    () =>
      (tagsQuery.data ?? [])
        .filter((t) => t.id != null && t.name)
        .map((t) => ({ id: t.id!, label: t.name! })),
    [tagsQuery.data],
  );

  return (
    <div
      className="w-full min-w-0 bg-[var(--track-surface)] px-5 py-5 text-white"
      data-testid="reports-page"
    >
      <section className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]">
        <div className="border-b border-[var(--track-border)] px-5 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-5">
              <h1 className="text-[21px] font-semibold leading-[30px] text-white">Reports</h1>
              <div className="flex items-center gap-4" data-testid="reports-tabs">
                {SUMMARY_TABS.map((tab) => (
                  <TopTab active={tab === activeTab} key={tab} onClick={() => setActiveTab(tab)}>
                    {tab}
                  </TopTab>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ToolbarButton>Rounding off</ToolbarButton>
              <ToolbarButton>Create invoice</ToolbarButton>
              <ToolbarButton>Export</ToolbarButton>
              <ToolbarButton>Settings</ToolbarButton>
              <button
                className="h-9 rounded-[8px] bg-[var(--track-button)] px-4 text-[12px] font-semibold text-black"
                type="button"
              >
                Save and share
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 py-3" data-testid="reports-filter-bar">
            <div className="relative flex overflow-visible rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] text-[12px]">
              <button
                className="h-8 px-4 text-[var(--track-text-muted)] hover:text-white"
                data-testid="reports-prev"
                onClick={state.goPrev}
                type="button"
              >
                Prev
              </button>
              <button
                className="h-8 border-x border-[var(--track-border)] px-4 font-semibold text-white"
                data-testid="reports-range-label"
                onClick={() => state.setPeriodPickerOpen(!state.periodPickerOpen)}
                type="button"
              >
                {liveModel.rangeLabel}
              </button>
              <button
                className="h-8 px-4 text-[var(--track-text-muted)] hover:text-white"
                data-testid="reports-next"
                onClick={state.goNext}
                type="button"
              >
                Next
              </button>
              <ReportsPeriodPicker
                onClose={() => state.setPeriodPickerOpen(false)}
                onSelect={state.selectPeriod}
                open={state.periodPickerOpen}
              />
            </div>
            <ToolbarButton>Member</ToolbarButton>
            <ToolbarButton>Client</ToolbarButton>
            <ReportsFilterDropdown
              label="Project"
              onChange={(ids) => state.updateFilters({ projectIds: ids })}
              options={projectOptions}
              selected={state.filters.projectIds}
            />
            <ReportsFilterDropdown
              label="Tag"
              onChange={(ids) => state.updateFilters({ tagIds: ids })}
              options={tagOptions}
              selected={state.filters.tagIds}
            />
            <ToolbarButton>Description</ToolbarButton>
          </div>
        </div>
      </section>

      {activeTab === "Summary" ? (
        <>
          <SummaryMetrics metrics={liveModel.metrics} />
          {weeklyReportQuery.isPending ? (
            <ReportsSurfaceMessage message="Loading report data..." />
          ) : null}
          {weeklyReportQuery.isError ? (
            <ReportsSurfaceMessage
              message="Reports data is temporarily unavailable."
              tone="error"
            />
          ) : null}
          {!weeklyReportQuery.isPending && !weeklyReportQuery.isError ? (
            <>
              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <DurationChart weekRows={liveModel.weekRows} />
                <DistributionPanel
                  distributionSegments={liveModel.distributionSegments}
                  totalDuration={liveModel.totalDuration}
                />
              </div>
              <ReportsBreakdownPanel
                breakdownRows={liveModel.breakdownRows}
                expandedRows={state.expandedRows}
                toggleRow={state.toggleRow}
              />
            </>
          ) : null}
        </>
      ) : (
        <ReportsTabPlaceholder tab={activeTab} />
      )}
    </div>
  );
}

function SummaryMetrics({
  metrics,
}: {
  metrics: ReturnType<typeof buildReportsPageModel>["metrics"];
}): ReactElement {
  return (
    <section
      className="mt-5 grid overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] lg:grid-cols-4"
      data-testid="reports-summary-metrics"
    >
      {metrics.map((metric, index) => (
        <div
          className={`px-5 py-4 ${index === metrics.length - 1 ? "" : "border-b border-[var(--track-border)] lg:border-b-0 lg:border-r"}`}
          key={metric.title}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
            {metric.title}
          </p>
          <p className="mt-3 text-[16px] font-semibold leading-[23px] tabular-nums text-white">
            {metric.value}
          </p>
        </div>
      ))}
    </section>
  );
}

function TopTab({
  active = false,
  children,
  onClick,
}: {
  active?: boolean;
  children: string;
  onClick?: () => void;
}) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={`border-b-2 pb-3 text-[14px] font-medium ${
        active
          ? "border-[var(--track-accent)] text-[var(--track-accent-text)]"
          : "border-transparent text-[var(--track-text-muted)]"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ToolbarButton({ children }: { children: string }) {
  return (
    <button
      className="h-9 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[12px] font-medium text-[var(--track-text-muted)]"
      type="button"
    >
      {children}
    </button>
  );
}

function ReportsSurfaceMessage({
  message,
  tone = "default",
}: {
  message: string;
  tone?: "default" | "error";
}) {
  return (
    <div
      className={`mt-5 rounded-[8px] border px-4 py-3 text-[14px] ${
        tone === "error"
          ? "border-[#6b3f4d] bg-[#2d1d24] text-[#ffced9]"
          : "border-[var(--track-border)] bg-[var(--track-surface)] text-[var(--track-text-muted)]"
      }`}
    >
      {message}
    </div>
  );
}

const REPORT_TAB_DESCRIPTIONS: Record<Exclude<ReportsTab, "Summary">, string> = {
  Detailed:
    "The Detailed report shows individual time entries with description, project, client, duration, start/end times, tags, and billable status.",
  Workload:
    "The Workload report shows team member workload distribution across the selected period.",
  Profitability:
    "The Profitability report shows project profitability analysis comparing tracked time against budgets and rates.",
  "My reports": "My reports lets you save and manage custom report views for quick access.",
};

function ReportsTabPlaceholder({ tab }: { tab: Exclude<ReportsTab, "Summary"> }) {
  return (
    <section
      className="mt-5 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-8"
      data-testid={`reports-${tab.toLowerCase().replace(/\s+/g, "-")}-placeholder`}
    >
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <h2 className="text-[21px] font-semibold text-white">{tab}</h2>
        <p className="max-w-[480px] text-[14px] leading-5 text-[var(--track-text-muted)]">
          {REPORT_TAB_DESCRIPTIONS[tab]}
        </p>
        <p className="text-[13px] font-medium text-[var(--track-text-soft)]">Coming soon</p>
      </div>
    </section>
  );
}
