import { type ReactElement, useMemo, useState } from "react";

import { useWorkspaceWeeklyReportQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { buildReportsPageModel } from "./reports-page-data.ts";

const SUMMARY_TABS = ["Summary", "Detailed", "Workload", "Profitability", "My reports"] as const;
type ReportsTab = (typeof SUMMARY_TABS)[number];
const FILTER_LABELS = ["Member", "Client", "Project", "Tag", "Description", "Add filter"] as const;
const Y_AXIS_LABELS = ["16h 15", "13h", "9h 45", "6h 30", "3h 15", "0h"] as const;
const MAX_CHART_SECONDS = 16 * 3600 + 15 * 60;

export function WorkspaceReportsPage(): ReactElement {
  const [activeTab, setActiveTab] = useState<ReportsTab>("Summary");
  const session = useSession();
  const timezone = session.user.timezone ?? "UTC";
  const pageModel = useMemo(
    () =>
      buildReportsPageModel({
        timezone,
        weekStartsOn: session.user.beginningOfWeek ?? undefined,
      }),
    [session.user.beginningOfWeek, timezone],
  );
  const weeklyReportQuery = useWorkspaceWeeklyReportQuery(session.currentWorkspace.id, {
    endDate: pageModel.endDate,
    startDate: pageModel.startDate,
  });
  const liveModel = useMemo(
    () =>
      buildReportsPageModel({
        report: weeklyReportQuery.data,
        timezone,
        weekStartsOn: session.user.beginningOfWeek ?? undefined,
      }),
    [session.user.beginningOfWeek, timezone, weeklyReportQuery.data],
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
            <div className="flex overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] text-[12px]">
              <button className="h-8 px-4 text-[var(--track-text-muted)]" type="button">
                Prev
              </button>
              <button
                className="h-8 border-x border-[var(--track-border)] px-4 font-semibold text-white"
                type="button"
              >
                {liveModel.rangeLabel}
              </button>
              <button className="h-8 px-4 text-[var(--track-text-muted)]" type="button">
                Next
              </button>
            </div>
            {FILTER_LABELS.map((label) => (
              <ToolbarButton key={label}>{label}</ToolbarButton>
            ))}
          </div>
        </div>
      </section>

      {activeTab === "Summary" ? (
        <>
          <section
            className="mt-5 grid overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] lg:grid-cols-4"
            data-testid="reports-summary-metrics"
          >
            {liveModel.metrics.map((metric, index) => (
              <div
                className={`px-5 py-4 ${index === liveModel.metrics.length - 1 ? "" : "border-b border-[var(--track-border)] lg:border-b-0 lg:border-r"}`}
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
                <section
                  className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-5"
                  data-testid="reports-duration-chart"
                >
                  <h2 className="text-[16px] font-semibold leading-[23px] text-white">
                    Duration by day
                  </h2>
                  <div className="mt-4 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-4 pb-9 pt-3">
                    <div className="grid h-[248px] grid-cols-[44px_minmax(0,1fr)] gap-4">
                      <div className="flex flex-col justify-between pb-6 text-[11px] font-medium text-[var(--track-text-soft)]">
                        {Y_AXIS_LABELS.map((label) => (
                          <span key={label}>{label}</span>
                        ))}
                      </div>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-6">
                          {Y_AXIS_LABELS.map((label) => (
                            <div
                              className="border-t border-dashed border-[var(--track-border)]"
                              key={label}
                            />
                          ))}
                        </div>
                        <div className="relative z-10 flex h-full items-end gap-4 pb-6">
                          {liveModel.weekRows.map((row) => (
                            <div
                              className="flex flex-1 flex-col items-center justify-end gap-3"
                              key={row.label}
                            >
                              <span className="text-[11px] font-medium tabular-nums text-[var(--track-text-soft)]">
                                {row.value}
                              </span>
                              <div className="flex h-full w-full items-end">
                                <div
                                  className="w-full rounded-t-md bg-[var(--track-accent)]"
                                  style={{
                                    height:
                                      row.seconds === 0
                                        ? "2px"
                                        : `${(row.seconds / MAX_CHART_SECONDS) * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="text-[11px] font-medium text-[var(--track-text-soft)]">
                                {row.label}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-2 text-[11px] text-[var(--track-text-muted)]">
                          <span className="h-1.5 w-4 rounded-full bg-[var(--track-accent)]" />
                          <span>Duration (h)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section
                  className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-5"
                  data-testid="reports-distribution-panel"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="max-w-[140px] text-[16px] font-semibold leading-[23px] text-white">
                      Project distribution
                    </h2>
                    <ToolbarButton>Slice by: Projects</ToolbarButton>
                  </div>
                  <div className="mt-8 flex justify-center">
                    <div
                      aria-label="Project distribution chart"
                      className="flex size-[180px] items-center justify-center rounded-full"
                      style={{
                        background: buildDistributionBackground(liveModel.distributionSegments),
                      }}
                    >
                      <div className="flex size-[106px] flex-col items-center justify-center rounded-full bg-[var(--track-surface)] text-center">
                        <p className="text-[16px] font-semibold leading-[23px] tabular-nums text-white">
                          {liveModel.totalDuration}
                        </p>
                        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
                          Project
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <section
                className="mt-5 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-5"
                data-testid="reports-breakdown-panel"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[16px] font-semibold leading-[23px] text-white">
                      Project and member breakdown
                    </h2>
                    <p className="mt-2 text-[14px] leading-5 text-[var(--track-text-muted)]">
                      Summary reports now reflect live tracking facts for this workspace and week.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ToolbarButton>Breakdown by: Projects</ToolbarButton>
                    <ToolbarButton>and: Members</ToolbarButton>
                    <ToolbarButton>Filters</ToolbarButton>
                  </div>
                </div>

                <div
                  className="mt-4 overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)]"
                  data-testid="reports-breakdown-table"
                >
                  <div className="grid grid-cols-[28px_minmax(0,1fr)_98px_98px_24px] items-center gap-3 border-b border-[var(--track-border)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
                    <span />
                    <span>Project | Member</span>
                    <span>Duration</span>
                    <span>Duration %</span>
                    <span className="text-right text-base leading-none">+</span>
                  </div>
                  {liveModel.breakdownRows.length > 0 ? (
                    <ul>
                      {liveModel.breakdownRows.map((row) => (
                        <li
                          className="grid grid-cols-[28px_minmax(0,1fr)_98px_98px_24px] items-center gap-3 border-b border-[var(--track-border)] px-4 py-4 last:border-b-0"
                          key={row.name}
                        >
                          <button
                            className="text-left text-[13px] text-[var(--track-text-soft)]"
                            type="button"
                          >
                            &gt;
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: row.color }}
                              />
                              <p className="truncate text-[14px] font-medium text-white">
                                {row.name}
                              </p>
                              <span className="text-[13px] text-[var(--track-text-soft)]">
                                ({row.memberCount})
                              </span>
                            </div>
                          </div>
                          <span className="text-[14px] font-medium tabular-nums text-white">
                            {row.duration}
                          </span>
                          <span className="text-[14px] font-medium tabular-nums text-white">
                            {row.shareLabel}
                          </span>
                          <span />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-8 text-[14px] text-[var(--track-text-muted)]">
                      No tracked time for this week yet.
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : null}
        </>
      ) : (
        <ReportsTabPlaceholder tab={activeTab} />
      )}
    </div>
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

function buildDistributionBackground(
  segments: Array<{
    color: string;
    value: number;
  }>,
): string {
  if (segments.length === 0) {
    return "conic-gradient(var(--track-border) 0deg 360deg)";
  }

  let currentDegree = 0;

  return `conic-gradient(${segments
    .map((segment) => {
      const start = currentDegree;
      currentDegree += (segment.value / 100) * 360;
      return `${segment.color} ${start}deg ${currentDegree}deg`;
    })
    .join(", ")})`;
}
