import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  LoginRequestDto,
  OrganizationSettingsEnvelopeDto,
  RegisterRequestDto,
  UpdateCurrentUserProfileRequestDto,
  UpdateOrganizationSettingsRequestDto,
  UpdateWorkspaceSettingsRequestDto,
  WebCurrentUserProfileDto,
  WebSessionBootstrapDto,
  WebUserPreferencesDto,
  WorkspaceSettingsEnvelopeDto,
} from "../api/web-contract.ts";
import { webRequest } from "../api/web-client.ts";

const sessionQueryKey = ["web-session"] as const;

export function useSessionBootstrapQuery() {
  return useQuery({
    queryFn: () => webRequest<WebSessionBootstrapDto>("/web/v1/session"),
    queryKey: sessionQueryKey,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: LoginRequestDto) =>
      webRequest<WebSessionBootstrapDto>("/web/v1/auth/login", {
        body: request,
        method: "POST",
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(sessionQueryKey, data);
    },
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RegisterRequestDto) =>
      webRequest<WebSessionBootstrapDto>("/web/v1/auth/register", {
        body: request,
        method: "POST",
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(sessionQueryKey, data);
    },
  });
}

export function useProfileQuery() {
  return useQuery({
    queryFn: () => webRequest<WebCurrentUserProfileDto>("/web/v1/profile"),
    queryKey: ["web-profile"],
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateCurrentUserProfileRequestDto) =>
      webRequest<WebCurrentUserProfileDto>("/web/v1/profile", {
        body: request,
        method: "PATCH",
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["web-profile"], data);
      void queryClient.invalidateQueries({
        queryKey: sessionQueryKey,
      });
    },
  });
}

export function usePreferencesQuery() {
  return useQuery({
    queryFn: () => webRequest<WebUserPreferencesDto>("/web/v1/preferences"),
    queryKey: ["web-preferences"],
  });
}

export function useUpdatePreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: WebUserPreferencesDto) =>
      webRequest<WebUserPreferencesDto>("/web/v1/preferences", {
        body: request,
        method: "PATCH",
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["web-preferences"], data);
    },
  });
}

export function useWorkspaceSettingsQuery(workspaceId: number) {
  return useQuery({
    queryFn: () =>
      webRequest<WorkspaceSettingsEnvelopeDto>(`/web/v1/workspaces/${workspaceId}/settings`),
    queryKey: ["workspace-settings", workspaceId],
  });
}

export function useUpdateWorkspaceSettingsMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateWorkspaceSettingsRequestDto) =>
      webRequest<WorkspaceSettingsEnvelopeDto>(`/web/v1/workspaces/${workspaceId}/settings`, {
        body: request,
        method: "PATCH",
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["workspace-settings", workspaceId], data);
      void queryClient.invalidateQueries({
        queryKey: sessionQueryKey,
      });
    },
  });
}

export function useOrganizationSettingsQuery(organizationId: number) {
  return useQuery({
    queryFn: () =>
      webRequest<OrganizationSettingsEnvelopeDto>(
        `/web/v1/organizations/${organizationId}/settings`,
      ),
    queryKey: ["organization-settings", organizationId],
  });
}

export function useUpdateOrganizationSettingsMutation(organizationId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateOrganizationSettingsRequestDto) =>
      webRequest<OrganizationSettingsEnvelopeDto>(
        `/web/v1/organizations/${organizationId}/settings`,
        {
          body: request,
          method: "PATCH",
        },
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(["organization-settings", organizationId], data);
      void queryClient.invalidateQueries({
        queryKey: sessionQueryKey,
      });
    },
  });
}
