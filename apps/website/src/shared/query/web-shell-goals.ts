import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  HandlergoalsApiResponse,
  HandlergoalsCreatePayload,
  HandlergoalsUpdatePayload,
} from "../api/generated/public-track/types.gen.ts";
import { unwrapWebApiResult } from "../api/web-client.ts";
import {
  deleteWorkspacesByWorkspaceIdGoalsByGoalId,
  getWorkspacesByWorkspaceIdGoals,
  postWorkspacesByWorkspaceIdGoals,
  putWorkspacesByWorkspaceIdGoalsByGoalId,
} from "../api/public/track/index.ts";

const goalsQueryKey = (workspaceId: number, active?: boolean) =>
  ["goals", workspaceId, active ?? null] as const;

export function useGoalsQuery(workspaceId: number, active?: boolean) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspacesByWorkspaceIdGoals({
          path: {
            workspace_id: workspaceId,
          },
          query: {
            active,
          },
        }),
      ) as Promise<HandlergoalsApiResponse[]>,
    queryKey: goalsQueryKey(workspaceId, active),
  });
}

export function useCreateGoalMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: HandlergoalsCreatePayload) =>
      unwrapWebApiResult(
        postWorkspacesByWorkspaceIdGoals({
          body: request,
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["goals", workspaceId],
      });
    },
  });
}

export function useUpdateGoalMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, request }: { goalId: number; request: HandlergoalsUpdatePayload }) =>
      unwrapWebApiResult(
        putWorkspacesByWorkspaceIdGoalsByGoalId({
          body: request,
          path: {
            goal_id: goalId,
            workspace_id: workspaceId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["goals", workspaceId],
      });
    },
  });
}

export function useDeleteGoalMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (goalId: number) =>
      unwrapWebApiResult(
        deleteWorkspacesByWorkspaceIdGoalsByGoalId({
          path: {
            goal_id: goalId,
            workspace_id: workspaceId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["goals", workspaceId],
      });
    },
  });
}
