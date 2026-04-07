import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { GroupPayload } from "../api/generated/public-track/types.gen.ts";
import { unwrapWebApiResult } from "../api/web-client.ts";
import {
  deleteOrganizationGroup,
  getOrganizationGroups,
  getWorkspaceGroups,
  postOrganizationGroup,
  postWorkspaceGroup,
  putOrganizationGroup,
} from "../api/public/track/index.ts";

export function useGroupsQuery(workspaceId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspaceGroups({
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
    queryKey: ["groups", workspaceId],
  });
}

export function useCreateGroupMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      unwrapWebApiResult(
        postWorkspaceGroup({
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
        queryKey: ["groups", workspaceId],
      });
    },
  });
}

export function useOrgGroupsQuery(organizationId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getOrganizationGroups({
          path: { organization_id: organizationId },
        }),
      ),
    queryKey: ["org-groups", organizationId],
  });
}

export function useCreateOrgGroupMutation(organizationId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: GroupPayload) =>
      unwrapWebApiResult(
        postOrganizationGroup({
          body: payload,
          path: { organization_id: organizationId },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["org-groups", organizationId],
      });
    },
  });
}

export function useRenameOrgGroupMutation(organizationId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, name }: { groupId: number; name: string }) =>
      unwrapWebApiResult(
        putOrganizationGroup({
          body: { name },
          path: { organization_id: organizationId, group_id: groupId },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["org-groups", organizationId],
      });
    },
  });
}

export function useDeleteOrgGroupMutation(organizationId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: number) =>
      unwrapWebApiResult(
        deleteOrganizationGroup({
          path: { organization_id: organizationId, group_id: groupId },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["org-groups", organizationId],
      });
    },
  });
}

export function useUpdateOrgGroupMutation(organizationId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, payload }: { groupId: number; payload: GroupPayload }) =>
      unwrapWebApiResult(
        putOrganizationGroup({
          body: payload,
          path: { organization_id: organizationId, group_id: groupId },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["org-groups", organizationId],
      });
    },
  });
}
