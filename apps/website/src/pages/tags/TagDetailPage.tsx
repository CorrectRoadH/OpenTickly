import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { AppButton, PageLayout } from "@opentoggl/web-ui";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { TimeEntriesTable } from "../../features/tracking/TimeEntriesTable.tsx";
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

export function TagDetailPage({ tagId, workspaceId }: TagDetailPageProps): ReactElement {
  const { t } = useTranslation("tags");
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

      <TimeEntriesTable entries={filteredEntries} isPending={entriesQuery.isPending} />
    </PageLayout>
  );
}
