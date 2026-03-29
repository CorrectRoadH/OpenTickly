import { type ReactElement, useMemo } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { formatClockDuration } from "../../features/tracking/overview-data.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { useTimeEntriesQuery } from "../../shared/query/web-shell.ts";
import { ReportsSurfaceMessage } from "./ReportsSharedWidgets.tsx";

type ReportsDetailedViewProps = {
  dateRange: {
    endDate: string;
    startDate: string;
  };
  filters: {
    description?: string;
    projectIds?: number[];
    tagIds?: number[];
  };
  clientFilter: string[];
  memberFilter: string[];
};

function formatTimeHHMM(isoString: string | undefined): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function matchesFilters(
  entry: GithubComTogglTogglApiInternalModelsTimeEntry,
  filters: ReportsDetailedViewProps["filters"],
  clientFilter: string[],
  _memberFilter: string[],
): boolean {
  if (filters.projectIds?.length && !filters.projectIds.includes(entry.project_id ?? 0)) {
    return false;
  }
  if (filters.tagIds?.length) {
    const entryTagIds = entry.tag_ids ?? [];
    if (!filters.tagIds.some((id) => entryTagIds.includes(id))) {
      return false;
    }
  }
  if (filters.description?.trim()) {
    const needle = filters.description.trim().toLowerCase();
    const desc = (entry.description ?? "").toLowerCase();
    if (!desc.includes(needle)) {
      return false;
    }
  }
  if (clientFilter.length > 0) {
    const entryClient = entry.client_name?.trim() || "";
    if (!clientFilter.includes(entryClient)) {
      return false;
    }
  }
  return true;
}

export function ReportsDetailedView({
  clientFilter,
  dateRange,
  filters,
  memberFilter,
}: ReportsDetailedViewProps): ReactElement {
  const { durationFormat } = useUserPreferences();
  const entriesQuery = useTimeEntriesQuery({
    endDate: dateRange.endDate,
    startDate: dateRange.startDate,
  });

  const filteredEntries = useMemo(() => {
    if (!entriesQuery.data) return [];
    return (entriesQuery.data as GithubComTogglTogglApiInternalModelsTimeEntry[])
      .filter((entry) => (entry.duration ?? 0) >= 0)
      .filter((entry) => matchesFilters(entry, filters, clientFilter, memberFilter))
      .sort((a, b) => {
        const aStart = a.start ?? "";
        const bStart = b.start ?? "";
        return bStart.localeCompare(aStart);
      });
  }, [entriesQuery.data, filters, clientFilter, memberFilter]);

  const totalSeconds = useMemo(
    () => filteredEntries.reduce((sum, entry) => sum + (entry.duration ?? 0), 0),
    [filteredEntries],
  );

  if (entriesQuery.isPending) {
    return <ReportsSurfaceMessage message="Loading detailed entries..." />;
  }

  if (entriesQuery.isError) {
    return <ReportsSurfaceMessage message="Could not load time entries." tone="error" />;
  }

  if (filteredEntries.length === 0) {
    return (
      <ReportsSurfaceMessage message="No time entries found for the selected period and filters." />
    );
  }

  return (
    <section
      className="mt-5 overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]"
      data-testid="reports-detailed-table"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-[var(--track-border)] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3 text-right">Duration</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3 text-center">Billable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--track-border)]">
            {filteredEntries.map((entry) => (
              <DetailedRow entry={entry} key={entry.id} />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-[var(--track-border)] bg-[var(--track-surface-muted)]">
              <td className="px-4 py-3 text-[12px] font-semibold text-white" colSpan={3}>
                Total ({filteredEntries.length} entries)
              </td>
              <td className="px-4 py-3 text-right text-[12px] font-semibold tabular-nums text-white">
                {formatClockDuration(totalSeconds, durationFormat)}
              </td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function DetailedRow({
  entry,
}: {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
}): ReactElement {
  const { durationFormat } = useUserPreferences();
  const tags = entry.tags ?? [];

  return (
    <tr className="text-[12px] text-white hover:bg-[var(--track-surface-muted)]">
      <td className="max-w-[240px] truncate px-4 py-3">
        {entry.description?.trim() || (
          <span className="text-[var(--track-text-soft)]">(no description)</span>
        )}
      </td>
      <td className="px-4 py-3 text-[var(--track-text-muted)]">
        {entry.project_name?.trim() || "-"}
      </td>
      <td className="px-4 py-3 text-[var(--track-text-muted)]">
        {entry.client_name?.trim() || "-"}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {formatClockDuration(entry.duration ?? 0, durationFormat)}
      </td>
      <td className="px-4 py-3 tabular-nums text-[var(--track-text-muted)]">
        {formatTimeHHMM(entry.start)}
      </td>
      <td className="px-4 py-3 tabular-nums text-[var(--track-text-muted)]">
        {formatTimeHHMM(entry.stop)}
      </td>
      <td className="max-w-[180px] truncate px-4 py-3 text-[var(--track-text-muted)]">
        {tags.length > 0 ? tags.join(", ") : "-"}
      </td>
      <td className="px-4 py-3 text-center text-[var(--track-text-muted)]">
        {entry.billable ? "$" : "-"}
      </td>
    </tr>
  );
}
