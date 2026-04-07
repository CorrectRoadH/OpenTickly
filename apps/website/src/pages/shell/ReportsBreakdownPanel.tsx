import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";

import type { ReportsBreakdownRow } from "./reports-page-data.ts";
import type { BreakdownDimension } from "./useReportsPageState.ts";
import { SelectDropdown } from "@opentoggl/web-ui";

type BreakdownPanelProps = {
  breakdownBy: BreakdownDimension;
  breakdownRows: ReportsBreakdownRow[];
  expandedRows: Set<string>;
  onBreakdownByChange: (dim: BreakdownDimension) => void;
  toggleRow: (name: string) => void;
};

/**
 * The project/member breakdown table in the Reports Summary view.
 * Each project row has an expand button that reveals member sub-rows.
 */
export function ReportsBreakdownPanel({
  breakdownBy,
  breakdownRows,
  expandedRows,
  onBreakdownByChange,
  toggleRow,
}: BreakdownPanelProps): ReactElement {
  const { t } = useTranslation("reports");
  const BREAKDOWN_OPTIONS: { label: string; value: BreakdownDimension }[] = [
    { label: t("projects"), value: "projects" },
    { label: t("clients"), value: "clients" },
    { label: t("entries"), value: "entries" },
  ];
  const headerLabel =
    breakdownBy === "projects"
      ? `${t("project")} | ${t("member")}`
      : breakdownBy === "clients"
        ? `${t("client")} | ${t("member")}`
        : t("entry");

  return (
    <section
      className="mt-5 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-5"
      data-testid="reports-breakdown-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[14px] font-semibold leading-[23px] text-white">
            {t("projectAndMemberBreakdown")}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SelectDropdown
            data-testid="reports-breakdown-by"
            onChange={onBreakdownByChange as (value: string) => void}
            options={BREAKDOWN_OPTIONS}
            prefix={t("breakdownBy")}
            value={breakdownBy}
          />
        </div>
      </div>

      <div
        className="mt-4 overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)]"
        data-testid="reports-breakdown-table"
      >
        <div className="grid grid-cols-[28px_minmax(0,1fr)_98px_98px_24px] items-center gap-3 border-b border-[var(--track-border)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
          <span />
          <span>{headerLabel}</span>
          <span>{t("duration")}</span>
          <span>{t("durationPercent")}</span>
          <span className="text-right text-base leading-none">+</span>
        </div>
        {breakdownRows.length > 0 ? (
          <ul>
            {breakdownRows.map((row) => (
              <BreakdownRow
                expanded={expandedRows.has(row.name)}
                key={row.name}
                onToggle={() => toggleRow(row.name)}
                row={row}
              />
            ))}
          </ul>
        ) : (
          <div className="px-4 py-8 text-[14px] text-[var(--track-text-muted)]">
            {t("noTrackedTimeYet")}
          </div>
        )}
      </div>
    </section>
  );
}

function BreakdownRow({
  expanded,
  onToggle,
  row,
}: {
  expanded: boolean;
  onToggle: () => void;
  row: ReportsBreakdownRow;
}): ReactElement {
  const hasMembers = row.members.length > 0;

  return (
    <li className="border-b border-[var(--track-border)] last:border-b-0">
      <div className="grid grid-cols-[28px_minmax(0,1fr)_98px_98px_24px] items-center gap-3 px-4 py-4">
        {hasMembers ? (
          <button
            className={`text-left text-[12px] transition-transform ${expanded ? "rotate-90" : ""} text-[var(--track-text-soft)]`}
            data-testid={`reports-expand-${row.name}`}
            onClick={onToggle}
            type="button"
          >
            &gt;
          </button>
        ) : (
          <span />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} />
            <p className="truncate text-[14px] font-medium text-white">{row.name}</p>
            {hasMembers ? (
              <span className="text-[12px] text-[var(--track-text-soft)]">({row.memberCount})</span>
            ) : null}
          </div>
        </div>
        <span className="text-[14px] font-medium tabular-nums text-white">{row.duration}</span>
        <span className="text-[14px] font-medium tabular-nums text-white">{row.shareLabel}</span>
        <span />
      </div>
      {expanded && hasMembers ? (
        <ul data-testid={`reports-members-${row.name}`}>
          {row.members.map((member) => (
            <li
              className="grid grid-cols-[28px_minmax(0,1fr)_98px_98px_24px] items-center gap-3 border-t border-[var(--track-border)]/50 bg-[var(--track-surface)] px-4 py-3"
              key={member.name}
            >
              <span />
              <p className="truncate pl-5 text-[12px] text-[var(--track-text-muted)]">
                {member.name}
              </p>
              <span className="text-[12px] tabular-nums text-[var(--track-text-muted)]">
                {member.duration}
              </span>
              <span />
              <span />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
