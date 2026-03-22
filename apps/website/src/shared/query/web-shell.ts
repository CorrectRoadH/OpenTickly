import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  ClientCreateRequestDto,
  GroupCreateRequestDto,
  LoginRequestDto,
  ProjectCreateRequestDto,
  RegisterRequestDto,
  TaskCreateRequestDto,
  UpdateCurrentUserProfileRequestDto,
  UpdateOrganizationSettingsRequestDto,
  UpdateUserPreferencesRequestDto,
  UpdateWorkspaceSettingsRequestDto,
  TagCreateRequestDto,
  WebCurrentUserProfileDto,
  WorkspaceMemberInvitationRequestDto,
  WebWorkspaceSettingsDto,
} from "../api/web-contract.ts";
import { unwrapWebApiResult } from "../api/web-client.ts";
import {
  archiveProject,
  createClient,
  createGroup,
  createProject,
  createTag,
  createTask,
  disableWorkspaceMember,
  getCurrentUserPreferences,
  getCurrentUserProfile,
  getOrganizationSettings,
  getWebSession,
  getWorkspacePermissions,
  getWorkspaceSettings,
  inviteWorkspaceMember,
  listClients,
  listGroups,
  listProjectMembers,
  listProjects,
  listTags,
  listTasks,
  listWorkspaceMembers,
  loginWebUser,
  logoutWebUser,
  pinProject,
  registerWebUser,
  removeWorkspaceMember,
  resetCurrentUserApiToken,
  restoreProject,
  restoreWorkspaceMember,
  unpinProject,
  updateCurrentUserPreferences,
  updateCurrentUserProfile,
  updateOrganizationSettings,
  updateWorkspacePermissions,
  updateWorkspaceSettings,
} from "../api/web/index.ts";

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

export type ProjectListStatusFilter = "active" | "all" | "archived";

export function useSessionBootstrapQuery() {
  return useQuery({
    queryFn: () => unwrapWebApiResult(getWebSession()),
    queryKey: sessionQueryKey,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: LoginRequestDto) => unwrapWebApiResult(loginWebUser({ body: request })),
    onSuccess: (data) => {
      queryClient.setQueryData(sessionQueryKey, data);
    },
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RegisterRequestDto) =>
      unwrapWebApiResult(registerWebUser({ body: request })),
    onSuccess: (data) => {
      queryClient.setQueryData(sessionQueryKey, data);
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await unwrapWebApiResult(logoutWebUser());
    },
    onSuccess: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
    },
  });
}

export function useProfileQuery() {
  return useQuery({
    queryFn: () => unwrapWebApiResult(getCurrentUserProfile()),
    queryKey: profileQueryKey,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateCurrentUserProfileRequestDto) =>
      unwrapWebApiResult(updateCurrentUserProfile({ body: request })),
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
    mutationFn: () => unwrapWebApiResult(resetCurrentUserApiToken()),
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
    queryFn: () => unwrapWebApiResult(getCurrentUserPreferences()),
    queryKey: ["web-preferences"],
  });
}

export function useUpdatePreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateUserPreferencesRequestDto) =>
      unwrapWebApiResult(updateCurrentUserPreferences({ body: request })),
    onSuccess: (data) => {
      queryClient.setQueryData(["web-preferences"], data);
    },
  });
}

export function useWorkspaceSettingsQuery(workspaceId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspaceSettings({
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
    queryKey: workspaceSettingsQueryKey(workspaceId),
  });
}

export function useUpdateWorkspaceSettingsMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateWorkspaceSettingsRequestDto) =>
      unwrapWebApiResult(
        updateWorkspaceSettings({
          body: request,
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
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
    queryFn: async () => ({
      workspace: await unwrapWebApiResult(
        getWorkspacePermissions({
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
    }),
    queryKey: workspacePermissionsQueryKey(workspaceId),
  });
}

export function useUpdateWorkspacePermissionsMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdateWorkspacePermissionsRequestDto) => ({
      workspace: await unwrapWebApiResult(
        updateWorkspacePermissions({
          body: request.workspace,
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
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
      unwrapWebApiResult(
        getOrganizationSettings({
          path: {
            organization_id: organizationId,
          },
        }),
      ),
    queryKey: ["organization-settings", organizationId],
  });
}

export function useWorkspaceMembersQuery(workspaceId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        listWorkspaceMembers({
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
    queryKey: ["workspace-members", workspaceId],
  });
}

export function useInviteWorkspaceMemberMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: WorkspaceMemberInvitationRequestDto) =>
      unwrapWebApiResult(
        inviteWorkspaceMember({
          body: request,
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workspace-members", workspaceId],
      });
    },
  });
}

export function useDisableWorkspaceMemberMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: number) =>
      unwrapWebApiResult(
        disableWorkspaceMember({
          path: {
            member_id: memberId,
            workspace_id: workspaceId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workspace-members", workspaceId],
      });
    },
  });
}

export function useRestoreWorkspaceMemberMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: number) =>
      unwrapWebApiResult(
        restoreWorkspaceMember({
          path: {
            member_id: memberId,
            workspace_id: workspaceId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workspace-members", workspaceId],
      });
    },
  });
}

export function useRemoveWorkspaceMemberMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: number) =>
      unwrapWebApiResult(
        removeWorkspaceMember({
          path: {
            member_id: memberId,
            workspace_id: workspaceId,
          },
        }),
      ),
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
      unwrapWebApiResult(
        listProjects({
          query: {
            status,
            workspace_id: workspaceId,
          },
        }),
      ),
    queryKey: projectsQueryKey(workspaceId, status),
  });
}

export function useCreateProjectMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ProjectCreateRequestDto) =>
      unwrapWebApiResult(createProject({ body: request })),
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
      unwrapWebApiResult(
        archiveProject({
          path: {
            project_id: projectId,
          },
        }),
      ),
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
      unwrapWebApiResult(
        restoreProject({
          path: {
            project_id: projectId,
          },
        }),
      ),
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
      unwrapWebApiResult(
        pinProject({
          path: {
            project_id: projectId,
          },
        }),
      ),
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
      unwrapWebApiResult(
        unpinProject({
          path: {
            project_id: projectId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["projects", workspaceId],
      });
    },
  });
}

export function useProjectMembersQuery(projectId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        listProjectMembers({
          path: {
            project_id: projectId,
          },
        }),
      ),
    queryKey: ["project-members", projectId],
  });
}

export function useClientsQuery(workspaceId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        listClients({
          query: {
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
    mutationFn: (request: ClientCreateRequestDto) =>
      unwrapWebApiResult(createClient({ body: request })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["clients", workspaceId],
      });
    },
  });
}

export function useGroupsQuery(workspaceId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        listGroups({
          query: {
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
    mutationFn: (request: GroupCreateRequestDto) =>
      unwrapWebApiResult(createGroup({ body: request })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["groups", workspaceId],
      });
    },
  });
}

export function useTasksQuery(workspaceId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        listTasks({
          query: {
            workspace_id: workspaceId,
          },
        }),
      ),
    queryKey: ["tasks", workspaceId],
  });
}

export function useCreateTaskMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: TaskCreateRequestDto) =>
      unwrapWebApiResult(createTask({ body: request })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["tasks", workspaceId],
      });
    },
  });
}

export function useTagsQuery(workspaceId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        listTags({
          query: {
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
    mutationFn: (request: TagCreateRequestDto) => unwrapWebApiResult(createTag({ body: request })),
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
      unwrapWebApiResult(
        updateOrganizationSettings({
          body: request,
          path: {
            organization_id: organizationId,
          },
        }),
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(["organization-settings", organizationId], data);
      void queryClient.invalidateQueries({
        queryKey: sessionQueryKey,
      });
    },
  });
}
