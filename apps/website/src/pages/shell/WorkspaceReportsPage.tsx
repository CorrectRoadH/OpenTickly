import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageLayout, pageLayoutTabClass } from "@opentickly/web-ui";
import { Link } from "@tanstack/react-router";

import type { ReportsTab } from "../../shared/lib/workspace-routing.ts";
import { copyToClipboard } from "../../shared/lib/clipboard.ts";
import { buildWorkspaceReportsPath } from "../../shared/lib/workspace-routing.ts";
import {
  useProjectsQuery,
  useTagsQuery,
  useWorkspaceWeeklyReportQuery,
  useWorkspaceSettingsQuery,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { ReportsBreakdownPanel } from "./ReportsBreakdownPanel.tsx";
import { DurationChart, DistributionPanel } from "./ReportsCharts.tsx";
import { ReportsSurfaceMessage, SummaryMetrics } from "./ReportsSharedWidgets.tsx";
import { ReportsDetailedView } from "./ReportsDetailedView.tsx";
import { ReportsWorkloadView } from "./ReportsWorkloadView.tsx";
import { ReportsProfitabilityView } from "./ReportsProfitabilityView.tsx";
import { ReportsCustomView } from "./ReportsCustomView.tsx";
import { ReportsActions } from "./ReportsActions.tsx";
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
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { AnimatedActiveIndicator } from "../../shared/ui/AnimatedActiveIndicator.tsx";
import type { ReportsProjectOption } from "./ReportsProjectFilter.tsx";
import { ReportsFilterBar } from "./ReportsFilterBar.tsx";

const REPORTS_TABS: Array<{ labelKey: string; slug: ReportsTab }> = [
  { labelKey: "summary", slug: "summary" },
  { labelKey: "detailed", slug: "detailed" },
  { labelKey: "workload", slug: "workload" },
  { labelKey: "profitability", slug: "profitability" },
  { labelKey: "myReports", slug: "custom" },
];

type WorkspaceReportsPageProps = {
  initialProjectId?: number;
  tab: ReportsTab;
};

export function WorkspaceReportsPage({
  initialProjectId,
  tab,
}: WorkspaceReportsPageProps): ReactElement {
  const { t } = useTranslation("reports");
  const { beginningOfWeek, durationFormat } = useUserPreferences();
  const [roundingEnabled, setRoundingEnabled] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const session = useSession();
  const timezone = session.user.timezone ?? "UTC";
  const weekStartsOn = beginningOfWeek;
  const workspaceId = session.currentWorkspace.id;
  const settingsQuery = useWorkspaceSettingsQuery(workspaceId);
  const rounding = settingsQuery.data?.workspace.rounding ?? 0;
  const roundingMinutes = settingsQuery.data?.workspace.rounding_minutes ?? 0;

  const initialProjectIds = initialProjectId != null ? [initialProjectId] : undefined;
  const state = useReportsPageState(timezone, weekStartsOn, initialProjectIds);

  const projectsQuery = useProjectsQuery(workspaceId);
  const tagsQuery = useTagsQuery(workspaceId);

  const weeklyReportQuery = useWorkspaceWeeklyReportQuery(workspaceId, {
    rounding,
    roundingMinutes: roundingEnabled ? roundingMinutes : 0,
    description: state.filters.description,
    endDate: state.dateRange.endDate,
    projectIds: state.filters.projectIds,
    startDate: state.dateRange.startDate,
    tagIds: state.filters.tagIds,
  });

  const memberOptions = extractUniqueMembers(weeklyReportQuery.data);

  const clientOptions = extractUniqueClients(weeklyReportQuery.data);

  const filteredReport = filterReportRows(
    weeklyReportQuery.data,
    state.memberFilter,
    state.clientFilter,
  );

  const displayModel = buildReportsPageModel({
    durationFormat,
    endDate: state.dateRange.endDate,
    report: filteredReport,
    startDate: state.dateRange.startDate,
    timezone,
    weekStartsOn,
  });

  const handleShareReport = () => {
    const url = window.location.href;
    void copyToClipboard(url).then((copied) => {
      if (copied) {
        setShareToast(true);
        setTimeout(() => setShareToast(false), 3000);
      }
    });
  };

  const displayBreakdownRows = (() => {
    if (state.breakdownBy === "clients") return regroupByClient(displayModel.breakdownRows);
    if (state.breakdownBy === "entries") return regroupByEntry(displayModel.breakdownRows);
    return displayModel.breakdownRows;
  })();

  const displayDistributionSegments = (() => {
    if (state.sliceBy === "projects") return displayModel.distributionSegments;
    const regrouped =
      state.sliceBy === "clients"
        ? regroupByClient(displayModel.breakdownRows)
        : regroupByMember(displayModel.breakdownRows);
    return regrouped
      .slice(0, 10)
      .map((r) => ({ color: r.color, duration: r.duration, label: r.name, value: r.shareValue }));
  })();

  const projectOptions: ReportsProjectOption[] = (projectsQuery.data ?? [])
    .filter((p) => p.id != null && p.name)
    .map((p) => ({ clientName: p.client_name, color: p.color, id: p.id!, label: p.name! }));
  const projectColorById = new Map(
    projectOptions
      .filter((project) => project.color)
      .map((project) => [project.id, project.color!] as const),
  );

  const tagOptions = (tagsQuery.data ?? [])
    .filter((t) => t.id != null && t.name)
    .map((t) => ({ id: t.id!, label: t.name! }));

  return (
    <PageLayout
      data-testid="reports-page"
      title={t("reports")}
      headerActions={
        <ReportsActions
          tab={tab}
          workspaceId={workspaceId}
          roundingEnabled={roundingEnabled}
          roundingMinutes={roundingMinutes}
          onToggleRounding={() => setRoundingEnabled((previous) => !previous)}
          displayModel={displayModel}
          displayBreakdownRows={displayBreakdownRows}
          shareToast={shareToast}
          onShare={handleShareReport}
          isPending={weeklyReportQuery.isFetching || weeklyReportQuery.isError}
        />
      }
      data-tabs-testid="reports-tabs"
      tabs={REPORTS_TABS.map((tabItem) => (
        <Link
          className={pageLayoutTabClass(tabItem.slug === tab)}
          key={tabItem.slug}
          to={buildWorkspaceReportsPath(workspaceId, tabItem.slug)}
        >
          {t(tabItem.labelKey)}
          {tabItem.slug === tab ? (
            <AnimatedActiveIndicator
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--track-accent)]"
              layoutId="page-layout-tab-indicator"
            />
          ) : null}
        </Link>
      ))}
      toolbar={
        tab !== "custom" ? (
          <ReportsFilterBar
            clientOptions={clientOptions}
            liveModel={displayModel}
            memberOptions={memberOptions}
            projectOptions={projectOptions}
            state={state}
            tagOptions={tagOptions}
            weekStartsOn={weekStartsOn}
          />
        ) : undefined
      }
    >
      <div className="px-5 py-5">
        {tab === "summary" ? (
          <>
            <SummaryMetrics metrics={displayModel.metrics} />
            {weeklyReportQuery.isPending ? (
              <ReportsSurfaceMessage message={t("loadingReportData")} />
            ) : null}
            {weeklyReportQuery.isError ? (
              <ReportsSurfaceMessage message={t("reportsDataUnavailable")} tone="error" />
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
        ) : tab === "detailed" ? (
          <ReportsDetailedView
            rounding={rounding}
            roundingMinutes={roundingEnabled ? roundingMinutes : 0}
            clientFilter={state.clientFilter}
            dateRange={state.dateRange}
            filters={state.filters}
            memberFilter={state.memberFilter}
            workspaceId={workspaceId}
          />
        ) : tab === "workload" ? (
          <ReportsWorkloadView
            isError={weeklyReportQuery.isError}
            isPending={weeklyReportQuery.isPending}
            report={weeklyReportQuery.data}
          />
        ) : tab === "profitability" ? (
          <ReportsProfitabilityView
            isError={weeklyReportQuery.isError}
            isPending={weeklyReportQuery.isPending}
            projectColorById={projectColorById}
            report={weeklyReportQuery.data}
          />
        ) : tab === "custom" ? (
          <ReportsCustomView />
        ) : null}
      </div>
      {shareToast ? (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-lg border border-[var(--track-border)] bg-[var(--track-surface)] px-5 py-3 shadow-[0_10px_30px_var(--track-shadow-banner)]">
          <span className="text-[14px] text-white">{t("reportLinkCopied")}</span>
        </div>
      ) : null}
    </PageLayout>
  );
}
