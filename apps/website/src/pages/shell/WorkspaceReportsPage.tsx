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
  { color: "#d06b42", duration: "13:23:35", memberCount: 1, name: "Deep work", share: "24.88%" },
  { color: "#d6c250", duration: "3:55:53", memberCount: 1, name: "Meals", share: "7.30%" },
  { color: "#c4a03a", duration: "3:33:35", memberCount: 1, name: "Learning", share: "6.61%" },
  { color: "#9ea4b1", duration: "3:17:05", memberCount: 1, name: "Planning", share: "6.11%" },
  { color: "#5f96e9", duration: "2:48:51", memberCount: 1, name: "Meetings", share: "5.23%" },
] as const;
const DISTRIBUTION_SEGMENTS = [
  { color: "#bb70a6", value: 35.72 },
  { color: "#cb6b45", value: 24.88 },
  { color: "#d5bf55", value: 7.3 },
  { color: "#bc9938", value: 6.61 },
  { color: "#a9afb8", value: 6.11 },
  { color: "#6097eb", value: 5.23 },
  { color: "#dccd63", value: 4.55 },
  { color: "#85c1d8", value: 3.38 },
  { color: "#b0bd6b", value: 2.22 },
  { color: "#9f8d45", value: 2.0 },
] as const;
const MAX_DAY_MINUTES = 16 * 60 + 15;
const Y_AXIS_LABELS = ["16h 15", "13h", "9h 45", "6h 30", "3h 15", "0h"] as const;

export function WorkspaceReportsPage(): ReactElement {
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
                This week . W12
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

      <section
        className="mt-5 grid overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] lg:grid-cols-4"
        data-testid="reports-summary-metrics"
      >
        {SUMMARY_METRICS.map((metric, index) => (
          <div
            className={`px-5 py-4 ${index === SUMMARY_METRICS.length - 1 ? "" : "border-b border-[var(--track-border)] lg:border-b-0 lg:border-r"}`}
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

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section
          className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-5"
          data-testid="reports-duration-chart"
        >
          <h2 className="text-[16px] font-semibold leading-[23px] text-white">Duration by day</h2>
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
                  {DAY_ROWS.map((row) => (
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
                              row.minutes === 0
                                ? "2px"
                                : `${(row.minutes / MAX_DAY_MINUTES) * 100}%`,
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
              style={{ background: buildDistributionBackground() }}
            >
              <div className="flex size-[106px] flex-col items-center justify-center rounded-full bg-[var(--track-surface)] text-center">
                <p className="text-[16px] font-semibold leading-[23px] tabular-nums text-white">
                  53:49:15
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
              Summary reports stay aligned with tracking facts while exposing one sortable breakdown
              surface for projects and members.
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
          <ul>
            {BREAKDOWN_ROWS.map((row) => (
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
                    <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} />
                    <p className="truncate text-[14px] font-medium text-white">{row.name}</p>
                    <span className="text-[13px] text-[var(--track-text-soft)]">
                      ({row.memberCount})
                    </span>
                  </div>
                </div>
                <span className="text-[14px] font-medium tabular-nums text-white">
                  {row.duration}
                </span>
                <span className="text-[14px] font-medium tabular-nums text-white">{row.share}</span>
                <span />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function TopTab({ active = false, children }: { active?: boolean; children: string }) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={`border-b-2 pb-3 text-[14px] font-medium ${
        active
          ? "border-[var(--track-accent)] text-[var(--track-accent-text)]"
          : "border-transparent text-[var(--track-text-muted)]"
      }`}
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

function buildDistributionBackground(): string {
  let currentDegree = 0;

  return `conic-gradient(${DISTRIBUTION_SEGMENTS.map((segment) => {
    const start = currentDegree;
    currentDegree += (segment.value / 100) * 360;
    return `${segment.color} ${start}deg ${currentDegree}deg`;
  }).join(", ")})`;
}
