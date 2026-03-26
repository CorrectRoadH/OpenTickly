import type { ReactElement } from "react";

import type { ReportsDayRow, ReportsDistributionSegment } from "./reports-page-data.ts";
import type { SliceDimension } from "./useReportsPageState.ts";
import { ReportsSelectDropdown } from "./ReportsSelectDropdown.tsx";

const SLICE_OPTIONS: { label: string; value: SliceDimension }[] = [
  { label: "Projects", value: "projects" },
  { label: "Clients", value: "clients" },
  { label: "Members", value: "members" },
];

const Y_AXIS_LABELS = ["16h 15", "13h", "9h 45", "6h 30", "3h 15", "0h"] as const;
const MAX_CHART_SECONDS = 16 * 3600 + 15 * 60;

export function DurationChart({ weekRows }: { weekRows: ReportsDayRow[] }): ReactElement {
  return (
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
                <div className="border-t border-dashed border-[var(--track-border)]" key={label} />
              ))}
            </div>
            <div className="relative z-10 flex h-full items-end gap-4 pb-6">
              {weekRows.map((row) => (
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
                          row.seconds === 0 ? "2px" : `${(row.seconds / MAX_CHART_SECONDS) * 100}%`,
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
  );
}

export function DistributionPanel({
  distributionSegments,
  onSliceByChange,
  sliceBy,
  totalDuration,
}: {
  distributionSegments: ReportsDistributionSegment[];
  onSliceByChange: (dim: SliceDimension) => void;
  sliceBy: SliceDimension;
  totalDuration: string;
}): ReactElement {
  const sliceLabel =
    sliceBy === "projects" ? "Project" : sliceBy === "clients" ? "Client" : "Member";

  return (
    <section
      className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-5"
      data-testid="reports-distribution-panel"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="max-w-[140px] text-[16px] font-semibold leading-[23px] text-white">
          {sliceLabel} distribution
        </h2>
        <ReportsSelectDropdown
          label="Slice by"
          onChange={onSliceByChange}
          options={SLICE_OPTIONS}
          testId="reports-slice-by"
          value={sliceBy}
        />
      </div>
      <div className="mt-8 flex justify-center">
        <div
          aria-label={`${sliceLabel} distribution chart`}
          className="flex size-[180px] items-center justify-center rounded-full"
          style={{ background: buildDistributionBackground(distributionSegments) }}
        >
          <div className="flex size-[106px] flex-col items-center justify-center rounded-full bg-[var(--track-surface)] text-center">
            <p className="text-[16px] font-semibold leading-[23px] tabular-nums text-white">
              {totalDuration}
            </p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
              {sliceLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function buildDistributionBackground(segments: Array<{ color: string; value: number }>): string {
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
