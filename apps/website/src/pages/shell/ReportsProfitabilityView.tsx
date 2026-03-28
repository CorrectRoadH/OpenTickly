import { type ReactElement, useMemo, useState } from "react";

import type { SavedWeeklyReportData } from "../../shared/api/generated/public-reports/types.gen.ts";
import { formatClockDuration } from "../../features/tracking/overview-data.ts";
import { ReportsSurfaceMessage } from "./ReportsSharedWidgets.tsx";

type ProfitabilityShowMetric = "amount-cost-profit" | "amount" | "cost" | "profit";
type TopEarningCount = 5 | 10 | 20;
type BottomEarningCount = 3 | 5 | 10;
type EarningDimension = "projects" | "members";

type ProjectProfitRow = {
  amount: number;
  color: string;
  cost: number;
  memberCount: number;
  name: string;
  profit: number;
  profitability: number | null;
  projectFixedFee: number | null;
};

type ReportsProfitabilityViewProps = {
  isError: boolean;
  isPending: boolean;
  report: SavedWeeklyReportData | undefined;
};

function buildProfitRows(report: SavedWeeklyReportData | undefined): ProjectProfitRow[] {
  if (!report?.report?.length) return [];

  const projectMap = new Map<
    string,
    { amount: number; color: string; cost: number; memberIds: Set<number>; name: string }
  >();

  for (const row of report.report) {
    const name = row.project_name?.trim() || "(No project)";
    const existing = projectMap.get(name) ?? {
      amount: 0,
      color: row.project_hex_color ?? row.project_color ?? "#999",
      cost: 0,
      memberIds: new Set<number>(),
      name,
    };

    const billableCents = (row.billable_amounts_in_cents ?? []).reduce((s, v) => s + v, 0);
    existing.amount += billableCents / 100;
    existing.memberIds.add(row.user_id ?? 0);
    projectMap.set(name, existing);
  }

  return [...projectMap.values()]
    .map((p) => ({
      amount: p.amount,
      color: p.color,
      cost: 0,
      memberCount: p.memberIds.size,
      name: p.name,
      profit: p.amount,
      profitability: null,
      projectFixedFee: null,
    }))
    .sort((a, b) => b.amount - a.amount);
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
  const [showMetric, setShowMetric] = useState<ProfitabilityShowMetric>("amount-cost-profit");
  const [topCount, setTopCount] = useState<TopEarningCount>(10);
  const [bottomCount, setBottomCount] = useState<BottomEarningCount>(5);
  const [topDimension, setTopDimension] = useState<EarningDimension>("projects");
  const [bottomDimension, setBottomDimension] = useState<EarningDimension>("projects");

  const rows = useMemo(() => buildProfitRows(report), [report]);

  const totalBillableSeconds = useMemo(() => {
    if (!report?.report) return 0;
    return report.report.reduce(
      (s, r) => s + (r.billable_seconds ?? []).reduce((a, b) => a + b, 0),
      0,
    );
  }, [report]);

  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
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

  const topRows = rows.slice(0, topCount);
  const bottomRows = [...rows].reverse().slice(0, bottomCount);

  return (
    <>
      {/* Metrics bar */}
      <section
        className="mt-5 grid overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] lg:grid-cols-4"
        data-testid="reports-profitability-metrics"
      >
        <MetricCell
          title="Billable hours"
          value={`${formatClockDuration(totalBillableSeconds)} (${billablePct}%)`}
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
          {/* Day trends */}
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
            {rows.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="px-5 py-8 text-center text-[13px] text-[var(--track-text-muted)]">
                Chart visualization requires billable rate data to be configured.
              </div>
            )}
          </section>

          {/* Top earning projects */}
          <section className="mt-5 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--track-border)] px-5 py-4">
              <span className="text-[14px] font-medium text-white">Top earning projects</span>
              <div className="flex items-center gap-2">
                <select
                  className="h-8 rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-2 text-[12px] text-white"
                  onChange={(e) => setTopCount(Number(e.target.value) as TopEarningCount)}
                  value={topCount}
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={20}>Top 20</option>
                </select>
                <select
                  className="h-8 rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-2 text-[12px] text-white"
                  onChange={(e) => setTopDimension(e.target.value as EarningDimension)}
                  value={topDimension}
                >
                  <option value="projects">Projects</option>
                  <option value="members">Members</option>
                </select>
              </div>
            </div>
            {topRows.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="divide-y divide-[var(--track-border)]">
                {topRows.map((row) => (
                  <EarningRow key={row.name} row={row} />
                ))}
              </div>
            )}
          </section>

          {/* Lowest earning projects */}
          <section className="mt-5 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--track-border)] px-5 py-4">
              <span className="text-[14px] font-medium text-white">Lowest earning projects</span>
              <div className="flex items-center gap-2">
                <select
                  className="h-8 rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-2 text-[12px] text-white"
                  onChange={(e) => setBottomCount(Number(e.target.value) as BottomEarningCount)}
                  value={bottomCount}
                >
                  <option value={3}>Bottom 3</option>
                  <option value={5}>Bottom 5</option>
                  <option value={10}>Bottom 10</option>
                </select>
                <select
                  className="h-8 rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-2 text-[12px] text-white"
                  onChange={(e) => setBottomDimension(e.target.value as EarningDimension)}
                  value={bottomDimension}
                >
                  <option value="projects">Projects</option>
                  <option value="members">Members</option>
                </select>
              </div>
            </div>
            {bottomRows.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="divide-y divide-[var(--track-border)]">
                {bottomRows.map((row) => (
                  <EarningRow key={row.name} row={row} />
                ))}
              </div>
            )}
          </section>

          {/* Breakdown table */}
          <section
            className="mt-5 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]"
            data-testid="reports-profitability-breakdown"
          >
            <div className="flex items-center justify-between border-b border-[var(--track-border)] px-5 py-4">
              <span className="text-[14px] font-medium text-white">
                Project and member breakdown
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--track-text-muted)]">Breakdown by:</span>
                <span className="text-[12px] text-white">Projects</span>
                <span className="text-[11px] text-[var(--track-text-muted)]">and:</span>
                <span className="text-[12px] text-white">Members</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
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
                      Project fixed fee
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                      Cost
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                      Profit
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                      Profitability
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      className="border-b border-[var(--track-border)] last:border-b-0"
                      key={row.name}
                    >
                      <td className="px-2 py-3">
                        <button
                          className="flex h-5 w-5 items-center justify-center text-[var(--track-text-muted)]"
                          type="button"
                        >
                          ▸
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: row.color }}
                          />
                          <span className="text-white">{row.name}</span>
                          <span className="text-[var(--track-text-muted)]">
                            ({row.memberCount})
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white">{formatCurrency(row.amount)}</td>
                      <td className="px-4 py-3 text-white">
                        {row.projectFixedFee != null ? formatCurrency(row.projectFixedFee) : "-"}
                      </td>
                      <td className="px-4 py-3 text-white">{formatCurrency(row.cost)}</td>
                      <td className="px-4 py-3 text-white">{formatCurrency(row.profit)}</td>
                      <td className="px-4 py-3 text-white">
                        {row.profitability != null ? `${row.profitability.toFixed(0)}%` : "-"}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-[var(--track-border)] font-semibold">
                    <td className="px-2 py-3" />
                    <td className="px-4 py-3 text-white">Total</td>
                    <td className="px-4 py-3 text-white">{formatCurrency(totalAmount)}</td>
                    <td className="px-4 py-3 text-white">-</td>
                    <td className="px-4 py-3 text-white">{formatCurrency(totalCost)}</td>
                    <td className="px-4 py-3 text-white">{formatCurrency(totalProfit)}</td>
                    <td className="px-4 py-3 text-white">-</td>
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
      <p className="mt-3 text-[16px] font-semibold leading-[23px] tabular-nums text-white">
        {value}
      </p>
    </div>
  );
}

function EarningRow({ row }: { row: ProjectProfitRow }): ReactElement {
  return (
    <div className="flex items-center gap-4 px-5 py-3">
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: row.color }}
      />
      <span className="min-w-0 flex-1 truncate text-[13px] text-white">{row.name}</span>
      <span className="shrink-0 text-[13px] tabular-nums text-white">
        {formatCurrency(row.amount)}
      </span>
    </div>
  );
}

function EmptyChart(): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <h3 className="text-[18px] font-semibold text-white">Nothing to see here...</h3>
      <p className="max-w-[360px] text-[14px] leading-5 text-[var(--track-text-muted)]">
        We couldn't find any time entries. Try adjusting the date range or applying new filters.
      </p>
    </div>
  );
}
