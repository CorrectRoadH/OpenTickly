import type { ReactElement } from "react";
import { AppButton, SurfaceCard } from "@opentoggl/web-ui";

import type { ReportsPageMetric } from "./reports-page-data.ts";

export function SummaryMetrics({ metrics }: { metrics: ReportsPageMetric[] }): ReactElement {
  return (
    <SurfaceCard
      className={`mt-5 grid overflow-hidden ${
        metrics.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"
      }`}
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
          <p className="mt-3 text-[14px] font-semibold leading-[23px] tabular-nums text-white">
            {metric.value}
          </p>
        </div>
      ))}
    </SurfaceCard>
  );
}

export function ToolbarButton({
  children,
  disabled,
  onClick,
}: {
  children: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <AppButton
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      size="sm"
      type="button"
      variant="secondary"
    >
      {children}
    </AppButton>
  );
}

export function ReportsSurfaceMessage({
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
          ? "border-[var(--track-danger-border-muted)] bg-[var(--track-danger-surface-muted)] text-[var(--track-danger-text-muted)]"
          : "border-[var(--track-border)] bg-[var(--track-surface)] text-[var(--track-text-muted)]"
      }`}
    >
      {message}
    </div>
  );
}

const REPORT_TAB_DESCRIPTIONS: Record<string, string> = {
  Detailed:
    "The Detailed report shows individual time entries with description, project, client, duration, start/end times, tags, and billable status.",
  Workload:
    "The Workload report shows team member workload distribution across the selected period.",
  Profitability:
    "The Profitability report shows project profitability analysis comparing tracked time against budgets and rates.",
  "My reports": "My reports lets you save and manage custom report views for quick access.",
};

export function ReportsTabPlaceholder({ tab }: { tab: string }) {
  return (
    <section
      className="mt-5 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-8"
      data-testid={`reports-${tab.toLowerCase().replace(/\s+/g, "-")}-placeholder`}
    >
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <h2 className="text-[14px] font-semibold text-white">{tab}</h2>
        <p className="max-w-[480px] text-[14px] leading-5 text-[var(--track-text-muted)]">
          {REPORT_TAB_DESCRIPTIONS[tab] ?? ""}
        </p>
      </div>
    </section>
  );
}
