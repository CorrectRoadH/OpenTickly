import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  GithubComTogglTogglApiInternalServicesOrganizationUserPayload,
  ModelsPostPayload,
  WorkspacePayload,
} from "../api/generated/public-track/types.gen.ts";
import { unwrapWebApiResult } from "../api/web-client.ts";
import {
  getOrganization,
  getOrganizationUsers,
  postOrganization,
  postOrganizationWorkspaces,
  putOrganization,
  putOrganizationUsers,
} from "../api/public/track/index.ts";
import { deleteOrganization } from "../api/web/index.ts";

import { sessionQueryKey } from "./web-shell.ts";

export function useOrganizationSettingsQuery(organizationId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getOrganization({
          path: {
            organization_id: organizationId,
          },
        }),
      ),
    queryKey: ["organization-settings", organizationId],
  });
}

export function useOrganizationMembersQuery(organizationId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getOrganizationUsers({
          path: {
            organization_id: organizationId,
          },
        }),
      ),
    queryKey: ["organization-members", organizationId],
  });
}

export function useUpdateOrganizationUserMutation(organizationId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: {
      organizationUserId: number;
      payload: GithubComTogglTogglApiInternalServicesOrganizationUserPayload;
    }) =>
      unwrapWebApiResult(
        putOrganizationUsers({
          body: request.payload,
          path: {
            organization_id: organizationId,
            organization_user_id: request.organizationUserId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["organization-members", organizationId],
      });
    },
  });
}

export function useCreateWorkspaceMutation(organizationId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: WorkspacePayload) =>
      unwrapWebApiResult(
        postOrganizationWorkspaces({
          body: request,
          path: {
            organization_id: organizationId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: sessionQueryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: ["organization-settings", organizationId],
      });
    },
  });
}

export function useCreateOrganizationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ModelsPostPayload) =>
      unwrapWebApiResult(
        postOrganization({
          body: request,
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: sessionQueryKey,
      });
    },
  });
}

export function useUpdateOrganizationSettingsMutation(organizationId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: { name?: string }) =>
      unwrapWebApiResult(
        putOrganization({
          body: request,
          path: {
            organization_id: organizationId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["organization-settings", organizationId],
      });
      void queryClient.invalidateQueries({
        queryKey: sessionQueryKey,
      });
    },
  });
}

export function useDeleteOrganizationMutation(organizationId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await unwrapWebApiResult(
        deleteOrganization({
          path: {
            organization_id: organizationId,
          },
        }),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: sessionQueryKey,
      });
    },
  });
}
