import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unwrapWebApiResult } from "../api/web-client.ts";
import {
  archiveClient,
  deleteWorkspaceClient,
  getWorkspaceClients,
  postWorkspaceClients,
  putWorkspaceClients,
  restoreClient,
} from "../api/public/track/index.ts";

export function useClientsQuery(workspaceId: number) {
  return useQuery({
    queryFn: async () =>
      unwrapWebApiResult(
        getWorkspaceClients({
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
    queryKey: ["clients", workspaceId],
  });
}

export function useCreateClientMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      unwrapWebApiResult(
        postWorkspaceClients({
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
        queryKey: ["clients", workspaceId],
      });
    },
  });
}

export function useRenameClientMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, name }: { clientId: number; name: string }) =>
      unwrapWebApiResult(
        putWorkspaceClients({
          body: { name },
          path: { workspace_id: workspaceId, client_id: clientId },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["clients", workspaceId],
      });
    },
  });
}

export function useDeleteClientMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: number) =>
      unwrapWebApiResult(
        deleteWorkspaceClient({
          path: { workspace_id: workspaceId, client_id: clientId },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["clients", workspaceId],
      });
    },
  });
}

export function useArchiveClientMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: number) =>
      unwrapWebApiResult(
        archiveClient({
          path: { workspace_id: workspaceId, client_id: clientId },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["clients", workspaceId],
      });
    },
  });
}

export function useRestoreClientMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: number) =>
      unwrapWebApiResult(
        restoreClient({
          path: { workspace_id: workspaceId, client_id: clientId },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["clients", workspaceId],
      });
    },
  });
}
