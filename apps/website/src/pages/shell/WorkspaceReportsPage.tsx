import { type ReactElement, useMemo, useState } from "react";

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
} from "./reports-page-data.ts";
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

  const displayBreakdownRows = useMemo(() => {
    if (state.breakdownBy === "clients") return regroupByClient(liveModel.breakdownRows);
    if (state.breakdownBy === "entries") return regroupByEntry(liveModel.breakdownRows);
    return liveModel.breakdownRows;
  }, [liveModel.breakdownRows, state.breakdownBy]);

  const displayDistributionSegments = useMemo(() => {
    if (state.sliceBy === "projects") return liveModel.distributionSegments;
    const regrouped =
      state.sliceBy === "clients"
        ? regroupByClient(liveModel.breakdownRows)
        : regroupByMember(liveModel.breakdownRows);
    return regrouped.slice(0, 10).map((r) => ({ color: r.color, value: r.shareValue }));
  }, [liveModel.breakdownRows, liveModel.distributionSegments, state.sliceBy]);

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
              <button
                className="h-9 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[12px] font-medium text-[var(--track-text-muted)]"
                data-testid="reports-export"
                onClick={() => exportReportCsv(displayBreakdownRows, liveModel.totalDuration)}
                type="button"
              >
                Export
              </button>
              <ToolbarButton>Settings</ToolbarButton>
              <button
                className="h-9 rounded-[8px] bg-[var(--track-button)] px-4 text-[12px] font-semibold text-black"
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
                  distributionSegments={displayDistributionSegments}
                  onSliceByChange={state.setSliceBy}
                  sliceBy={state.sliceBy}
                  totalDuration={liveModel.totalDuration}
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
      ) : (
        <ReportsTabPlaceholder tab={activeTab} />
      )}
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
