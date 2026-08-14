import { useTranslation } from "react-i18next";
import type { ReactElement } from "react";
import { toast } from "sonner";

import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import {
  useDeleteFavoriteMutation,
  useFavoritesQuery,
  useGoalsQuery,
  useStartTimeEntryMutation,
} from "../../shared/query/web-shell.ts";
import { GoalsFavoritesSidebar } from "./GoalsFavoritesSidebar.tsx";

export function ConnectedGoalsFavoritesSidebar({
  workspaceId,
}: {
  workspaceId: number;
}): ReactElement {
  const { t } = useTranslation("toast");
  const { isGoalsViewShown } = useUserPreferences();
  const favoritesQuery = useFavoritesQuery(workspaceId);
  const goalsQuery = useGoalsQuery(workspaceId, isGoalsViewShown);
  const deleteFavoriteMutation = useDeleteFavoriteMutation(workspaceId);
  const startTimeEntryMutation = useStartTimeEntryMutation(workspaceId);
  const favorites = Array.isArray(favoritesQuery.data) ? favoritesQuery.data : [];
  const goals = isGoalsViewShown && Array.isArray(goalsQuery.data) ? goalsQuery.data : [];

  return (
    <GoalsFavoritesSidebar
      favorites={favorites}
      goals={goals}
      showGoals={isGoalsViewShown}
      workspaceId={workspaceId}
      onDeleteFavorite={(favoriteId) => {
        void deleteFavoriteMutation
          .mutateAsync(favoriteId)
          .catch(() => toast.error(t("unexpectedError")));
      }}
      onStartFavorite={(favorite) => {
        void startTimeEntryMutation
          .mutateAsync({
            billable: favorite.billable,
            description: (favorite.description ?? "").trim(),
            projectId: favorite.project_id ?? null,
            start: new Date().toISOString(),
            tagIds: favorite.tag_ids ?? [],
            taskId: favorite.task_id ?? null,
          })
          .catch(() => toast.error(t("failedToSaveTimeEntry")));
      }}
    />
  );
}
