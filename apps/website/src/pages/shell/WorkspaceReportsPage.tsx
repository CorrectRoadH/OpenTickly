import { type ReactElement, useCallback, useMemo, useState } from "react";

import { useNavigate } from "@tanstack/react-router";

import {
  useProjectsQuery,
  useTagsQuery,
  useWorkspaceWeeklyReportQuery,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { ReportsBreakdownPanel } from "./ReportsBreakdownPanel.tsx";
import { ReportsDescriptionFilter } from "./ReportsDescriptionFilter.tsx";
import { DurationChart, DistributionPanel } from "./ReportsCharts.tsx";
import { ReportsFilterDropdown } from "./ReportsFilterDropdown.tsx";
import { ReportsPeriodPicker } from "./ReportsPeriodPicker.tsx";
import {
  ReportsSurfaceMessage,
  ReportsTabPlaceholder,
  SummaryMetrics,
  ToolbarButton,
  TopTab,
} from "./ReportsSharedWidgets.tsx";
import { ReportsDetailedView } from "./ReportsDetailedView.tsx";
import { ReportsStringFilterDropdown } from "./ReportsStringFilterDropdown.tsx";
import { exportReportCsv } from "./reports-export.ts";
import {
  buildReportsPageModel,
  extractUniqueClients,
  extractUniqueMembers,
  filterReportRows,
  regroupByClient,
  regroupByEntry,
  regroupByMember,
  type ReportsBreakdownRow,
  type ReportsPageModel,
} from "./reports-page-data.ts";
import { useReportsPageState } from "./useReportsPageState.ts";
import { formatClockDuration } from "../../features/tracking/overview-data.ts";

/** Round seconds up to the nearest 15-minute block (900 seconds). */
function roundTo15Min(seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.ceil(seconds / 900) * 900;
}

function applyRoundingToModel(model: ReportsPageModel): ReportsPageModel {
  const roundedBreakdownRows: ReportsBreakdownRow[] = model.breakdownRows.map((row) => {
    const rounded = roundTo15Min(row.seconds);
    return {
      ...row,
      duration: formatClockDuration(rounded),
      members: row.members.map((m) => ({
        ...m,
        duration: formatClockDuration(roundTo15Min(m.seconds)),
      })),
      seconds: rounded,
    };
  });
  const roundedTotal = roundedBreakdownRows.reduce((sum, r) => sum + r.seconds, 0);
  const recalculated = roundedBreakdownRows.map((row) => ({
    ...row,
    shareLabel: `${roundedTotal > 0 ? ((row.seconds / roundedTotal) * 100).toFixed(2) : "0.00"}%`,
    shareValue: roundedTotal > 0 ? (row.seconds / roundedTotal) * 100 : 0,
  }));
  const roundedWeekRows = model.weekRows.map((r) => {
    const rs = roundTo15Min(r.seconds);
    return { ...r, seconds: rs, value: formatClockDuration(rs) };
  });
  const billableMetric = model.metrics.find((m) => m.title === "Billable Hours");
  const billableSeconds = billableMetric ? parseDurationToSeconds(billableMetric.value) : 0;
  const trackedDays = roundedWeekRows.filter((r) => r.seconds > 0).length;
  const avgDaily = trackedDays > 0 ? roundedTotal / 3600 / trackedDays : 0;

  return {
    ...model,
    breakdownRows: recalculated,
    distributionSegments: recalculated.slice(0, 10).map((r) => ({
      color: r.color,
      duration: r.duration,
      label: r.name,
      value: r.shareValue,
    })),
    metrics: [
      { title: "Total Hours", value: formatClockDuration(roundedTotal) },
      { title: "Billable Hours", value: formatClockDuration(roundTo15Min(billableSeconds)) },
      { title: "Amount", value: "-" },
      { title: "Average Daily Hours", value: `${avgDaily.toFixed(2)} Hours` },
    ],
    totalDuration: formatClockDuration(roundedTotal),
    totalSeconds: roundedTotal,
    weekRows: roundedWeekRows,
  };
}

function parseDurationToSeconds(value: string): number {
  const parts = value.split(":");
  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  }
  if (parts.length === 2) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60;
  }
  return 0;
}

const SUMMARY_TABS = ["Summary", "Detailed", "Workload", "Profitability", "My reports"] as const;
type ReportsTab = (typeof SUMMARY_TABS)[number];

type WorkspaceReportsPageProps = {
  initialProjectId?: number;
};

export function WorkspaceReportsPage({
  initialProjectId,
}: WorkspaceReportsPageProps): ReactElement {
  const [activeTab, setActiveTab] = useState<ReportsTab>("Summary");
  const [roundingEnabled, setRoundingEnabled] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const session = useSession();
  const timezone = session.user.timezone ?? "UTC";
  const weekStartsOn = session.user.beginningOfWeek ?? 1;
  const workspaceId = session.currentWorkspace.id;
  const navigate = useNavigate();

  const initialProjectIds = useMemo(
    () => (initialProjectId != null ? [initialProjectId] : undefined),
    [initialProjectId],
  );
  const state = useReportsPageState(timezone, weekStartsOn, initialProjectIds);

  const projectsQuery = useProjectsQuery(workspaceId);
  const tagsQuery = useTagsQuery(workspaceId);

  const weeklyReportQuery = useWorkspaceWeeklyReportQuery(workspaceId, {
    description: state.filters.description,
    endDate: state.dateRange.endDate,
    projectIds: state.filters.projectIds,
    startDate: state.dateRange.startDate,
    tagIds: state.filters.tagIds,
  });

  const memberOptions = useMemo(
    () => extractUniqueMembers(weeklyReportQuery.data),
    [weeklyReportQuery.data],
  );

  const clientOptions = useMemo(
    () => extractUniqueClients(weeklyReportQuery.data),
    [weeklyReportQuery.data],
  );

  const filteredReport = useMemo(
    () => filterReportRows(weeklyReportQuery.data, state.memberFilter, state.clientFilter),
    [weeklyReportQuery.data, state.memberFilter, state.clientFilter],
  );

  const liveModel = useMemo(
    () =>
      buildReportsPageModel({
        endDate: state.dateRange.endDate,
        report: filteredReport,
        startDate: state.dateRange.startDate,
        timezone,
        weekStartsOn,
      }),
    [state.dateRange.endDate, state.dateRange.startDate, filteredReport, timezone, weekStartsOn],
  );

  const displayModel = useMemo(
    () => (roundingEnabled ? applyRoundingToModel(liveModel) : liveModel),
    [liveModel, roundingEnabled],
  );

  const handleShareReport = useCallback(() => {
    const url = window.location.href;
    void navigator.clipboard.writeText(url).then(() => {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 3000);
    });
  }, []);

  const displayBreakdownRows = useMemo(() => {
    if (state.breakdownBy === "clients") return regroupByClient(displayModel.breakdownRows);
    if (state.breakdownBy === "entries") return regroupByEntry(displayModel.breakdownRows);
    return displayModel.breakdownRows;
  }, [displayModel.breakdownRows, state.breakdownBy]);

  const displayDistributionSegments = useMemo(() => {
    if (state.sliceBy === "projects") return displayModel.distributionSegments;
    const regrouped =
      state.sliceBy === "clients"
        ? regroupByClient(displayModel.breakdownRows)
        : regroupByMember(displayModel.breakdownRows);
    return regrouped
      .slice(0, 10)
      .map((r) => ({ color: r.color, duration: r.duration, label: r.name, value: r.shareValue }));
  }, [displayModel.breakdownRows, displayModel.distributionSegments, state.sliceBy]);

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
              <button
                className={`h-9 rounded-[8px] border px-3 text-[12px] font-medium ${
                  roundingEnabled
                    ? "border-[#e57bd9] bg-[#381e35] text-[#e57bd9]"
                    : "border-[var(--track-border)] bg-[var(--track-surface-muted)] text-[var(--track-text-muted)]"
                }`}
                data-testid="reports-rounding-toggle"
                onClick={() => setRoundingEnabled((prev) => !prev)}
                type="button"
              >
                {roundingEnabled ? "Rounding on" : "Rounding off"}
              </button>
              <ToolbarButton
                onClick={() => void navigate({ to: `/workspaces/${workspaceId}/invoices` })}
              >
                Create invoice
              </ToolbarButton>
              <button
                className="h-9 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[12px] font-medium text-[var(--track-text-muted)]"
                data-testid="reports-export"
                onClick={() => exportReportCsv(displayBreakdownRows, displayModel.totalDuration)}
                type="button"
              >
                Export
              </button>
              <ToolbarButton
                onClick={() => void navigate({ to: `/${workspaceId}/settings/general` })}
              >
                Settings
              </ToolbarButton>
              <button
                className={`h-9 rounded-[8px] px-4 text-[12px] font-semibold ${
                  shareToast
                    ? "bg-[var(--track-button)] text-black"
                    : "border border-[var(--track-border)] bg-[var(--track-surface-muted)] text-[var(--track-text-muted)]"
                }`}
                data-testid="reports-save-share"
                onClick={handleShareReport}
                type="button"
              >
                Save and share
              </button>
            </div>
          </div>
          <ReportsFilterBar
            clientOptions={clientOptions}
            liveModel={liveModel}
            memberOptions={memberOptions}
            projectOptions={projectOptions}
            state={state}
            tagOptions={tagOptions}
          />
        </div>
      </section>

      {activeTab === "Summary" ? (
        <>
          <SummaryMetrics metrics={displayModel.metrics} />
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
                <DurationChart weekRows={displayModel.weekRows} />
                <DistributionPanel
                  distributionSegments={displayDistributionSegments}
                  onSliceByChange={state.setSliceBy}
                  sliceBy={state.sliceBy}
                  totalDuration={displayModel.totalDuration}
                />
              </div>
              <ReportsBreakdownPanel
                breakdownBy={state.breakdownBy}
                breakdownRows={displayBreakdownRows}
                expandedRows={state.expandedRows}
                onBreakdownByChange={state.setBreakdownBy}
                toggleRow={state.toggleRow}
              />
            </>
          ) : null}
        </>
      ) : activeTab === "Detailed" ? (
        <ReportsDetailedView
          clientFilter={state.clientFilter}
          dateRange={state.dateRange}
          filters={state.filters}
          memberFilter={state.memberFilter}
        />
      ) : (
        <ReportsTabPlaceholder tab={activeTab} />
      )}
      {shareToast ? (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-lg border border-[var(--track-border)] bg-[var(--track-surface)] px-5 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
          <span className="text-[14px] text-white">Report link copied to clipboard</span>
        </div>
      ) : null}
    </div>
  );
}

function ReportsFilterBar({
  clientOptions,
  liveModel,
  memberOptions,
  projectOptions,
  state,
  tagOptions,
}: {
  clientOptions: string[];
  liveModel: ReturnType<typeof buildReportsPageModel>;
  memberOptions: string[];
  projectOptions: { id: number; label: string }[];
  state: ReturnType<typeof useReportsPageState>;
  tagOptions: { id: number; label: string }[];
}) {
  return (
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
      <ReportsStringFilterDropdown
        label="Member"
        onChange={state.setMemberFilter}
        options={memberOptions}
        selected={state.memberFilter}
      />
      <ReportsStringFilterDropdown
        label="Client"
        onChange={state.setClientFilter}
        options={clientOptions}
        selected={state.clientFilter}
      />
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
      <ReportsDescriptionFilter
        onChange={(value) => state.updateFilters({ description: value })}
        value={state.filters.description}
      />
    </div>
  );
}
