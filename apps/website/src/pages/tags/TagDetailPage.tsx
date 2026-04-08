import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { AppButton, PageLayout } from "@opentoggl/web-ui";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { formatClockDuration } from "../../features/tracking/overview-data.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { useTagsQuery, useTimeEntriesQuery } from "../../shared/query/web-shell.ts";

type TagDetailPageProps = {
  tagId: number;
  workspaceId: number;
};

function last90DaysRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  return {
    endDate: end.toISOString().slice(0, 10),
    startDate: start.toISOString().slice(0, 10),
  };
}

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

export function TagDetailPage({ tagId, workspaceId }: TagDetailPageProps): ReactElement {
  const { t } = useTranslation("tags");
  const { durationFormat } = useUserPreferences();
  const tagsQuery = useTagsQuery(workspaceId);
  const dateRange = last90DaysRange();
  const entriesQuery = useTimeEntriesQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const tag = (tagsQuery.data as Array<{ id?: number; name?: string }> | undefined)?.find(
    (t) => t.id === tagId,
  );
  const tagName = tag?.name ?? `Tag ${tagId}`;

  const filteredEntries = (() => {
    if (!entriesQuery.data) return [];
    return (entriesQuery.data as GithubComTogglTogglApiInternalModelsTimeEntry[])
      .filter((entry) => (entry.duration ?? 0) >= 0)
      .filter((entry) => (entry.tag_ids ?? []).includes(tagId))
      .sort((a, b) => (b.start ?? "").localeCompare(a.start ?? ""));
  })();

  const totalSeconds = filteredEntries.reduce((sum, entry) => sum + (entry.duration ?? 0), 0);

  return (
    <PageLayout
      title={tagName}
      headerActions={
        <AppButton
          variant="secondary"
          onClick={() => {
            window.location.href = `/workspaces/${workspaceId}/tags`;
          }}
        >
          {t("backToTags")}
        </AppButton>
      }
    >
      <div className="px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
          {t("timeEntries")} &middot; {t("last90Days")}
        </p>
      </div>

      {entriesQuery.isPending ? (
        <div className="px-5 py-8 text-center text-[13px] text-[var(--track-text-muted)]">
          {t("loadingTimeEntries")}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="px-5 py-8 text-center text-[13px] text-[var(--track-text-muted)]">
          {t("noTimeEntriesForTag")}
        </div>
      ) : (
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
                {filteredEntries.map((entry) => (
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
                    {t("totalEntries", { count: filteredEntries.length })}
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
      )}
    </PageLayout>
  );
}
