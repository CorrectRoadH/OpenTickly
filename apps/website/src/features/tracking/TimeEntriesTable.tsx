import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { formatClockDuration } from "./overview-data.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";

function formatTimeHHMM(isoString: string | undefined): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatDate(isoString: string | undefined): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

type TimeEntriesTableProps = {
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  isPending: boolean;
};

export function TimeEntriesTable({ entries, isPending }: TimeEntriesTableProps): ReactElement {
  const { t } = useTranslation("tags");
  const { durationFormat } = useUserPreferences();

  const totalSeconds = entries.reduce((sum, entry) => sum + (entry.duration ?? 0), 0);

  if (isPending) {
    return (
      <div className="px-5 py-8 text-center text-[13px] text-[var(--track-text-muted)]">
        {t("loadingTimeEntries")}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-[13px] text-[var(--track-text-muted)]">
        {t("noTimeEntriesForTag")}
      </div>
    );
  }

  return (
    <section className="mx-5 overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-[var(--track-border)] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
              <th className="px-4 py-3">{t("description")}</th>
              <th className="px-4 py-3">{t("project")}</th>
              <th className="px-4 py-3">{t("date")}</th>
              <th className="px-4 py-3">{t("startTime")}</th>
              <th className="px-4 py-3">{t("stopTime")}</th>
              <th className="px-4 py-3 text-right">{t("duration")}</th>
              <th className="px-4 py-3 text-center">{t("billable")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--track-border)]">
            {entries.map((entry) => (
              <tr
                className="text-[12px] text-white hover:bg-[var(--track-surface-muted)]"
                key={entry.id}
              >
                <td className="max-w-[240px] truncate px-4 py-3">
                  {entry.description?.trim() || (
                    <span className="text-[var(--track-text-soft)]">{t("noDescription")}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {entry.project_name ? (
                    <span
                      className="truncate"
                      style={{ color: entry.project_color || "var(--track-text-muted)" }}
                    >
                      {entry.project_name}
                    </span>
                  ) : (
                    <span className="text-[var(--track-text-muted)]">-</span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums text-[var(--track-text-muted)]">
                  {formatDate(entry.start)}
                </td>
                <td className="px-4 py-3 tabular-nums text-[var(--track-text-muted)]">
                  {formatTimeHHMM(entry.start)}
                </td>
                <td className="px-4 py-3 tabular-nums text-[var(--track-text-muted)]">
                  {formatTimeHHMM(entry.stop)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatClockDuration(entry.duration ?? 0, durationFormat)}
                </td>
                <td className="px-4 py-3 text-center text-[var(--track-text-muted)]">
                  {entry.billable ? "$" : "-"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-[var(--track-border)] bg-[var(--track-surface-muted)]">
              <td className="px-4 py-3 text-[12px] font-semibold text-white" colSpan={5}>
                {t("totalEntries", { count: entries.length })}
              </td>
              <td className="px-4 py-3 text-right text-[12px] font-semibold tabular-nums text-white">
                {formatClockDuration(totalSeconds, durationFormat)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
