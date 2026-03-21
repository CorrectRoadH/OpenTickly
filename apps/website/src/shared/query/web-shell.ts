import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  ClientCreateRequestDto,
  ClientListEnvelopeDto,
  LoginRequestDto,
  OrganizationSettingsEnvelopeDto,
  ProjectCreateRequestDto,
  ProjectListEnvelopeDto,
  ProjectMembersEnvelopeDto,
  ProjectSummaryDto,
  RegisterRequestDto,
  UpdateCurrentUserProfileRequestDto,
  UpdateOrganizationSettingsRequestDto,
  UpdateUserPreferencesRequestDto,
  UpdateWorkspaceSettingsRequestDto,
  TagCreateRequestDto,
  TagListEnvelopeDto,
  WebCurrentUserProfileDto,
  WebSessionBootstrapDto,
  WebUserPreferencesDto,
  WorkspaceMemberInvitationRequestDto,
  WorkspaceMembersEnvelopeDto,
  WebWorkspaceSettingsDto,
  WorkspaceSettingsEnvelopeDto,
} from "../api/web-contract.ts";
import { webRequest } from "../api/web-client.ts";

const sessionQueryKey = ["web-session"] as const;
const profileQueryKey = ["web-profile"] as const;
const workspaceSettingsQueryKey = (workspaceId: number) =>
  ["workspace-settings", workspaceId] as const;
const workspacePermissionsQueryKey = (workspaceId: number) =>
  ["workspace-permissions", workspaceId] as const;
const projectsQueryKey = (workspaceId: number, status: ProjectListStatusFilter) =>
  ["projects", workspaceId, status] as const;

export type WorkspacePermissionsDto = Pick<
  WebWorkspaceSettingsDto,
  | "limit_public_project_data"
  | "only_admins_may_create_projects"
  | "only_admins_may_create_tags"
  | "only_admins_see_team_dashboard"
>;

export type UpdateWorkspacePermissionsRequestDto = {
  workspace: WorkspacePermissionsDto;
};

export type WorkspacePermissionsEnvelopeDto = {
  workspace: WorkspacePermissionsDto;
};

type TaskSummary = {
  active: boolean;
  id: number;
  name: string;
  workspace_id: number;
};

type GroupSummary = {
  active: boolean;
  id: number;
  name: string;
  workspace_id: number;
};

type GroupListEnvelope = {
  groups: GroupSummary[];
};

type GroupCreateRequest = {
  name: string;
  workspace_id: number;
};

type TaskListEnvelope = {
  tasks: TaskSummary[];
};

type TaskCreateRequest = {
  name: string;
  workspace_id: number;
};

type ResetCurrentUserApiTokenResponseDto = Pick<WebCurrentUserProfileDto, "api_token">;

export type ProjectListStatusFilter = "active" | "all" | "archived";

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

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      webRequest<void>("/web/v1/auth/logout", {
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
    },
  });
}

export function useProfileQuery() {
  return useQuery({
    queryFn: () => webRequest<WebCurrentUserProfileDto>("/web/v1/profile"),
    queryKey: profileQueryKey,
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
      queryClient.setQueryData(profileQueryKey, data);
      void queryClient.invalidateQueries({
        queryKey: sessionQueryKey,
      });
    },
  });
}

export function useResetApiTokenMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      webRequest<ResetCurrentUserApiTokenResponseDto>("/web/v1/profile/api-token/reset", {
        method: "POST",
      }),
    onSuccess: (data) => {
      queryClient.setQueryData<WebCurrentUserProfileDto | undefined>(profileQueryKey, (profile) =>
        profile
          ? {
              ...profile,
              api_token: data.api_token,
            }
          : profile,
      );
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
    mutationFn: (request: UpdateUserPreferencesRequestDto) =>
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
    queryKey: workspaceSettingsQueryKey(workspaceId),
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
      queryClient.setQueryData(workspaceSettingsQueryKey(workspaceId), data);
      void queryClient.invalidateQueries({
        queryKey: sessionQueryKey,
      });
    },
  });
}

export function useWorkspacePermissionsQuery(workspaceId: number) {
  return useQuery({
    queryFn: () =>
      webRequest<WorkspacePermissionsEnvelopeDto>(`/web/v1/workspaces/${workspaceId}/permissions`),
    queryKey: workspacePermissionsQueryKey(workspaceId),
  });
}

export function useUpdateWorkspacePermissionsMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateWorkspacePermissionsRequestDto) =>
      webRequest<WorkspacePermissionsEnvelopeDto>(`/web/v1/workspaces/${workspaceId}/permissions`, {
        body: request,
        method: "PATCH",
      }),
    onSuccess: async (data) => {
      queryClient.setQueryData(workspacePermissionsQueryKey(workspaceId), data);
      await queryClient.invalidateQueries({
        queryKey: workspaceSettingsQueryKey(workspaceId),
      });
      await queryClient.invalidateQueries({
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

export function useWorkspaceMembersQuery(workspaceId: number) {
  return useQuery({
    queryFn: () =>
      webRequest<WorkspaceMembersEnvelopeDto>(`/web/v1/workspaces/${workspaceId}/members`),
    queryKey: ["workspace-members", workspaceId],
  });
}

export function useInviteWorkspaceMemberMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: WorkspaceMemberInvitationRequestDto) =>
      webRequest(`/web/v1/workspaces/${workspaceId}/members/invitations`, {
        body: request,
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workspace-members", workspaceId],
      });
    },
  });
}

export function useProjectsQuery(workspaceId: number, status: ProjectListStatusFilter = "all") {
  return useQuery({
    queryFn: () =>
      webRequest<ProjectListEnvelopeDto>(
        `/web/v1/projects?workspace_id=${workspaceId}&status=${status}`,
      ),
    queryKey: projectsQueryKey(workspaceId, status),
  });
}

export function useCreateProjectMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ProjectCreateRequestDto) =>
      webRequest(`/web/v1/projects`, {
        body: request,
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["projects", workspaceId],
      });
    },
  });
}

export function useArchiveProjectMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: number) =>
      webRequest<ProjectSummaryDto>(`/web/v1/projects/${projectId}/archive`, {
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["projects", workspaceId],
      });
    },
  });
}

export function useRestoreProjectMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: number) =>
      webRequest<ProjectSummaryDto>(`/web/v1/projects/${projectId}/archive`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["projects", workspaceId],
      });
    },
  });
}

export function usePinProjectMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: number) =>
      webRequest<ProjectSummaryDto>(`/web/v1/projects/${projectId}/pin`, {
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["projects", workspaceId],
      });
    },
  });
}

export function useUnpinProjectMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: number) =>
      webRequest<ProjectSummaryDto>(`/web/v1/projects/${projectId}/pin`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["projects", workspaceId],
      });
    },
  });
}

export function useProjectMembersQuery(projectId: number) {
  return useQuery({
    queryFn: () => webRequest<ProjectMembersEnvelopeDto>(`/web/v1/projects/${projectId}/members`),
    queryKey: ["project-members", projectId],
  });
}

export function useClientsQuery(workspaceId: number) {
  return useQuery({
    queryFn: () => webRequest<ClientListEnvelopeDto>(`/web/v1/clients?workspace_id=${workspaceId}`),
    queryKey: ["clients", workspaceId],
  });
}

export function useCreateClientMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ClientCreateRequestDto) =>
      webRequest(`/web/v1/clients`, {
        body: request,
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["clients", workspaceId],
      });
    },
  });
}

export function useGroupsQuery(workspaceId: number) {
  return useQuery({
    queryFn: () => webRequest<GroupListEnvelope>(`/web/v1/groups?workspace_id=${workspaceId}`),
    queryKey: ["groups", workspaceId],
  });
}

export function useCreateGroupMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: GroupCreateRequest) =>
      webRequest(`/web/v1/groups`, {
        body: request,
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["groups", workspaceId],
      });
    },
  });
}

export function useTasksQuery(workspaceId: number) {
  return useQuery({
    queryFn: () => webRequest<TaskListEnvelope>(`/web/v1/tasks?workspace_id=${workspaceId}`),
    queryKey: ["tasks", workspaceId],
  });
}

export function useCreateTaskMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: TaskCreateRequest) =>
      webRequest(`/web/v1/tasks`, {
        body: request,
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["tasks", workspaceId],
      });
    },
  });
}

export function useTagsQuery(workspaceId: number) {
  return useQuery({
    queryFn: () => webRequest<TagListEnvelopeDto>(`/web/v1/tags?workspace_id=${workspaceId}`),
    queryKey: ["tags", workspaceId],
  });
}

export function useCreateTagMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: TagCreateRequestDto) =>
      webRequest(`/web/v1/tags`, {
        body: request,
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["tags", workspaceId],
      });
    },
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
