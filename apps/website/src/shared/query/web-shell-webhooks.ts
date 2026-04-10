import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unwrapWebApiResult } from "../api/web-client.ts";
import {
  deleteSubscription,
  getEventFilters,
  getSubscriptions,
  patchSubscription,
  postPing,
  postSubscription,
  updateSubscription,
} from "../api/public/webhooks/index.ts";
import type { ModelsWebhookSubscription } from "../api/public/webhooks/index.ts";

export function useWebhookSubscriptionsQuery(workspaceId: number) {
  return useQuery({
    queryFn: async () =>
      unwrapWebApiResult(
        getSubscriptions({
          path: { workspace_id: workspaceId },
        }),
      ),
    queryKey: ["webhookSubscriptions", workspaceId],
  });
}

export function useWebhookEventFiltersQuery() {
  return useQuery({
    queryFn: async () => unwrapWebApiResult(getEventFilters()),
    queryKey: ["webhookEventFilters"],
    staleTime: Infinity,
  });
}

export function useCreateWebhookMutation(workspaceId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ModelsWebhookSubscription) =>
      unwrapWebApiResult(
        postSubscription({
          body,
          path: { workspace_id: workspaceId },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["webhookSubscriptions", workspaceId],
      });
    },
  });
}

export function useUpdateWebhookMutation(workspaceId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      subscriptionId,
      body,
    }: {
      subscriptionId: number;
      body: ModelsWebhookSubscription;
    }) =>
      unwrapWebApiResult(
        updateSubscription({
          body,
          path: {
            workspace_id: workspaceId,
            subscription_id: subscriptionId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["webhookSubscriptions", workspaceId],
      });
    },
  });
}

export function useToggleWebhookMutation(workspaceId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subscriptionId, enabled }: { subscriptionId: number; enabled: boolean }) =>
      unwrapWebApiResult(
        patchSubscription({
          body: { enabled },
          path: {
            workspace_id: workspaceId,
            subscription_id: subscriptionId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["webhookSubscriptions", workspaceId],
      });
    },
  });
}

export function useDeleteWebhookMutation(workspaceId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionId: number) =>
      unwrapWebApiResult(
        deleteSubscription({
          path: {
            workspace_id: workspaceId,
            subscription_id: subscriptionId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["webhookSubscriptions", workspaceId],
      });
    },
  });
}

export function usePingWebhookMutation(workspaceId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionId: number) =>
      unwrapWebApiResult(
        postPing({
          path: {
            workspace_id: workspaceId,
            subscription_id: subscriptionId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["webhookSubscriptions", workspaceId],
      });
    },
  });
}
