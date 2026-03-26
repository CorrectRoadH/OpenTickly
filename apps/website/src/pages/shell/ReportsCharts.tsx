import { type ReactElement, useState } from "react";

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

const DAY_NAMES: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

export function DurationChart({ weekRows }: { weekRows: ReportsDayRow[] }): ReactElement {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
              {weekRows.map((row, index) => (
                <div
                  className="relative flex flex-1 flex-col items-center justify-end gap-3"
                  key={row.label}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {hoveredIndex === index ? (
                    <div className="pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#2c2c2e] px-2.5 py-1.5 text-[11px] font-medium text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                      <span>{DAY_NAMES[row.label] ?? row.label}</span>
                      <span className="ml-1.5 tabular-nums text-[var(--track-text-soft)]">
                        {row.value}
                      </span>
                    </div>
                  ) : null}
                  <span className="text-[11px] font-medium tabular-nums text-[var(--track-text-soft)]">
                    {row.value}
                  </span>
                  <div className="flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t-md bg-[var(--track-accent)] transition-opacity hover:opacity-80"
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
        <DonutChart
          label={sliceLabel}
          segments={distributionSegments}
          totalDuration={totalDuration}
        />
      </div>
    </section>
  );
}

const DONUT_SIZE = 180;
const DONUT_STROKE = 37;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

/**
 * SVG-based donut chart with per-segment hover tooltips.
 * Each segment is a <circle> with stroke-dasharray/stroke-dashoffset.
 */
function DonutChart({
  label,
  segments,
  totalDuration,
}: {
  label: string;
  segments: ReportsDistributionSegment[];
  totalDuration: string;
}): ReactElement {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Build cumulative offsets for each segment
  const segmentArcs = buildSegmentArcs(segments);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: DONUT_SIZE, height: DONUT_SIZE }}
    >
      <svg
        aria-label={`${label} distribution chart`}
        className="absolute inset-0"
        height={DONUT_SIZE}
        viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
        width={DONUT_SIZE}
      >
        {segments.length === 0 ? (
          <circle
            cx={DONUT_SIZE / 2}
            cy={DONUT_SIZE / 2}
            fill="none"
            r={DONUT_RADIUS}
            stroke="var(--track-border)"
            strokeWidth={DONUT_STROKE}
          />
        ) : (
          segmentArcs.map((arc, index) => (
            <circle
              cx={DONUT_SIZE / 2}
              cy={DONUT_SIZE / 2}
              fill="none"
              key={index}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              r={DONUT_RADIUS}
              stroke={arc.color}
              strokeDasharray={`${arc.dashLength} ${DONUT_CIRCUMFERENCE - arc.dashLength}`}
              strokeDashoffset={-arc.offset}
              strokeWidth={hoveredIndex === index ? DONUT_STROKE + 4 : DONUT_STROKE}
              style={{
                cursor: "pointer",
                transform: "rotate(-90deg)",
                transformOrigin: "center",
                transition: "stroke-width 0.15s ease",
              }}
            />
          ))
        )}
      </svg>
      {/* Center label */}
      <div className="relative z-10 flex size-[106px] flex-col items-center justify-center rounded-full bg-[var(--track-surface)] text-center">
        <p className="text-[16px] font-semibold leading-[23px] tabular-nums text-white">
          {totalDuration}
        </p>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
          {label}
        </p>
      </div>
      {/* Tooltip */}
      {hoveredIndex != null && segments[hoveredIndex] ? (
        <div className="pointer-events-none absolute -top-10 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#2c2c2e] px-3 py-2 text-[11px] font-medium text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <span>{segments[hoveredIndex].label}</span>
          <span className="ml-2 tabular-nums text-[var(--track-text-soft)]">
            {segments[hoveredIndex].duration}
          </span>
          <span className="ml-2 text-[var(--track-text-muted)]">
            {segments[hoveredIndex].value.toFixed(1)}%
          </span>
        </div>
      ) : null}
    </div>
  );
}

function buildSegmentArcs(
  segments: ReportsDistributionSegment[],
): Array<{ color: string; dashLength: number; offset: number }> {
  let cumulativeOffset = 0;
  return segments.map((segment) => {
    const dashLength = (segment.value / 100) * DONUT_CIRCUMFERENCE;
    const arc = { color: segment.color, dashLength, offset: cumulativeOffset };
    cumulativeOffset += dashLength;
    return arc;
  });
}
