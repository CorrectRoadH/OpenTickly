import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ReportsDayRow, ReportsDistributionSegment } from "./reports-page-data.ts";
import type { SliceDimension } from "./useReportsPageState.ts";
import { SelectDropdown } from "@opentoggl/web-ui";
import { formatClockDuration } from "../../features/tracking/overview-data.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";

const Y_AXIS_LABELS = ["16h 15", "13h", "9h 45", "6h 30", "3h 15", "0h"] as const;
const MAX_CHART_SECONDS = 16 * 3600 + 15 * 60;

const BAR_COLOR = "var(--track-accent-strong)";
const BAR_EMPTY_COLOR = "var(--track-chart-bar-empty)";
const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];

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
  const { t } = useTranslation("reports");
  const data = weekRows.map((row) => ({
    name: row.label,
    seconds: row.seconds,
    value: row.value,
  }));

  const yTicks = Y_AXIS_LABELS.map((_, i) => {
    const frac = i / (Y_AXIS_LABELS.length - 1);
    return Math.round(MAX_CHART_SECONDS * (1 - frac));
  });

  return (
    <section
      className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-5"
      data-testid="reports-duration-chart"
    >
      <h2 className="text-[14px] font-semibold leading-[23px] text-white">{t("durationByDay")}</h2>
      <div className="mt-4 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-4 pb-4 pt-3">
        <ResponsiveContainer height={248} width="100%">
          <BarChart data={data} margin={{ top: 16, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--track-border)" strokeDasharray="2 2" vertical={false} />
            <XAxis
              axisLine={{ stroke: "var(--track-border)", strokeWidth: 2 }}
              dataKey="name"
              interval={0}
              tick={{ fill: "var(--track-text-soft)", fontSize: 11, fontWeight: 500 }}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              domain={[0, MAX_CHART_SECONDS]}
              tick={<HourAxisTick />}
              tickLine={false}
              ticks={yTicks}
              width={44}
            />
            <Tooltip
              content={<DurationTooltip />}
              cursor={{ fill: "var(--track-accent-tint-subtle)" }}
              offset={20}
              position={{ y: -10 }}
            />
            <Bar barSize={34} dataKey="seconds" radius={BAR_RADIUS}>
              <LabelList content={<BarDurationLabel />} dataKey="seconds" position="top" />
              {data.map((entry) => (
                <Cell fill={entry.seconds > 0 ? BAR_COLOR : BAR_EMPTY_COLOR} key={entry.name} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-[var(--track-text-muted)]">
          <span className="h-1.5 w-4 rounded-full bg-[var(--track-accent)]" />
          <span>{t("durationH")}</span>
        </div>
      </div>
    </section>
  );
}

function HourAxisTick(props: Record<string, unknown>): ReactElement {
  const { x, y, payload } = props as {
    x: number;
    y: number;
    payload: { value: number };
  };
  const tickIndex = Math.round(
    (1 - payload.value / MAX_CHART_SECONDS) * (Y_AXIS_LABELS.length - 1),
  );
  const label = Y_AXIS_LABELS[tickIndex] ?? "";
  return (
    <text
      dominantBaseline="middle"
      fill="var(--track-text-soft)"
      fontSize={11}
      fontWeight={500}
      textAnchor="start"
      x={x - 40}
      y={y}
    >
      {label}
    </text>
  );
}

function BarDurationLabel(props: Record<string, unknown>): ReactElement | null {
  const { durationFormat } = useUserPreferences();
  const { x, y, width, value } = props as {
    x: number;
    y: number;
    width: number;
    value: number;
  };
  if (!value || value <= 0) return null;
  return (
    <text
      dominantBaseline="central"
      fill="var(--track-text-soft)"
      fontSize={11}
      fontWeight={500}
      textAnchor="middle"
      x={x + width / 2}
      y={y - 10}
    >
      {formatClockDuration(value, durationFormat)}
    </text>
  );
}

function DurationTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; seconds: number } }>;
}): ReactElement | null {
  const { durationFormat } = useUserPreferences();
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  const dayName = DAY_NAMES[entry.name] ?? entry.name;
  return (
    <div className="rounded-md bg-[var(--track-tooltip-surface)] px-2.5 py-1.5 text-[11px] font-medium text-white shadow-[0_4px_12px_var(--track-shadow-tooltip)]">
      <span>{dayName}</span>
      <span className="ml-1.5 tabular-nums text-[var(--track-text-soft)]">
        {formatClockDuration(entry.seconds, durationFormat)}
      </span>
    </div>
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
  const { t } = useTranslation("reports");
  const SLICE_OPTIONS: { label: string; value: SliceDimension }[] = [
    { label: t("projects"), value: "projects" },
    { label: t("clients"), value: "clients" },
    { label: t("members"), value: "members" },
  ];
  const sliceLabel =
    sliceBy === "projects" ? t("project") : sliceBy === "clients" ? t("client") : t("member");

  return (
    <section
      className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-5"
      data-testid="reports-distribution-panel"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="max-w-[140px] text-[14px] font-semibold leading-[23px] text-white">
          {sliceLabel}{" "}
          {sliceBy === "projects"
            ? t("projectDistribution")
            : sliceBy === "clients"
              ? t("clientDistribution")
              : t("memberDistribution")}
        </h2>
        <SelectDropdown
          data-testid="reports-slice-by"
          onChange={onSliceByChange as (value: string) => void}
          options={SLICE_OPTIONS}
          prefix="Slice by"
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
const DONUT_INNER_RADIUS = 53;
const DONUT_OUTER_RADIUS = 90;

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

  const pieData =
    segments.length > 0
      ? segments.map((s) => ({
          name: s.label,
          value: s.value,
          duration: s.duration,
          fill: s.color,
        }))
      : [{ name: "empty", value: 100, duration: "", fill: "var(--track-border)" }];

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: DONUT_SIZE, height: DONUT_SIZE }}
    >
      <PieChart height={DONUT_SIZE} width={DONUT_SIZE}>
        <Pie
          cx="50%"
          cy="50%"
          data={pieData}
          dataKey="value"
          innerRadius={DONUT_INNER_RADIUS}
          isAnimationActive={false}
          nameKey="name"
          outerRadius={DONUT_OUTER_RADIUS}
          paddingAngle={0}
          stroke="none"
          onMouseEnter={(_, index) => segments.length > 0 && setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {pieData.map((entry, index) => (
            <Cell
              fill={entry.fill}
              key={entry.name ?? index}
              stroke="none"
              strokeWidth={hoveredIndex === index ? 4 : 0}
              style={{ cursor: segments.length > 0 ? "pointer" : "default", outline: "none" }}
            />
          ))}
        </Pie>
      </PieChart>
      {/* Center label */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="flex size-[106px] flex-col items-center justify-center rounded-full bg-[var(--track-surface)] text-center">
          <p className="text-[14px] font-semibold leading-[23px] tabular-nums text-white">
            {totalDuration}
          </p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
            {label}
          </p>
        </div>
      </div>
      {/* Tooltip */}
      {hoveredIndex != null && segments[hoveredIndex] ? (
        <div className="pointer-events-none absolute -top-10 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--track-tooltip-surface)] px-3 py-2 text-[11px] font-medium text-white shadow-[0_4px_12px_var(--track-shadow-tooltip)]">
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
