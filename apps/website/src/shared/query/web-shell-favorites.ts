import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unwrapWebApiResult } from "../api/web-client.ts";
import {
  createWorkspaceFavorite,
  getWorkspaceFavorites,
  workspaceDeleteFavorite,
} from "../api/public/track/index.ts";

const favoritesQueryKey = (workspaceId: number) => ["favorites", workspaceId] as const;

export function useFavoritesQuery(workspaceId: number) {
  return useQuery({
    queryFn: async () =>
      unwrapWebApiResult(
        getWorkspaceFavorites({
          path: { workspace_id: workspaceId },
        }),
      ),
    queryKey: favoritesQueryKey(workspaceId),
  });
}

export function useCreateWorkspaceFavoriteMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      billable,
      description,
      projectId,
      tagIds,
      taskId,
    }: {
      billable?: boolean;
      description?: string;
      projectId?: number | null;
      tagIds?: number[];
      taskId?: number | null;
    }) =>
      unwrapWebApiResult(
        createWorkspaceFavorite({
          body: {
            billable,
            description,
            project_id: projectId ?? undefined,
            tag_ids: tagIds,
            task_id: taskId ?? undefined,
          },
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: favoritesQueryKey(workspaceId),
      });
    },
  });
}

export function useDeleteFavoriteMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (favoriteId: number) =>
      unwrapWebApiResult(
        workspaceDeleteFavorite({
          path: {
            workspace_id: workspaceId,
            favorite_id: favoriteId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: favoritesQueryKey(workspaceId),
      });
    },
  });
}
