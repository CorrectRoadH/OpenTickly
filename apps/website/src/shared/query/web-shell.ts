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
  HandlergoalsApiResponse,
  HandlergoalsCreatePayload,
  HandlergoalsUpdatePayload,
  ModelsAllPreferences,
  ModelsSimpleWorkspaceUser,
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
  getWorkspaceUsers,
  getWorkspaceTag,
  getWorkspaceTasksBasic,
  getWorkspaceTopActivity,
  getWorkspacesByWorkspaceIdProjectsByProjectId,
  getWorkspacesByWorkspaceIdProjectsByProjectIdStatistics,
  createWorkspaceFavorite,
  getWorkspaceFavorites,
  workspaceDeleteFavorite,
  archiveClient,
  restoreClient,
  deleteWorkspaceClient,
  deleteWorkspaceProject,
  deleteWorkspaceTimeEntries,
  patchTimeEntries,
  patchWorkspaceStopTimeEntryHandler,
  postWorkspaceProjectUsers,
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
  putWorkspaceClients,
  putWorkspaceProject,
  postWorkspaceTag,
  putWorkspaceTag,
  deleteWorkspaceTag,
  putWorkspaceTimeEntryHandler,
  getWorkspacesByWorkspaceIdGoals,
  postWorkspacesByWorkspaceIdGoals,
  putWorkspacesByWorkspaceIdGoalsByGoalId,
  deleteWorkspacesByWorkspaceIdGoalsByGoalId,
} from "../api/public/track/index.ts";
import {
  deleteOrganization,
  disableWorkspaceMember,
  completeOnboarding,
  getOnboarding,
  resetOnboarding,
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
  searchWorkspaceTimeEntries,
  updateWorkspacePermissions,
  updateWebSession,
  updateWorkspaceSettings,
} from "../api/web/index.ts";
import type { TimeEntrySearchResult } from "../api/generated/web/types.gen.ts";

export const sessionQueryKey = ["web-session"] as const;
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
const goalsQueryKey = (workspaceId: number, active?: boolean) =>
  ["goals", workspaceId, active ?? null] as const;
const workspaceDashboardAllActivitiesQueryKey = (workspaceId: number) =>
  ["workspace-dashboard-all-activities", workspaceId] as const;
const workspaceDashboardMostActiveQueryKey = (workspaceId: number) =>
  ["workspace-dashboard-most-active", workspaceId] as const;
const workspaceDashboardTopActivityQueryKey = (workspaceId: number) =>
  ["workspace-dashboard-top-activity", workspaceId] as const;

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
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdatePreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ProfilePreferencesDto) =>
      unwrapWebApiResult(postPreferences({ body: request })),
    onSuccess: async (_data, request) => {
      await queryClient.invalidateQueries({
        queryKey: ["web-preferences"],
      });
      // Directly update the query cache to ensure LanguageSync reacts immediately
      queryClient.setQueryData<ProfilePreferencesDto>(["web-preferences"], (old) =>
        old ? { ...old, language_code: request.language_code } : old,
      );
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
    refetchInterval: 30_000,
  });
}

export function useCurrentTimeEntryQuery() {
  return useQuery({
    queryFn: () => unwrapWebApiResult(getCurrentTimeEntry()),
    queryKey: currentTimeEntryQueryKey,
    retry: false,
    refetchInterval: 30_000,
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

export type WeeklyReportQueryOptions = {
  description?: string;
  endDate: string;
  projectIds?: number[];
  startDate: string;
  tagIds?: number[];
};

export function useWorkspaceWeeklyReportQuery(
  workspaceId: number,
  options: WeeklyReportQueryOptions,
) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        postReportsApiV3WorkspaceByWorkspaceIdWeeklyTimeEntries({
          body: {
            description: options.description?.trim() || undefined,
            end_date: options.endDate,
            project_ids: options.projectIds?.length ? options.projectIds : undefined,
            start_date: options.startDate,
            tag_ids: options.tagIds?.length ? options.tagIds : undefined,
          },
          path: {
            workspace_id: workspaceId,
          },
        }),
      ) as Promise<SavedWeeklyReportData>,
    queryKey: [
      "workspace-weekly-report",
      workspaceId,
      options.startDate,
      options.endDate,
      options.projectIds ?? [],
      options.tagIds ?? [],
      options.description?.trim() ?? "",
    ] as const,
  });
}

export function useStartTimeEntryMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: {
      billable?: boolean;
      description: string;
      projectId?: number | null;
      start: string;
      tagIds?: number[];
      taskId?: number | null;
    }) =>
      unwrapWebApiResult(
        postWorkspaceTimeEntries({
          body: {
            billable: request.billable,
            created_with: "opentoggl-web",
            description: request.description,
            duration: -1,
            project_id: request.projectId ?? undefined,
            start: toTrackUtcString(request.start),
            tag_ids: request.tagIds,
            task_id: request.taskId ?? undefined,
            workspace_id: workspaceId,
          },
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: currentTimeEntryQueryKey });
      const previous = queryClient.getQueryData(currentTimeEntryQueryKey);
      const optimistic: GithubComTogglTogglApiInternalModelsTimeEntry = {
        id: -Date.now(),
        workspace_id: workspaceId,
        wid: workspaceId,
        description: request.description,
        start: request.start,
        duration: -1,
        billable: request.billable ?? false,
        project_id: request.projectId ?? null,
        tag_ids: request.tagIds ?? [],
        task_id: request.taskId ?? null,
      };
      queryClient.setQueryData(currentTimeEntryQueryKey, optimistic);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (navigator.onLine && context?.previous !== undefined) {
        queryClient.setQueryData(currentTimeEntryQueryKey, context.previous);
      }
    },
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

export function useCreateTimeEntryMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: {
      billable?: boolean;
      description?: string;
      duration: number;
      projectId?: number | null;
      start: string;
      stop: string;
      tagIds?: number[];
      taskId?: number | null;
    }) =>
      unwrapWebApiResult(
        postWorkspaceTimeEntries({
          body: {
            billable: request.billable,
            created_with: "opentoggl-web",
            description: request.description,
            duration: request.duration,
            project_id: request.projectId ?? undefined,
            start: toTrackUtcString(request.start),
            stop: toTrackUtcString(request.stop),
            tag_ids: request.tagIds,
            task_id: request.taskId ?? undefined,
            workspace_id: workspaceId,
          },
          path: {
            workspace_id: workspaceId,
          },
          query: {
            meta: true,
          },
        }),
      ),
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: ["time-entries"] });

      const previousLists = queryClient.getQueriesData<
        GithubComTogglTogglApiInternalModelsTimeEntry[]
      >({ queryKey: ["time-entries"] });

      const optimistic: GithubComTogglTogglApiInternalModelsTimeEntry = {
        id: -Date.now(),
        workspace_id: workspaceId,
        wid: workspaceId,
        description: request.description ?? "",
        start: request.start,
        stop: request.stop,
        duration: request.duration,
        billable: request.billable ?? false,
        project_id: request.projectId ?? null,
        tag_ids: request.tagIds ?? [],
        task_id: request.taskId ?? null,
      };

      queryClient.setQueriesData<GithubComTogglTogglApiInternalModelsTimeEntry[]>(
        { queryKey: ["time-entries"] },
        (old) => (old ? [optimistic, ...old] : [optimistic]),
      );

      return { previousLists };
    },
    onError: (_err, _vars, context) => {
      if (!navigator.onLine) return;
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data);
        }
      }
    },
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
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: currentTimeEntryQueryKey });
      const previous = queryClient.getQueryData(currentTimeEntryQueryKey);
      queryClient.setQueryData(currentTimeEntryQueryKey, null);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Only rollback when online — offline errors mean the SW queued the request
      if (navigator.onLine && context?.previous !== undefined) {
        queryClient.setQueryData(currentTimeEntryQueryKey, context.previous);
      }
    },
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
            project_id: request.projectId === undefined ? undefined : request.projectId,
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
    onMutate: async ({ request, timeEntryId }) => {
      await queryClient.cancelQueries({ queryKey: currentTimeEntryQueryKey });
      const previousCurrent = queryClient.getQueryData(currentTimeEntryQueryKey);
      queryClient.setQueryData(
        currentTimeEntryQueryKey,
        (current: GithubComTogglTogglApiInternalModelsTimeEntry | null | undefined) => {
          if (current?.id !== timeEntryId) return current;
          return {
            ...current,
            ...(request.description !== undefined && { description: request.description }),
            ...(request.billable !== undefined && { billable: request.billable }),
            ...(request.projectId !== undefined && { project_id: request.projectId }),
            ...(request.start !== undefined && { start: request.start }),
            ...(request.stop !== undefined && { stop: request.stop }),
            ...(request.tagIds !== undefined && { tag_ids: request.tagIds }),
            ...(request.taskId !== undefined && { task_id: request.taskId }),
          };
        },
      );
      return { previousCurrent };
    },
    onError: (_err, _vars, context) => {
      if (navigator.onLine && context?.previousCurrent !== undefined) {
        queryClient.setQueryData(currentTimeEntryQueryKey, context.previousCurrent);
      }
    },
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
    onMutate: async ({ timeEntryId }) => {
      await queryClient.cancelQueries({ queryKey: ["time-entries"] });
      await queryClient.cancelQueries({ queryKey: currentTimeEntryQueryKey });

      const previousLists = queryClient.getQueriesData<
        GithubComTogglTogglApiInternalModelsTimeEntry[]
      >({ queryKey: ["time-entries"] });
      const previousCurrent = queryClient.getQueryData(currentTimeEntryQueryKey);

      queryClient.setQueriesData<GithubComTogglTogglApiInternalModelsTimeEntry[]>(
        { queryKey: ["time-entries"] },
        (old) => old?.filter((e) => e.id !== timeEntryId),
      );

      queryClient.setQueryData(
        currentTimeEntryQueryKey,
        (current: GithubComTogglTogglApiInternalModelsTimeEntry | null | undefined) =>
          current?.id === timeEntryId ? null : current,
      );

      return { previousLists, previousCurrent };
    },
    onError: (_err, _vars, context) => {
      if (!navigator.onLine) return;
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousCurrent !== undefined) {
        queryClient.setQueryData(currentTimeEntryQueryKey, context.previousCurrent);
      }
    },
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

export type CreateProjectRequest = {
  billable?: boolean;
  clientId?: number;
  color?: string;
  currency?: string;
  endDate?: string;
  estimatedHours?: number;
  fixedFee?: number;
  isPrivate?: boolean;
  name: string;
  rate?: number;
  recurring?: boolean;
  startDate?: string;
  template?: boolean;
};

export function useCreateProjectMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateProjectRequest) =>
      unwrapWebApiResult(
        postWorkspaceProjectCreate({
          body: {
            billable: request.billable,
            client_id: request.clientId,
            color: request.color,
            currency: request.currency,
            end_date: request.endDate,
            estimated_hours: request.estimatedHours,
            fixed_fee: request.fixedFee,
            is_private: request.isPrivate,
            name: request.name,
            rate: request.rate,
            recurring: request.recurring,
            start_date: request.startDate,
            template: request.template,
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

export type UpdateProjectRequest = CreateProjectRequest & {
  active?: boolean;
  projectId: number;
};

export function useUpdateProjectMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateProjectRequest) =>
      unwrapWebApiResult(
        putWorkspaceProject({
          body: {
            active: request.active,
            billable: request.billable,
            client_id: request.clientId,
            color: request.color,
            currency: request.currency,
            end_date: request.endDate,
            estimated_hours: request.estimatedHours,
            fixed_fee: request.fixedFee,
            is_private: request.isPrivate,
            name: request.name,
            rate: request.rate,
            recurring: request.recurring,
            start_date: request.startDate,
            template: request.template,
          },
          path: {
            project_id: request.projectId,
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
    enabled: projectId > 0,
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

export function useWorkspaceUsersQuery(workspaceId: number) {
  return useQuery<Array<ModelsSimpleWorkspaceUser>>({
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspaceUsers({
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
    queryKey: ["workspace-users", workspaceId],
  });
}

export function useAddProjectMemberMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      isManager = false,
      projectId,
      userId,
    }: {
      isManager?: boolean;
      projectId: number;
      userId: number;
    }) =>
      unwrapWebApiResult(
        postWorkspaceProjectUsers({
          body: {
            manager: isManager,
            project_id: projectId,
            user_id: userId,
          },
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["project-members", workspaceId, variables.projectId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["projects", workspaceId],
      });
    },
  });
}

export function useDeleteProjectMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: number) =>
      unwrapWebApiResult(
        deleteWorkspaceProject({
          path: {
            project_id: projectId,
            workspace_id: workspaceId,
          },
          query: {
            teDeletionMode: "unassign",
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

const favoritesQueryKey = (workspaceId: number) => ["favorites", workspaceId] as const;

export function useFavoritesQuery(workspaceId: number) {
  return useQuery({
    queryFn: async () =>
      unwrapWebApiResult(
        getWorkspaceFavorites({
          path: { workspace_id: workspaceId },
        }),
      ),
    queryKey: favoritesQueryKey(workspaceId),
  });
}

export function useCreateWorkspaceFavoriteMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      billable,
      description,
      projectId,
      tagIds,
      taskId,
    }: {
      billable?: boolean;
      description?: string;
      projectId?: number | null;
      tagIds?: number[];
      taskId?: number | null;
    }) =>
      unwrapWebApiResult(
        createWorkspaceFavorite({
          body: {
            billable,
            description,
            project_id: projectId ?? undefined,
            tag_ids: tagIds,
            task_id: taskId ?? undefined,
          },
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: favoritesQueryKey(workspaceId),
      });
    },
  });
}

export function useDeleteFavoriteMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (favoriteId: number) =>
      unwrapWebApiResult(
        workspaceDeleteFavorite({
          path: {
            workspace_id: workspaceId,
            favorite_id: favoriteId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: favoritesQueryKey(workspaceId),
      });
    },
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

export type BulkEditPatchOperation = {
  op: "add" | "remove" | "replace";
  path: string;
  value: unknown;
};

export function useBulkEditTimeEntriesMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      operations,
      timeEntryIds,
    }: {
      operations: BulkEditPatchOperation[];
      timeEntryIds: number[];
    }) =>
      unwrapWebApiResult(
        patchTimeEntries({
          body: operations,
          path: {
            time_entry_ids: timeEntryIds,
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

export function useBulkDeleteTimeEntriesMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timeEntryIds: number[]) => {
      for (const timeEntryId of timeEntryIds) {
        await unwrapWebApiResult(
          deleteWorkspaceTimeEntries({
            path: {
              time_entry_id: timeEntryId,
              workspace_id: workspaceId,
            },
          }),
        );
      }
    },
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

const onboardingQueryKey = () => ["onboarding"] as const;

export function useOnboardingQuery() {
  return useQuery({
    queryFn: () => unwrapWebApiResult(getOnboarding()),
    queryKey: onboardingQueryKey(),
  });
}

export function useCompleteOnboardingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: { version: number; language_code?: string }) =>
      unwrapWebApiResult(completeOnboarding({ body: request })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: onboardingQueryKey() });
    },
  });
}

export function useResetOnboardingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => unwrapWebApiResult(resetOnboarding()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: onboardingQueryKey() });
    },
  });
}

export function useSearchTimeEntriesQuery(workspaceId: number, query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        searchWorkspaceTimeEntries({
          path: { workspace_id: workspaceId },
          query: { query: trimmed },
        }),
      ) as Promise<TimeEntrySearchResult>,
    queryKey: ["time-entry-search", workspaceId, trimmed],
    enabled: trimmed.length > 0,
    staleTime: 5_000,
  });
}
