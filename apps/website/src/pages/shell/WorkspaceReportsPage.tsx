import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AppButton,
  CheckboxFilterDropdown,
  PageLayout,
  pageLayoutTabClass,
} from "@opentickly/web-ui";
import { Link, useNavigate } from "@tanstack/react-router";

import type { ReportsTab } from "../../shared/lib/workspace-routing.ts";
import { copyToClipboard } from "../../shared/lib/clipboard.ts";
import { buildWorkspaceReportsPath } from "../../shared/lib/workspace-routing.ts";
import {
  useProjectsQuery,
  useTagsQuery,
  useWorkspaceWeeklyReportQuery,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { ReportsBreakdownPanel } from "./ReportsBreakdownPanel.tsx";
import { ReportsDescriptionFilter } from "./ReportsDescriptionFilter.tsx";
import { DurationChart, DistributionPanel } from "./ReportsCharts.tsx";
import { useRangePickerClose, WeekRangePicker } from "../../features/tracking/WeekRangePicker.tsx";
import {
  formatTrackQueryDate,
  REPORTS_SHORTCUTS,
  resolveShortcutRange,
} from "../../features/tracking/week-range.ts";
import { ReportsSurfaceMessage, SummaryMetrics, ToolbarButton } from "./ReportsSharedWidgets.tsx";
import { ReportsDetailedView } from "./ReportsDetailedView.tsx";
import { ReportsWorkloadView } from "./ReportsWorkloadView.tsx";
import { ReportsProfitabilityView } from "./ReportsProfitabilityView.tsx";
import { ReportsCustomView } from "./ReportsCustomView.tsx";
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
import { type DurationFormat, formatClockDuration } from "../../features/tracking/overview-data.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { AnimatedActiveIndicator } from "../../shared/ui/AnimatedActiveIndicator.tsx";
import { ReportsProjectFilter, type ReportsProjectOption } from "./ReportsProjectFilter.tsx";

/** Round seconds up to the nearest 15-minute block (900 seconds). */
function roundTo15Min(seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.ceil(seconds / 900) * 900;
}

function applyRoundingToModel(
  model: ReportsPageModel,
  durationFormat?: DurationFormat,
): ReportsPageModel {
  const roundedBreakdownRows: ReportsBreakdownRow[] = model.breakdownRows.map((row) => {
    const rounded = roundTo15Min(row.seconds);
    return {
      ...row,
      duration: formatClockDuration(rounded, durationFormat),
      members: row.members.map((m) => ({
        ...m,
        duration: formatClockDuration(roundTo15Min(m.seconds), durationFormat),
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
    return { ...r, seconds: rs, value: formatClockDuration(rs, durationFormat) };
  });
  const billableMetric = model.metrics.find((m) => m.titleKey === "billableHours");
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
      { titleKey: "totalHours", value: formatClockDuration(roundedTotal, durationFormat) },
      {
        titleKey: "billableHours",
        value: formatClockDuration(roundTo15Min(billableSeconds), durationFormat),
      },
      {
        titleKey: "amount",
        value: model.metrics.find((m) => m.titleKey === "amount")?.value ?? "-",
      },
      { titleKey: "averageDailyHours", value: avgDaily.toFixed(2) },
    ],
    totalDuration: formatClockDuration(roundedTotal, durationFormat),
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
  const navigate = useNavigate();

  const initialProjectIds = initialProjectId != null ? [initialProjectId] : undefined;
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

  const memberOptions = extractUniqueMembers(weeklyReportQuery.data);

  const clientOptions = extractUniqueClients(weeklyReportQuery.data);

  const filteredReport = filterReportRows(
    weeklyReportQuery.data,
    state.memberFilter,
    state.clientFilter,
  );

  const liveModel = buildReportsPageModel({
    endDate: state.dateRange.endDate,
    report: filteredReport,
    startDate: state.dateRange.startDate,
    timezone,
    weekStartsOn,
  });

  const displayModel = roundingEnabled
    ? applyRoundingToModel(liveModel, durationFormat)
    : liveModel;

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

  const headerActions =
    tab === "custom" ? (
      <ToolbarButton
        onClick={() =>
          void navigate({
            to: buildWorkspaceReportsPath(workspaceId, "summary"),
          })
        }
      >
        {t("newReport")}
      </ToolbarButton>
    ) : (
      <div className="flex flex-wrap items-center gap-2">
        <AppButton
          className={
            roundingEnabled
              ? "border-[var(--track-accent)] bg-[var(--track-accent-soft-strong)] text-[var(--track-accent-text)] shadow-[var(--track-depth-shadow-rest)] hover:border-[var(--track-accent)] hover:bg-[var(--track-accent-soft)] hover:shadow-[var(--track-depth-shadow-hover)]"
              : ""
          }
          data-testid="reports-rounding-toggle"
          disabled={tab === "profitability"}
          onClick={() => setRoundingEnabled((prev) => !prev)}
          size="sm"
          type="button"
          variant="secondary"
        >
          {roundingEnabled ? t("roundingOn") : t("roundingOff")}
        </AppButton>
        {tab === "summary" || tab === "detailed" ? (
          <ToolbarButton
            onClick={() => {
              const projectsParam = displayModel.breakdownRows
                .filter((r) => r.seconds > 0)
                .map((r) => `${r.name}:${(r.seconds / 3600).toFixed(2)}`)
                .join(",");
              const search = projectsParam
                ? `?from=reports&projects=${encodeURIComponent(projectsParam)}`
                : "";
              void navigate({
                to: `/workspaces/${workspaceId}/invoices/new${search}`,
              });
            }}
          >
            {t("createInvoice")}
          </ToolbarButton>
        ) : null}
        <AppButton
          data-testid="reports-export"
          onClick={() => exportReportCsv(displayBreakdownRows, displayModel.totalDuration)}
          size="sm"
          type="button"
          variant="secondary"
        >
          {t("export")}
        </AppButton>
        <ToolbarButton onClick={() => void navigate({ to: `/${workspaceId}/settings/general` })}>
          {t("settings")}
        </ToolbarButton>
        <AppButton
          className={shareToast ? "" : "text-[var(--track-text)]"}
          data-testid="reports-save-share"
          onClick={handleShareReport}
          size="sm"
          type="button"
          variant={shareToast ? "primary" : "secondary"}
        >
          {t("saveAndShare")}
        </AppButton>
      </div>
    );

  return (
    <PageLayout
      data-testid="reports-page"
      title={t("reports")}
      headerActions={headerActions}
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
            liveModel={liveModel}
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
            clientFilter={state.clientFilter}
            dateRange={state.dateRange}
            filters={state.filters}
            memberFilter={state.memberFilter}
          />
        ) : tab === "workload" ? (
          <ReportsWorkloadView
            isError={weeklyReportQuery.isError}
            isPending={weeklyReportQuery.isPending}
            report={weeklyReportQuery.data}
            roundingEnabled={roundingEnabled}
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

function ReportsFilterBar({
  clientOptions,
  liveModel,
  memberOptions,
  projectOptions,
  state,
  tagOptions,
  weekStartsOn,
}: {
  clientOptions: string[];
  liveModel: ReturnType<typeof buildReportsPageModel>;
  memberOptions: string[];
  projectOptions: ReportsProjectOption[];
  state: ReturnType<typeof useReportsPageState>;
  tagOptions: { id: number; label: string }[];
  weekStartsOn: number;
}) {
  const { t } = useTranslation("reports");
  const selectedDate = new Date(`${state.dateRange.startDate}T00:00:00`);

  const handleSelectDate = (date: Date) => {
    state.selectDateRange(resolveShortcutRange("this-week", weekStartsOn, date));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-3" data-testid="reports-filter-bar">
      <ReportsRangePicker
        label={liveModel.rangeLabel}
        onSelectDate={handleSelectDate}
        selectedDate={selectedDate}
        state={state}
        weekStartsOn={weekStartsOn}
      />
      <CheckboxFilterDropdown
        label={t("member")}
        onClear={() => state.setMemberFilter([])}
        onToggle={(key: string) =>
          state.setMemberFilter(
            state.memberFilter.includes(key)
              ? state.memberFilter.filter((m) => m !== key)
              : [...state.memberFilter, key],
          )
        }
        options={memberOptions.map((m) => ({ key: m, label: m }))}
        selected={new Set(state.memberFilter)}
        testId="reports-filter-member"
      />
      <CheckboxFilterDropdown
        label={t("client")}
        onClear={() => state.setClientFilter([])}
        onToggle={(key: string) =>
          state.setClientFilter(
            state.clientFilter.includes(key)
              ? state.clientFilter.filter((c) => c !== key)
              : [...state.clientFilter, key],
          )
        }
        options={clientOptions.map((c) => ({ key: c, label: c }))}
        selected={new Set(state.clientFilter)}
        testId="reports-filter-client"
      />
      <ReportsProjectFilter
        onClear={() => state.updateFilters({ projectIds: [] })}
        onToggle={(id: number) =>
          state.updateFilters({
            projectIds: state.filters.projectIds.includes(id)
              ? state.filters.projectIds.filter((pid) => pid !== id)
              : [...state.filters.projectIds, id],
          })
        }
        options={projectOptions}
        selected={new Set(state.filters.projectIds)}
      />
      <CheckboxFilterDropdown
        label={t("tag")}
        onClear={() => state.updateFilters({ tagIds: [] })}
        onToggle={(key: number) =>
          state.updateFilters({
            tagIds: state.filters.tagIds.includes(key)
              ? state.filters.tagIds.filter((id) => id !== key)
              : [...state.filters.tagIds, key],
          })
        }
        options={tagOptions.map((t) => ({ key: t.id, label: t.label }))}
        selected={new Set(state.filters.tagIds)}
        testId="reports-filter-tag"
      />
      <ReportsDescriptionFilter
        onChange={(value) => state.updateFilters({ description: value })}
        value={state.filters.description}
      />
    </div>
  );
}

function ReportsRangePicker({
  label,
  onSelectDate,
  selectedDate,
  state,
  weekStartsOn,
}: {
  label: string;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  state: ReturnType<typeof useReportsPageState>;
  weekStartsOn: number;
}): ReactElement {
  const rangeStart = new Date(`${state.dateRange.startDate}T00:00:00`);
  const rangeEnd = new Date(`${state.dateRange.endDate}T00:00:00`);

  const handleSelectRange = (start: Date, end: Date) => {
    state.selectDateRange({
      startDate: formatTrackQueryDate(start),
      endDate: formatTrackQueryDate(end),
    });
  };

  return (
    <WeekRangePicker
      label={label}
      mode="range"
      onNext={state.goNext}
      onPrev={state.goPrev}
      onSelectDate={onSelectDate}
      onSelectRange={handleSelectRange}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      selectedDate={selectedDate}
      sidebar={<ReportsDateShortcuts state={state} weekStartsOn={weekStartsOn} />}
      weekStartsOn={weekStartsOn}
    />
  );
}

function ReportsDateShortcuts({
  state,
  weekStartsOn,
}: {
  state: ReturnType<typeof useReportsPageState>;
  weekStartsOn: number;
}): ReactElement {
  const { t } = useTranslation("tracking");
  const close = useRangePickerClose();

  return (
    <>
      {REPORTS_SHORTCUTS.map((shortcut) => {
        const isActive = state.activeShortcut === shortcut.id;

        return (
          <button
            aria-pressed={isActive}
            className={`w-full rounded-lg px-3 py-2 text-left text-[14px] font-medium transition ${
              isActive
                ? "bg-[var(--track-accent-strong)] text-white"
                : "text-[var(--track-overlay-text-muted)] hover:bg-[var(--track-row-hover)] hover:text-white"
            }`}
            key={shortcut.id}
            onClick={() => {
              state.selectShortcutRange(
                shortcut.id,
                resolveShortcutRange(shortcut.id, weekStartsOn),
              );
              close();
            }}
            type="button"
          >
            {t(shortcut.label)}
          </button>
        );
      })}
    </>
  );
}
