import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  LoginRequestDto,
  RegisterRequestDto,
  UpdateWebSessionRequestDto,
  UpdateWorkspaceSettingsRequestDto,
  WorkspaceMemberInvitationRequestDto,
  WebWorkspaceSettingsDto,
} from "../api/web-contract.ts";
import type {
  GithubComTogglTogglApiInternalModelsProject,
  GithubComTogglTogglApiInternalModelsTimeEntry,
  ModelsAllPreferences,
  MePayload,
  ModelsPostPayload,
  ModelsProjectStatistics,
  WorkspacePayload,
} from "../api/generated/public-track/types.gen.ts";
import type { SavedWeeklyReportData } from "../api/generated/public-reports/types.gen.ts";
import { postReportsApiV3WorkspaceByWorkspaceIdWeeklyTimeEntries } from "../api/public/reports/index.ts";
import { unwrapWebApiResult } from "../api/web-client.ts";
import {
  getCurrentTimeEntry,
  getMe,
  getOrganization,
  getPreferences,
  getProjects,
  getTimeEntries,
  getWorkspaceAllActivities,
  getWorkspaceClients,
  getWorkspaceGroups,
  getWorkspaceMostActive,
  getWorkspaceProjectUsers,
  getWorkspaceTag,
  getWorkspaceTasksBasic,
  getWorkspaceTopActivity,
  getWorkspacesByWorkspaceIdProjectsByProjectId,
  getWorkspacesByWorkspaceIdProjectsByProjectIdStatistics,
  deleteWorkspaceTimeEntries,
  patchWorkspaceStopTimeEntryHandler,
  postPinnedProject,
  postOrganizationWorkspaces,
  postOrganization,
  postPreferences,
  postResetToken,
  postWorkspaceProjectCreate,
  postWorkspaceTimeEntries,
  postWorkspaceProjectTasks,
  postWorkspaceClients,
  postWorkspaceGroup,
  putMe,
  putOrganization,
  putWorkspaceProject,
  postWorkspaceTag,
  putWorkspaceTimeEntryHandler,
} from "../api/public/track/index.ts";
import {
  disableWorkspaceMember,
  getWebSession,
  getWorkspacePermissions,
  getWorkspaceSettings,
  inviteWorkspaceMember,
  listWorkspaceMembers,
  loginWebUser,
  logoutWebUser,
  registerWebUser,
  removeWorkspaceMember,
  restoreWorkspaceMember,
  updateWorkspacePermissions,
  updateWebSession,
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
const timeEntriesQueryKey = (startDate?: string, endDate?: string, includeSharing?: boolean) =>
  ["time-entries", startDate ?? null, endDate ?? null, includeSharing ?? false] as const;
const currentTimeEntryQueryKey = ["current-time-entry"] as const;
const workspaceDashboardAllActivitiesQueryKey = (workspaceId: number) =>
  ["workspace-dashboard-all-activities", workspaceId] as const;
const workspaceDashboardMostActiveQueryKey = (workspaceId: number) =>
  ["workspace-dashboard-most-active", workspaceId] as const;
const workspaceDashboardTopActivityQueryKey = (workspaceId: number) =>
  ["workspace-dashboard-top-activity", workspaceId] as const;
const workspaceWeeklyReportQueryKey = (workspaceId: number, startDate: string, endDate: string) =>
  ["workspace-weekly-report", workspaceId, startDate, endDate] as const;

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

export type ProfilePreferencesDto = ModelsAllPreferences & {
  animation_opt_out?: boolean;
  language_code?: string;
  reports_collapse?: boolean;
};

export type ProjectListStatusFilter = "active" | "all" | "archived";

function toTrackUtcString(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().replace(".000Z", "Z");
}

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

export function useUpdateWebSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateWebSessionRequestDto) =>
      unwrapWebApiResult(updateWebSession({ body: request })),
    onSuccess: (data) => {
      queryClient.setQueryData(sessionQueryKey, data);
    },
  });
}

export function useProfileQuery() {
  return useQuery({
    queryFn: () => unwrapWebApiResult(getMe()),
    queryKey: profileQueryKey,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: MePayload) => unwrapWebApiResult(putMe({ body: request })),
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
    mutationFn: () => unwrapWebApiResult(postResetToken()),
    onSuccess: (data) => {
      queryClient.setQueryData(profileQueryKey, (profile) =>
        profile
          ? {
              ...profile,
              api_token: data,
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
    queryFn: () => unwrapWebApiResult(getPreferences()) as Promise<ProfilePreferencesDto>,
    queryKey: ["web-preferences"],
  });
}

export function useUpdatePreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ProfilePreferencesDto) =>
      unwrapWebApiResult(postPreferences({ body: request })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["web-preferences"],
      });
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
        getOrganization({
          path: {
            organization_id: organizationId,
          },
        }),
      ),
    queryKey: ["organization-settings", organizationId],
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
        getProjects({
          path: {
            workspace_id: workspaceId,
          },
          query: {
            active: status === "all" ? undefined : status === "active",
            name: "",
            only_templates: false,
            page: 1,
            search: "",
            sort_field: "name",
            sort_order: "ASC",
            sort_pinned: true,
          },
        }),
      ),
    queryKey: projectsQueryKey(workspaceId, status),
  });
}

export function useProjectDetailQuery(workspaceId: number, projectId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspacesByWorkspaceIdProjectsByProjectId({
          path: {
            project_id: projectId,
            workspace_id: workspaceId,
          },
        }),
      ) as Promise<GithubComTogglTogglApiInternalModelsProject>,
    queryKey: ["project-detail", workspaceId, projectId],
  });
}

export function useProjectStatisticsQuery(workspaceId: number, projectId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspacesByWorkspaceIdProjectsByProjectIdStatistics({
          path: {
            project_id: projectId,
            workspace_id: workspaceId,
          },
        }),
      ) as Promise<ModelsProjectStatistics>,
    queryKey: ["project-statistics", workspaceId, projectId],
  });
}

export function useTimeEntriesQuery(options: {
  endDate?: string;
  includeSharing?: boolean;
  startDate?: string;
}) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getTimeEntries({
          query: {
            end_date: options?.endDate,
            include_sharing: options?.includeSharing,
            meta: true,
            start_date: options?.startDate,
          },
        }),
      ),
    queryKey: timeEntriesQueryKey(options?.startDate, options?.endDate, options?.includeSharing),
  });
}

export function useCurrentTimeEntryQuery() {
  return useQuery({
    queryFn: () => unwrapWebApiResult(getCurrentTimeEntry()),
    queryKey: currentTimeEntryQueryKey,
    retry: false,
  });
}

export function useWorkspaceAllActivitiesQuery(workspaceId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspaceAllActivities({
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
    queryKey: workspaceDashboardAllActivitiesQueryKey(workspaceId),
  });
}

export function useWorkspaceMostActiveQuery(workspaceId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspaceMostActive({
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
    queryKey: workspaceDashboardMostActiveQueryKey(workspaceId),
  });
}

export function useWorkspaceTopActivityQuery(workspaceId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspaceTopActivity({
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
    queryKey: workspaceDashboardTopActivityQueryKey(workspaceId),
  });
}

export function useWorkspaceWeeklyReportQuery(
  workspaceId: number,
  options: {
    endDate: string;
    startDate: string;
  },
) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        postReportsApiV3WorkspaceByWorkspaceIdWeeklyTimeEntries({
          body: {
            end_date: options.endDate,
            start_date: options.startDate,
          },
          path: {
            workspace_id: workspaceId,
          },
        }),
      ) as Promise<SavedWeeklyReportData>,
    queryKey: workspaceWeeklyReportQueryKey(workspaceId, options.startDate, options.endDate),
  });
}

export function useStartTimeEntryMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: {
      description: string;
      projectId?: number | null;
      start: string;
      tagIds?: number[];
    }) =>
      unwrapWebApiResult(
        postWorkspaceTimeEntries({
          body: {
            created_with: "opentoggl-web",
            description: request.description,
            duration: -1,
            project_id: request.projectId ?? undefined,
            start: toTrackUtcString(request.start),
            tag_ids: request.tagIds,
            workspace_id: workspaceId,
          },
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
    onSuccess: async (data) => {
      queryClient.setQueryData(currentTimeEntryQueryKey, data);
      await queryClient.invalidateQueries({
        queryKey: ["time-entries"],
      });
      await queryClient.invalidateQueries({
        queryKey: currentTimeEntryQueryKey,
      });
    },
  });
}

export function useStopTimeEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ timeEntryId, workspaceId }: { timeEntryId: number; workspaceId: number }) =>
      unwrapWebApiResult(
        patchWorkspaceStopTimeEntryHandler({
          path: {
            time_entry_id: timeEntryId,
            workspace_id: workspaceId,
          },
        }),
      ),
    onSuccess: async () => {
      queryClient.setQueryData(currentTimeEntryQueryKey, null);
      await queryClient.invalidateQueries({
        queryKey: ["time-entries"],
      });
      await queryClient.invalidateQueries({
        queryKey: currentTimeEntryQueryKey,
      });
    },
  });
}

export function useUpdateTimeEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      request,
      timeEntryId,
      workspaceId,
    }: {
      request: {
        billable?: boolean;
        description?: string;
        projectId?: number | null;
        start?: string;
        stop?: string;
        tagIds?: number[];
        taskId?: number | null;
      };
      timeEntryId: number;
      workspaceId: number;
    }) =>
      unwrapWebApiResult(
        putWorkspaceTimeEntryHandler({
          body: {
            billable: request.billable,
            description: request.description,
            project_id: request.projectId ?? undefined,
            start: toTrackUtcString(request.start),
            stop: toTrackUtcString(request.stop),
            tag_ids: request.tagIds,
            task_id: request.taskId ?? undefined,
          },
          path: {
            time_entry_id: timeEntryId,
            workspace_id: workspaceId,
          },
          query: {
            include_sharing: true,
            meta: true,
          },
        }),
      ),
    onSuccess: async (data) => {
      queryClient.setQueryData(
        currentTimeEntryQueryKey,
        (current: GithubComTogglTogglApiInternalModelsTimeEntry | null | undefined) =>
          current?.id === data.id ? data : current,
      );
      await queryClient.invalidateQueries({
        queryKey: ["time-entries"],
      });
      await queryClient.invalidateQueries({
        queryKey: currentTimeEntryQueryKey,
      });
    },
  });
}

export function useDeleteTimeEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ timeEntryId, workspaceId }: { timeEntryId: number; workspaceId: number }) =>
      unwrapWebApiResult(
        deleteWorkspaceTimeEntries({
          path: {
            time_entry_id: timeEntryId,
            workspace_id: workspaceId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["time-entries"],
      });
      await queryClient.invalidateQueries({
        queryKey: currentTimeEntryQueryKey,
      });
    },
  });
}

export function useCreateProjectMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ color, name }: { color?: string; name: string }) =>
      unwrapWebApiResult(
        postWorkspaceProjectCreate({
          body: {
            color,
            name,
          },
          path: {
            workspace_id: workspaceId,
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

export function useArchiveProjectMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: number) =>
      unwrapWebApiResult(
        putWorkspaceProject({
          body: {
            active: false,
          },
          path: {
            project_id: projectId,
            workspace_id: workspaceId,
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
        putWorkspaceProject({
          body: {
            active: true,
          },
          path: {
            project_id: projectId,
            workspace_id: workspaceId,
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
        postPinnedProject({
          body: {
            pin: true,
          },
          path: {
            project_id: projectId,
            workspace_id: workspaceId,
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
        postPinnedProject({
          body: {
            pin: false,
          },
          path: {
            project_id: projectId,
            workspace_id: workspaceId,
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

export function useProjectMembersQuery(workspaceId: number, projectId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspaceProjectUsers({
          path: {
            workspace_id: workspaceId,
          },
          query: {
            project_ids: String(projectId),
          },
        }),
      ),
    queryKey: ["project-members", workspaceId, projectId],
  });
}

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

export function useTasksQuery(workspaceId: number, projectId?: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspaceTasksBasic({
          path: {
            workspace_id: workspaceId,
          },
          query: {
            active: undefined,
            page: 1,
            per_page: 200,
            project_id: projectId,
            search: "",
            sort_field: "name",
            sort_order: "ASC",
          },
        }),
      ),
    queryKey: ["tasks", workspaceId, projectId ?? null],
  });
}

export function useCreateTaskMutation(workspaceId: number, projectId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (projectId == null) {
        throw new Error("Project-scoped task creation requires a project ID.");
      }
      await unwrapWebApiResult(
        postWorkspaceProjectTasks({
          body: {
            name,
          },
          path: {
            project_id: projectId,
            workspace_id: workspaceId,
          },
        }),
      );
    },
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
