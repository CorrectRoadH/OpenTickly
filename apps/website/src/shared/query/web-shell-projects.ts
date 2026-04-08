import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  GithubComTogglTogglApiInternalModelsProject,
  ModelsProjectStatistics,
  ModelsSimpleWorkspaceUser,
} from "../api/generated/public-track/types.gen.ts";
import { unwrapWebApiResult } from "../api/web-client.ts";
import type { ModelsProjectGroup } from "../api/generated/public-track/types.gen.ts";
import {
  deleteProjectGroup,
  deleteWorkspaceProject,
  getProjectGroups,
  getProjects,
  getWorkspaceProjectUsers,
  getWorkspaceUsers,
  getWorkspacesByWorkspaceIdProjectsByProjectId,
  getWorkspacesByWorkspaceIdProjectsByProjectIdStatistics,
  postPinnedProject,
  postProjectGroup,
  postWorkspaceProjectCreate,
  postWorkspaceProjectUsers,
  putWorkspaceProject,
} from "../api/public/track/index.ts";

import {
  type CreateProjectRequest,
  type ProjectListStatusFilter,
  type UpdateProjectRequest,
} from "./web-shell.ts";

const projectsQueryKey = (workspaceId: number, status: ProjectListStatusFilter) =>
  ["projects", workspaceId, status] as const;

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
    mutationFn: ({
      projectId,
      teDeletionMode = "unassign",
      reassignTo,
    }: {
      projectId: number;
      reassignTo?: number;
      teDeletionMode?: "delete" | "unassign";
    }) =>
      unwrapWebApiResult(
        deleteWorkspaceProject({
          path: {
            project_id: projectId,
            workspace_id: workspaceId,
          },
          query: {
            teDeletionMode,
            ...(reassignTo != null ? { reassign_to: String(reassignTo) } : {}),
          } as Record<string, string>,
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["projects", workspaceId],
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Project Groups — associate workspace groups with projects
// ---------------------------------------------------------------------------

const projectGroupsQueryKey = (workspaceId: number) => ["project-groups", workspaceId] as const;

export function useProjectGroupsQuery(workspaceId: number) {
  return useQuery<ModelsProjectGroup[]>({
    queryFn: () =>
      unwrapWebApiResult(
        getProjectGroups({
          path: { workspace_id: workspaceId },
        }),
      ),
    queryKey: projectGroupsQueryKey(workspaceId),
  });
}

export function useAddProjectGroupMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, groupId }: { projectId: number; groupId: number }) =>
      unwrapWebApiResult(
        postProjectGroup({
          body: { project_id: projectId, group_id: groupId },
          path: { workspace_id: workspaceId },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectGroupsQueryKey(workspaceId) });
    },
  });
}

export function useDeleteProjectGroupMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectGroupId: number) =>
      unwrapWebApiResult(
        deleteProjectGroup({
          path: { workspace_id: workspaceId, project_group_id: projectGroupId },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectGroupsQueryKey(workspaceId) });
    },
  });
}
