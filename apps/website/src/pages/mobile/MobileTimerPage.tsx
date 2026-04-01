import { useTranslation } from "react-i18next";
import { type ReactElement, useState } from "react";

import { GoalItem } from "../../features/tracking/GoalsFavoritesSidebar.tsx";
import { formatClockDuration, formatGroupLabel } from "../../features/tracking/overview-data.ts";
import type {
  GithubComTogglTogglApiInternalModelsTimeEntry,
  ModelsFavorite,
} from "../../shared/api/generated/public-track/types.gen.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import {
  useFavoritesQuery,
  useGoalsQuery,
  useStartTimeEntryMutation,
} from "../../shared/query/web-shell.ts";
import { PlayIcon } from "../../shared/ui/icons.tsx";
import { useTimerPageOrchestration } from "../shell/useTimerPageOrchestration.ts";
import { MobileTimeEntryEditor } from "./MobileTimeEntryEditor.tsx";
import { MobileTimeEntryRow } from "./MobileTimeEntryRow.tsx";

export function MobileTimerPage(): ReactElement {
  const { t } = useTranslation("mobile");
  const orch = useTimerPageOrchestration({ showAllEntries: false });
  const [editingEntry, setEditingEntry] =
    useState<GithubComTogglTogglApiInternalModelsTimeEntry | null>(null);
  const favoritesQuery = useFavoritesQuery(orch.workspaceId);
  const goalsQuery = useGoalsQuery(orch.workspaceId, true);
  const favorites = Array.isArray(favoritesQuery.data) ? favoritesQuery.data : [];
  const goals = Array.isArray(goalsQuery.data) ? goalsQuery.data : [];
  const startMutation = useStartTimeEntryMutation(orch.workspaceId);

  function handleStartFavorite(fav: ModelsFavorite) {
    void startMutation.mutateAsync({
      billable: fav.billable,
      description: fav.description ?? "",
      projectId: fav.project_id ?? null,
      start: new Date().toISOString(),
      tagIds: fav.tag_ids ?? [],
    });
  }

  return (
    <div className="flex flex-col gap-4 pb-4 pt-2">
      {editingEntry ? (
        <MobileTimeEntryEditor entry={editingEntry} onClose={() => setEditingEntry(null)} />
      ) : null}
      {/* Goals */}
      {goals.length > 0 ? (
        <section>
          <SectionHeader title={t("goals")} />
          <div className="flex flex-col gap-0.5 px-2">
            {goals.map((goal) => (
              <GoalItem key={goal.goal_id} goal={goal} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Favorites */}
      {favorites.length > 0 ? (
        <section>
          <SectionHeader title={t("favorites")} />
          <div className="flex flex-col">
            {favorites.map((fav) => (
              <FavoriteRow key={fav.favorite_id} favorite={fav} onStart={handleStartFavorite} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Recent entries */}
      {orch.recentWorkspaceEntries.length > 0 ? (
        <section>
          <SectionHeader title={t("recent")} />
          <div className="flex flex-col">
            {orch.recentWorkspaceEntries.slice(0, 10).map((entry, i) => (
              <MobileTimeEntryRow
                key={entry.id ?? i}
                entry={entry}
                nowMs={orch.nowMs}
                onContinue={orch.handleContinueEntry}
                onEdit={setEditingEntry}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Grouped entries */}
      {orch.groupedEntries.length > 0 ? (
        <section>
          <SectionHeader title={t("thisWeek")} />
          {orch.groupedEntries.map((group) => (
            <div key={group.key}>
              <GroupHeader
                dateKey={group.key}
                timezone={orch.timezone}
                totalSeconds={group.totalSeconds}
              />
              <div className="flex flex-col">
                {group.entries.map((entry, i) => (
                  <MobileTimeEntryRow
                    key={entry.id ?? i}
                    entry={entry}
                    nowMs={orch.nowMs}
                    onContinue={orch.handleContinueEntry}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function SectionHeader({ title }: { title: string }): ReactElement {
  return (
    <h2 className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
      {title}
    </h2>
  );
}

function GroupHeader({
  dateKey,
  timezone,
  totalSeconds,
}: {
  dateKey: string;
  timezone: string;
  totalSeconds: number;
}): ReactElement {
  const { durationFormat } = useUserPreferences();
  return (
    <div className="flex items-center justify-between px-4 py-1.5">
      <span className="text-[12px] font-medium text-[var(--track-text-muted)]">
        {formatGroupLabel(dateKey, timezone)}
      </span>
      <span className="text-[12px] tabular-nums text-[var(--track-text-muted)]">
        {formatClockDuration(totalSeconds, durationFormat)}
      </span>
    </div>
  );
}

function FavoriteRow({
  favorite,
  onStart,
}: {
  favorite: ModelsFavorite;
  onStart: (fav: ModelsFavorite) => void;
}): ReactElement {
  const label = favorite.description?.trim() || favorite.project_name || "Untitled";
  const projectColor = favorite.project_color;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <button
        aria-label={`Start ${label}`}
        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--track-border)] text-[var(--track-text-muted)] transition hover:border-[var(--track-accent)] hover:text-[var(--track-accent)]"
        onClick={() => onStart(favorite)}
        type="button"
      >
        <PlayIcon className="size-3.5" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-white">{label}</p>
        {favorite.project_name && favorite.description?.trim() ? (
          <p className="flex items-center gap-1 truncate text-[11px] text-[var(--track-text-muted)]">
            {projectColor ? (
              <span
                className="inline-block size-[6px] shrink-0 rounded-full"
                style={{ backgroundColor: projectColor }}
              />
            ) : null}
            {favorite.project_name}
          </p>
        ) : null}
      </div>
    </div>
  );
}
