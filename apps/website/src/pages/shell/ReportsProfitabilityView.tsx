import { type ReactElement, useMemo, useState } from "react";

import type { SavedWeeklyReportData } from "../../shared/api/generated/public-reports/types.gen.ts";
import { formatClockDuration } from "../../features/tracking/overview-data.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { ReportsSurfaceMessage } from "./ReportsSharedWidgets.tsx";

type ProfitabilityShowMetric = "amount-cost-profit" | "amount" | "cost" | "profit";
type TopEarningCount = 5 | 10 | 20;
type BottomEarningCount = 3 | 5 | 10;
type EarningDimension = "projects" | "members";

type ProfitRow = {
  amount: number;
  color: string;
  cost: number;
  members: ProfitMemberRow[];
  name: string;
  profit: number;
};

type ProfitMemberRow = {
  amount: number;
  cost: number;
  name: string;
  profit: number;
};

type ReportsProfitabilityViewProps = {
  isError: boolean;
  isPending: boolean;
  report: SavedWeeklyReportData | undefined;
};

type DayAmounts = {
  amount: number;
  cost: number;
  label: string;
  profit: number;
};

function buildProfitRows(report: SavedWeeklyReportData | undefined): ProfitRow[] {
  if (!report?.report?.length) return [];

  const projectMap = new Map<
    string,
    {
      amount: number;
      color: string;
      cost: number;
      members: Map<string, { amount: number; cost: number; name: string }>;
      name: string;
    }
  >();

  for (const row of report.report) {
    const name = row.project_name?.trim() || "(No project)";
    const memberName = row.user_name?.trim() || `User ${row.user_id ?? 0}`;
    const existing = projectMap.get(name) ?? {
      amount: 0,
      color: row.project_hex_color ?? row.project_color ?? "#999",
      cost: 0,
      members: new Map(),
      name,
    };

    const billableCents = (row.billable_amounts_in_cents ?? []).reduce((s, v) => s + v, 0);
    const amountDollars = billableCents / 100;
    existing.amount += amountDollars;

    const memberAcc = existing.members.get(memberName) ?? {
      amount: 0,
      cost: 0,
      name: memberName,
    };
    memberAcc.amount += amountDollars;
    existing.members.set(memberName, memberAcc);
    projectMap.set(name, existing);
  }

  return [...projectMap.values()]
    .map((p) => ({
      amount: p.amount,
      color: p.color,
      cost: p.cost,
      members: [...p.members.values()]
        .map((m) => ({ amount: m.amount, cost: m.cost, name: m.name, profit: m.amount - m.cost }))
        .sort((a, b) => b.amount - a.amount),
      name: p.name,
      profit: p.amount - p.cost,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function buildMemberRows(report: SavedWeeklyReportData | undefined): ProfitRow[] {
  if (!report?.report?.length) return [];

  const memberMap = new Map<
    string,
    { amount: number; color: string; cost: number; name: string }
  >();

  for (const row of report.report) {
    const name = row.user_name?.trim() || `User ${row.user_id ?? 0}`;
    const existing = memberMap.get(name) ?? {
      amount: 0,
      color: "var(--track-chart-series-cost)",
      cost: 0,
      name,
    };
    const billableCents = (row.billable_amounts_in_cents ?? []).reduce((s, v) => s + v, 0);
    existing.amount += billableCents / 100;
    memberMap.set(name, existing);
  }

  return [...memberMap.values()]
    .map((m) => ({
      amount: m.amount,
      color: m.color,
      cost: m.cost,
      members: [],
      name: m.name,
      profit: m.amount - m.cost,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function buildDayAmounts(report: SavedWeeklyReportData | undefined): DayAmounts[] {
  if (!report?.report?.length) return [];

  const dayTotals = new Map<number, { amount: number; cost: number }>();
  let maxDayIndex = 0;

  for (const row of report.report) {
    const amounts = row.billable_amounts_in_cents ?? [];
    for (let i = 0; i < amounts.length; i++) {
      const existing = dayTotals.get(i) ?? { amount: 0, cost: 0 };
      existing.amount += amounts[i] / 100;
      dayTotals.set(i, existing);
      if (i > maxDayIndex) maxDayIndex = i;
    }
  }

  const result: DayAmounts[] = [];
  for (let i = 0; i <= maxDayIndex; i++) {
    const day = dayTotals.get(i) ?? { amount: 0, cost: 0 };
    result.push({
      amount: day.amount,
      cost: day.cost,
      label: `Day ${i + 1}`,
      profit: day.amount - day.cost,
    });
  }
  return result;
}

function formatCurrency(value: number): string {
  if (value === 0) return "-";
  return `$${value.toFixed(2)}`;
}

export function ReportsProfitabilityView({
  isError,
  isPending,
  report,
}: ReportsProfitabilityViewProps): ReactElement {
  const { durationFormat } = useUserPreferences();
  const [showMetric, setShowMetric] = useState<ProfitabilityShowMetric>("amount-cost-profit");
  const [topCount, setTopCount] = useState<TopEarningCount>(10);
  const [bottomCount, setBottomCount] = useState<BottomEarningCount>(5);
  const [topDimension, setTopDimension] = useState<EarningDimension>("projects");
  const [bottomDimension, setBottomDimension] = useState<EarningDimension>("projects");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const projectRows = useMemo(() => buildProfitRows(report), [report]);
  const memberRows = useMemo(() => buildMemberRows(report), [report]);
  const dayAmounts = useMemo(() => buildDayAmounts(report), [report]);

  const totalBillableSeconds = useMemo(() => {
    if (!report?.report) return 0;
    return report.report.reduce(
      (s, r) => s + (r.billable_seconds ?? []).reduce((a, b) => a + b, 0),
      0,
    );
  }, [report]);

  const totalAmount = projectRows.reduce((s, r) => s + r.amount, 0);
  const totalCost = projectRows.reduce((s, r) => s + r.cost, 0);
  const totalProfit = totalAmount - totalCost;

  const billablePct = report?.report
    ? (() => {
        const total = report.report.reduce(
          (s, r) => s + (r.seconds ?? []).reduce((a, b) => a + b, 0),
          0,
        );
        return total > 0 ? ((totalBillableSeconds / total) * 100).toFixed(2) : "0.00";
      })()
    : "0.00";

  const topDisplayRows = (topDimension === "members" ? memberRows : projectRows).slice(0, topCount);
  const bottomDisplayRows = [...(bottomDimension === "members" ? memberRows : projectRows)]
    .reverse()
    .slice(0, bottomCount);

  function toggleRow(name: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <>
      <section
        className="mt-5 grid overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] lg:grid-cols-4"
        data-testid="reports-profitability-metrics"
      >
        <MetricCell
          title="Billable hours"
          value={`${formatClockDuration(totalBillableSeconds, durationFormat)} (${billablePct}%)`}
        />
        <MetricCell title="Amount" value={formatCurrency(totalAmount)} />
        <MetricCell title="Cost" value={formatCurrency(totalCost)} />
        <MetricCell title="Profit" value={formatCurrency(totalProfit)} last />
      </section>

      {isPending ? <ReportsSurfaceMessage message="Loading report data..." /> : null}
      {isError ? (
        <ReportsSurfaceMessage message="Reports data is temporarily unavailable." tone="error" />
      ) : null}

      {!isPending && !isError ? (
        <>
          {/* Day trends chart */}
          <section className="mt-5 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--track-border)] px-5 py-4">
              <span className="text-[14px] font-medium text-white">
                Day trends in Amount, Cost and Profit
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--track-text-muted)]">Show:</span>
                <select
                  className="h-8 rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-2 text-[12px] text-white"
                  onChange={(e) => setShowMetric(e.target.value as ProfitabilityShowMetric)}
                  value={showMetric}
                >
                  <option value="amount-cost-profit">Amount, Cost and Profit</option>
                  <option value="amount">Amount</option>
                  <option value="cost">Cost</option>
                  <option value="profit">Profit</option>
                </select>
              </div>
            </div>
            {dayAmounts.length === 0 || dayAmounts.every((d) => d.amount === 0 && d.cost === 0) ? (
              <EmptyChart />
            ) : (
              <DayTrendsChart days={dayAmounts} show={showMetric} />
            )}
          </section>

          {/* Top earning */}
          <EarningPanel
            bottomRows={null}
            count={topCount}
            dimension={topDimension}
            onCountChange={(v) => setTopCount(v as TopEarningCount)}
            onDimensionChange={setTopDimension}
            options={[5, 10, 20]}
            prefix="Top"
            rows={topDisplayRows}
            title="Top earning projects"
          />

          {/* Lowest earning */}
          <EarningPanel
            bottomRows={null}
            count={bottomCount}
            dimension={bottomDimension}
            onCountChange={(v) => setBottomCount(v as BottomEarningCount)}
            onDimensionChange={setBottomDimension}
            options={[3, 5, 10]}
            prefix="Bottom"
            rows={bottomDisplayRows}
            title="Lowest earning projects"
          />

          {/* Breakdown table */}
          <section
            className="mt-5 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]"
            data-testid="reports-profitability-breakdown"
          >
            <div className="flex items-center justify-between border-b border-[var(--track-border)] px-5 py-4">
              <span className="text-[14px] font-medium text-white">
                Project and member breakdown
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--track-border)]">
                    <th className="w-8 px-2 py-3" />
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                      Project | Member
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                      Cost
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                      Profit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projectRows.map((row) => (
                    <BreakdownProjectRow
                      expanded={expandedRows.has(row.name)}
                      key={row.name}
                      onToggle={() => toggleRow(row.name)}
                      row={row}
                    />
                  ))}
                  <tr className="border-t border-[var(--track-border)] font-semibold">
                    <td className="px-2 py-3" />
                    <td className="px-4 py-3 text-white">Total</td>
                    <td className="px-4 py-3 text-white">{formatCurrency(totalAmount)}</td>
                    <td className="px-4 py-3 text-white">{formatCurrency(totalCost)}</td>
                    <td className="px-4 py-3 text-white">{formatCurrency(totalProfit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}

function BreakdownProjectRow({
  expanded,
  onToggle,
  row,
}: {
  expanded: boolean;
  onToggle: () => void;
  row: ProfitRow;
}): ReactElement {
  return (
    <>
      <tr className="border-b border-[var(--track-border)]">
        <td className="px-2 py-3">
          {row.members.length > 0 ? (
            <button
              className={`flex h-5 w-5 items-center justify-center text-[var(--track-text-muted)] transition-transform ${expanded ? "rotate-90" : ""}`}
              onClick={onToggle}
              type="button"
            >
              ▸
            </button>
          ) : null}
        </td>
        <td className="px-4 py-3">
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            <span className="text-white">{row.name}</span>
            <span className="text-[var(--track-text-muted)]">({row.members.length})</span>
          </span>
        </td>
        <td className="px-4 py-3 text-white">{formatCurrency(row.amount)}</td>
        <td className="px-4 py-3 text-white">{formatCurrency(row.cost)}</td>
        <td className="px-4 py-3 text-white">{formatCurrency(row.profit)}</td>
      </tr>
      {expanded
        ? row.members.map((m) => (
            <tr
              className="border-b border-[var(--track-border)] bg-[var(--track-surface-muted)]"
              key={m.name}
            >
              <td className="px-2 py-2" />
              <td className="px-4 py-2 pl-10 text-[var(--track-text-soft)]">{m.name}</td>
              <td className="px-4 py-2 text-[var(--track-text-soft)]">
                {formatCurrency(m.amount)}
              </td>
              <td className="px-4 py-2 text-[var(--track-text-soft)]">{formatCurrency(m.cost)}</td>
              <td className="px-4 py-2 text-[var(--track-text-soft)]">
                {formatCurrency(m.profit)}
              </td>
            </tr>
          ))
        : null}
    </>
  );
}

function DayTrendsChart({
  days,
  show,
}: {
  days: DayAmounts[];
  show: ProfitabilityShowMetric;
}): ReactElement {
  const maxVal = Math.max(
    ...days.map((d) => {
      if (show === "amount") return d.amount;
      if (show === "cost") return d.cost;
      if (show === "profit") return Math.abs(d.profit);
      return Math.max(d.amount, d.cost, Math.abs(d.profit));
    }),
    1,
  );

  return (
    <div className="flex items-end gap-1 px-5 py-6" style={{ height: 180 }}>
      {days.map((day) => {
        const showAmount = show === "amount" || show === "amount-cost-profit";
        const showCost = show === "cost" || show === "amount-cost-profit";
        const showProfit = show === "profit" || show === "amount-cost-profit";
        return (
          <div className="flex flex-1 flex-col items-center gap-1" key={day.label}>
            <div className="flex w-full items-end justify-center gap-[2px]" style={{ height: 120 }}>
              {showAmount ? (
                <div
                  className="w-2 rounded-t-[2px] bg-[var(--track-accent)]"
                  style={{
                    height: `${(day.amount / maxVal) * 100}%`,
                    minHeight: day.amount > 0 ? 2 : 0,
                  }}
                  title={`Amount: ${formatCurrency(day.amount)}`}
                />
              ) : null}
              {showCost ? (
                <div
                  className="w-2 rounded-t-[2px] bg-[var(--track-chart-series-amount)]"
                  style={{
                    height: `${(day.cost / maxVal) * 100}%`,
                    minHeight: day.cost > 0 ? 2 : 0,
                  }}
                  title={`Cost: ${formatCurrency(day.cost)}`}
                />
              ) : null}
              {showProfit ? (
                <div
                  className="w-2 rounded-t-[2px] bg-[var(--track-chart-series-profit)]"
                  style={{
                    height: `${(Math.abs(day.profit) / maxVal) * 100}%`,
                    minHeight: day.profit !== 0 ? 2 : 0,
                  }}
                  title={`Profit: ${formatCurrency(day.profit)}`}
                />
              ) : null}
            </div>
            <span className="text-[11px] text-[var(--track-text-muted)]">{day.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function EarningPanel({
  count,
  dimension,
  onCountChange,
  onDimensionChange,
  options,
  prefix,
  rows,
  title,
}: {
  bottomRows: null;
  count: number;
  dimension: EarningDimension;
  onCountChange: (v: number) => void;
  onDimensionChange: (d: EarningDimension) => void;
  options: number[];
  prefix: string;
  rows: ProfitRow[];
  title: string;
}): ReactElement {
  return (
    <section className="mt-5 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--track-border)] px-5 py-4">
        <span className="text-[14px] font-medium text-white">{title}</span>
        <div className="flex items-center gap-2">
          <select
            className="h-8 rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-2 text-[12px] text-white"
            onChange={(e) => onCountChange(Number(e.target.value))}
            value={count}
          >
            {options.map((n) => (
              <option key={n} value={n}>
                {prefix} {n}
              </option>
            ))}
          </select>
          <select
            className="h-8 rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-2 text-[12px] text-white"
            onChange={(e) => onDimensionChange(e.target.value as EarningDimension)}
            value={dimension}
          >
            <option value="projects">Projects</option>
            <option value="members">Members</option>
          </select>
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyChart />
      ) : (
        <div className="divide-y divide-[var(--track-border)]">
          {rows.map((row) => (
            <div className="flex items-center gap-4 px-5 py-3" key={row.name}>
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
              />
              <span className="min-w-0 flex-1 truncate text-[12px] text-white">{row.name}</span>
              <span className="shrink-0 text-[12px] tabular-nums text-white">
                {formatCurrency(row.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MetricCell({
  last,
  title,
  value,
}: {
  last?: boolean;
  title: string;
  value: string;
}): ReactElement {
  return (
    <div
      className={`px-5 py-4 ${last ? "" : "border-b border-[var(--track-border)] lg:border-b-0 lg:border-r"}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
        {title}
      </p>
      <p className="mt-3 text-[14px] font-semibold leading-[23px] tabular-nums text-white">
        {value}
      </p>
    </div>
  );
}

function EmptyChart(): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <h3 className="text-[14px] font-semibold text-white">Nothing to see here...</h3>
      <p className="max-w-[360px] text-[14px] leading-5 text-[var(--track-text-muted)]">
        We couldn't find any time entries. Try adjusting the date range or applying new filters.
      </p>
    </div>
  );
}
