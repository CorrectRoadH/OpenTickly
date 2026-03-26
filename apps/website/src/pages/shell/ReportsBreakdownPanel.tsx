import type { ReactElement } from "react";

import type { ReportsBreakdownRow } from "./reports-page-data.ts";

type BreakdownPanelProps = {
  breakdownRows: ReportsBreakdownRow[];
  expandedRows: Set<string>;
  toggleRow: (name: string) => void;
};

/**
 * The project/member breakdown table in the Reports Summary view.
 * Each project row has an expand button that reveals member sub-rows.
 */
export function ReportsBreakdownPanel({
  breakdownRows,
  expandedRows,
  toggleRow,
}: BreakdownPanelProps): ReactElement {
  return (
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
            Summary reports now reflect live tracking facts for this workspace and week.
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
            No tracked time for this period yet.
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
  return (
    <li className="border-b border-[var(--track-border)] last:border-b-0">
      <div className="grid grid-cols-[28px_minmax(0,1fr)_98px_98px_24px] items-center gap-3 px-4 py-4">
        <button
          className={`text-left text-[13px] transition-transform ${expanded ? "rotate-90" : ""} text-[var(--track-text-soft)]`}
          data-testid={`reports-expand-${row.name}`}
          onClick={onToggle}
          type="button"
        >
          &gt;
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} />
            <p className="truncate text-[14px] font-medium text-white">{row.name}</p>
            <span className="text-[13px] text-[var(--track-text-soft)]">({row.memberCount})</span>
          </div>
        </div>
        <span className="text-[14px] font-medium tabular-nums text-white">{row.duration}</span>
        <span className="text-[14px] font-medium tabular-nums text-white">{row.shareLabel}</span>
        <span />
      </div>
      {expanded && row.members.length > 0 ? (
        <ul data-testid={`reports-members-${row.name}`}>
          {row.members.map((member) => (
            <li
              className="grid grid-cols-[28px_minmax(0,1fr)_98px_98px_24px] items-center gap-3 border-t border-[var(--track-border)]/50 bg-[var(--track-surface)] px-4 py-3"
              key={member.name}
            >
              <span />
              <p className="truncate pl-5 text-[13px] text-[var(--track-text-muted)]">
                {member.name}
              </p>
              <span className="text-[13px] tabular-nums text-[var(--track-text-muted)]">
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
