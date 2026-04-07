import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unwrapWebApiResult } from "../api/web-client.ts";
import {
  deleteWorkspaceTag,
  getWorkspaceTag,
  postWorkspaceTag,
  putWorkspaceTag,
} from "../api/public/track/index.ts";

export function useTagsQuery(workspaceId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspaceTag({
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
    queryKey: ["tags", workspaceId],
  });
}

export function useCreateTagMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      unwrapWebApiResult(
        postWorkspaceTag({
          body: {
            name,
          },
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["tags", workspaceId],
      });
    },
  });
}

export function useUpdateTagMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, name }: { tagId: number; name: string }) =>
      unwrapWebApiResult(
        putWorkspaceTag({
          body: {
            name,
          },
          path: {
            tag_id: tagId,
            workspace_id: workspaceId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["tags", workspaceId],
      });
    },
  });
}

export function useDeleteTagMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: number) =>
      unwrapWebApiResult(
        deleteWorkspaceTag({
          path: {
            tag_id: tagId,
            workspace_id: workspaceId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["tags", workspaceId],
      });
    },
  });
}
