import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";

const SUMMARY_TABS = ["Summary", "Detailed", "Workload", "Profitability", "My reports"] as const;
const FILTER_LABELS = ["Member", "Client", "Project", "Tag", "Description", "Add filter"] as const;
const SUMMARY_METRICS = [
  { title: "Total Hours", value: "53:49:15" },
  { title: "Billable Hours", value: "-" },
  { title: "Amount", value: "-" },
  { title: "Average Daily Hours", value: "13.46 Hours" },
] as const;
const DAY_ROWS = [
  { label: "Mon 03-16", minutes: 15 * 60 + 32, value: "15:32:32" },
  { label: "Tue 03-17", minutes: 13 * 60 + 23, value: "13:23:33" },
  { label: "Wed 03-18", minutes: 15 * 60 + 46, value: "15:46:55" },
  { label: "Thu 03-19", minutes: 9 * 60 + 6, value: "9:06:15" },
  { label: "Fri 03-20", minutes: 0, value: "0:00" },
  { label: "Sat 03-21", minutes: 0, value: "0:00" },
  { label: "Sun 03-22", minutes: 0, value: "0:00" },
] as const;
const BREAKDOWN_ROWS = [
  { color: "#ca5b97", duration: "19:13:27", memberCount: 1, name: "Community", share: "35.72%" },
  { color: "#d4553d", duration: "13:23:35", memberCount: 1, name: "Deep work", share: "24.88%" },
  { color: "#d0bb3d", duration: "3:55:53", memberCount: 1, name: "Meals", share: "7.30%" },
  { color: "#c28a27", duration: "3:33:35", memberCount: 1, name: "Learning", share: "6.61%" },
  { color: "#a8adb4", duration: "3:17:05", memberCount: 1, name: "Planning", share: "6.11%" },
  { color: "#5496ea", duration: "2:48:51", memberCount: 1, name: "Meetings", share: "5.23%" },
] as const;
const DISTRIBUTION_SEGMENTS = [
  { color: "#ca5b97", value: 35.72 },
  { color: "#d4553d", value: 24.88 },
  { color: "#d0bb3d", value: 7.3 },
  { color: "#c28a27", value: 6.61 },
  { color: "#a8adb4", value: 6.11 },
  { color: "#5496ea", value: 5.23 },
  { color: "#d5c449", value: 4.55 },
  { color: "#75c0d2", value: 3.38 },
  { color: "#a7b35e", value: 2.22 },
  { color: "#94813a", value: 2.0 },
] as const;
const MAX_DAY_MINUTES = 16 * 60 + 15;
const Y_AXIS_LABELS = ["16h 15", "13h", "9h 45", "6h 30", "3h 15", "0h"] as const;

export function WorkspaceReportsPage(): ReactElement {
  return (
    <div className="space-y-3" data-testid="reports-page">
      <AppPanel className="border-white/8 bg-[#1f1f23]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/8 pb-4">
            <div className="flex min-w-0 flex-wrap items-center gap-5">
              <h1 className="text-lg font-semibold text-white">Reports</h1>
              <div className="flex flex-wrap items-center gap-5" data-testid="reports-tabs">
                {SUMMARY_TABS.map((tab) => (
                  <TopTab active={tab === "Summary"} key={tab}>
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
              <AppButton size="compact" type="button">
                Save and share
              </AppButton>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2" data-testid="reports-filter-bar">
            <div
              className="inline-flex items-center overflow-hidden rounded-lg border border-white/10 bg-[#18181c]"
              data-testid="reports-period-picker"
            >
              <button className="px-3 py-2 text-sm text-slate-300" type="button">
                Prev
              </button>
              <button className="border-x border-white/10 px-4 py-2 text-sm font-medium text-white" type="button">
                This week . W12
              </button>
              <button className="px-3 py-2 text-sm text-slate-300" type="button">
                Next
              </button>
            </div>

            {FILTER_LABELS.map((label) => (
              <ToolbarButton key={label}>{label}</ToolbarButton>
            ))}
          </div>
        </div>
      </AppPanel>

      <AppPanel className="border-white/8 bg-[#1f1f23]" data-testid="reports-summary-metrics">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SUMMARY_METRICS.map((metric, index) => (
            <MetricCard
              isLast={index === SUMMARY_METRICS.length - 1}
              key={metric.title}
              title={metric.title}
              value={metric.value}
            />
          ))}
        </div>
      </AppPanel>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <DurationChart />
        <DistributionPanel />
      </div>

      <AppPanel className="border-white/8 bg-[#1f1f23]" data-testid="reports-breakdown-panel">
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Project and member breakdown</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Summary reports stay aligned with tracking facts while exposing one sortable
                breakdown surface for projects and members.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ToolbarButton>Breakdown by: Projects</ToolbarButton>
              <ToolbarButton>and: Members</ToolbarButton>
              <ToolbarButton>Filters</ToolbarButton>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/8 bg-[#18181c]" data-testid="reports-breakdown-table">
            <div className="grid grid-cols-[28px_minmax(0,1fr)_120px_120px_28px] items-center gap-3 border-b border-white/8 px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              <span aria-hidden="true" />
              <span>Project | Member</span>
              <span>Duration</span>
              <span>Duration %</span>
              <span className="text-right text-base leading-none">+</span>
            </div>

            <ul className="divide-y divide-white/8">
              {BREAKDOWN_ROWS.map((row) => (
                <li
                  className="grid grid-cols-[28px_minmax(0,1fr)_120px_120px_28px] items-center gap-3 px-4 py-4"
                  key={row.name}
                >
                  <button
                    aria-label={`Expand ${row.name}`}
                    className="text-left text-sm font-medium text-slate-500"
                    type="button"
                  >
                    &gt;
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      <p className="truncate text-sm font-medium text-white">{row.name}</p>
                      <span className="text-sm text-slate-500">({row.memberCount})</span>
                    </div>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-slate-200">{row.duration}</span>
                  <span className="text-sm font-medium tabular-nums text-slate-200">{row.share}</span>
                  <span aria-hidden="true" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </AppPanel>
    </div>
  );
}

function DurationChart(): ReactElement {
  return (
    <AppPanel className="border-white/8 bg-[#1f1f23]" data-testid="reports-duration-chart">
      <h2 className="text-sm font-semibold text-white">Duration by day</h2>
      <div className="mt-4 rounded-xl border border-white/8 bg-[#18181c] p-4">
        <div className="grid h-[19rem] grid-cols-[52px_minmax(0,1fr)] gap-4">
          <div className="flex flex-col justify-between pb-8 text-xs font-medium text-slate-500">
            {Y_AXIS_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-8">
              {Y_AXIS_LABELS.map((label) => (
                <div className="border-t border-dashed border-white/8" key={label} />
              ))}
            </div>
            <div className="relative z-10 flex h-full items-end gap-4 pb-8">
              {DAY_ROWS.map((row) => (
                <div className="flex flex-1 flex-col items-center justify-end gap-3" key={row.label}>
                  <span className="text-[11px] font-medium tabular-nums text-slate-500">
                    {row.value}
                  </span>
                  <div className="flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t-md bg-[#a258b4]"
                      style={{
                        height: row.minutes === 0 ? "2px" : `${(row.minutes / MAX_DAY_MINUTES) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">{row.label}</span>
                </div>
              ))}
            </div>
            <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-2 text-xs text-slate-500">
              <span aria-hidden="true" className="h-1.5 w-4 rounded-full bg-[#a258b4]" />
              <span>Duration (h)</span>
            </div>
          </div>
        </div>
      </div>
    </AppPanel>
  );
}

function DistributionPanel(): ReactElement {
  return (
    <AppPanel className="border-white/8 bg-[#1f1f23]" data-testid="reports-distribution-panel">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">Project distribution</h2>
        <ToolbarButton>Slice by: Projects</ToolbarButton>
      </div>
      <div className="mt-8 flex justify-center">
        <div
          aria-label="Project distribution chart"
          className="flex size-60 items-center justify-center rounded-full"
          style={{ background: buildDistributionBackground() }}
        >
          <div className="flex size-36 flex-col items-center justify-center rounded-full bg-[#1f1f23] text-center">
            <p className="text-3xl font-semibold tabular-nums text-white">53:49:15</p>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
              Project
            </p>
          </div>
        </div>
      </div>
    </AppPanel>
  );
}

function MetricCard({
  isLast,
  title,
  value,
}: {
  isLast: boolean;
  title: string;
  value: string;
}): ReactElement {
  return (
    <div className={`rounded-xl bg-[#1f1f23] ${isLast ? "" : "xl:border-r xl:border-white/8"} xl:pr-4`}>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

function TopTab({ active = false, children }: { active?: boolean; children: string }): ReactElement {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={`border-b-2 pb-2 text-sm font-medium ${
        active ? "border-[#bb74c5] text-[#dfb4e5]" : "border-transparent text-slate-400"
      }`}
      type="button"
    >
      {children}
    </button>
  );
}

function ToolbarButton({ children }: { children: string }): ReactElement {
  return (
    <button
      className="rounded-lg border border-white/10 bg-[#18181c] px-3 py-2 text-sm font-medium text-slate-200"
      type="button"
    >
      {children}
    </button>
  );
}

function buildDistributionBackground(): string {
  let currentDegree = 0;

  return `conic-gradient(${DISTRIBUTION_SEGMENTS.map((segment) => {
    const start = currentDegree;
    currentDegree += (segment.value / 100) * 360;
    return `${segment.color} ${start}deg ${currentDegree}deg`;
  }).join(", ")})`;
}
