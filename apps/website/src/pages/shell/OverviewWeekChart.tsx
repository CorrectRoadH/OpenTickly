import type { ReactElement } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatClockDuration } from "../../features/tracking/overview-data.ts";

const BAR_COLOR = "#B744AB";
const BAR_EMPTY_COLOR = "#42243E";
const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];

type WeekChartDay = {
  label: string;
  weekday: string;
  date: string;
  totalSeconds: number;
};

type OverviewWeekChartProps = {
  days: WeekChartDay[];
  axisMaxSeconds: number;
  axisLabels: string[];
};

/**
 * Recharts-based bar chart matching Toggl's overview "This week summary".
 * Uses the same library (Recharts) Toggl uses under the hood.
 */
export function OverviewWeekChart({
  days,
  axisMaxSeconds,
  axisLabels,
}: OverviewWeekChartProps): ReactElement {
  const data = days.map((day) => ({
    name: day.label,
    weekday: day.weekday,
    date: day.date,
    seconds: day.totalSeconds,
  }));

  const yTicks = axisLabels.map((_, i) => {
    const frac = i / (axisLabels.length - 1);
    return Math.round(axisMaxSeconds * (1 - frac));
  });

  return (
    <ResponsiveContainer height={300} width="100%">
      <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--track-border)" strokeDasharray="2 2" vertical={false} />
        <XAxis
          axisLine={{ stroke: "var(--track-border)", strokeWidth: 2 }}
          dataKey="name"
          interval={0}
          tick={<DayAxisTick data={data} />}
          tickLine={false}
        />
        <YAxis
          axisLine={false}
          domain={[0, axisMaxSeconds]}
          tick={<HourAxisTick axisLabels={axisLabels} axisMaxSeconds={axisMaxSeconds} />}
          tickLine={false}
          ticks={yTicks}
          width={44}
        />
        <Tooltip content={<OverviewTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar barSize={34} dataKey="seconds" radius={BAR_RADIUS}>
          <LabelList content={<BarDurationLabel />} dataKey="seconds" position="top" />
          {data.map((entry) => (
            <Cell fill={entry.seconds > 0 ? BAR_COLOR : BAR_EMPTY_COLOR} key={entry.name} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function DayAxisTick(props: Record<string, unknown>): ReactElement {
  const { x, y, payload, data } = props as {
    x: number;
    y: number;
    payload: { value: string };
    data: Array<{ name: string; weekday: string; date: string }>;
  };
  const entry = data.find((d) => d.name === payload.value);
  return (
    <g transform={`translate(${x},${y + 8})`}>
      <text
        dominantBaseline="middle"
        fill="var(--track-text-muted)"
        fontSize={12}
        textAnchor="middle"
      >
        <tspan style={{ fill: "var(--track-text)" }}>{entry?.weekday ?? ""}</tspan>
        <tspan> {entry?.date ?? ""}</tspan>
      </text>
    </g>
  );
}

function HourAxisTick(props: Record<string, unknown>): ReactElement {
  const { x, y, payload, axisLabels, axisMaxSeconds } = props as {
    x: number;
    y: number;
    payload: { value: number };
    axisLabels: string[];
    axisMaxSeconds: number;
  };
  const tickIndex = Math.round((1 - payload.value / axisMaxSeconds) * (axisLabels.length - 1));
  const label = axisLabels[tickIndex] ?? "";
  return (
    <text
      dominantBaseline="middle"
      fill="var(--track-text-soft)"
      fontSize={10}
      textAnchor="start"
      x={x - 40}
      y={y}
    >
      {label}
    </text>
  );
}

function OverviewTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { weekday: string; date: string; seconds: number } }>;
}): ReactElement | null {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="rounded-md bg-[#2c2c2e] px-2.5 py-1.5 text-[11px] font-medium text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
      <span>
        {entry.weekday} {entry.date}
      </span>
      <span className="ml-1.5 tabular-nums text-[var(--track-text-soft)]">
        {formatClockDuration(entry.seconds)}
      </span>
    </div>
  );
}

function BarDurationLabel(props: Record<string, unknown>): ReactElement | null {
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
      fontSize={10}
      textAnchor="middle"
      x={x + width / 2}
      y={y - 10}
    >
      {formatClockDuration(value)}
    </text>
  );
}
