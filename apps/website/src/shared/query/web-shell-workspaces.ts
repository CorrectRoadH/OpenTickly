import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  UpdateWorkspaceSettingsRequestDto,
  WorkspaceMemberInvitationRequestDto,
} from "../api/web-contract.ts";
import type { SavedWeeklyReportData } from "../api/generated/public-reports/types.gen.ts";
import { postReportsApiV3WorkspaceByWorkspaceIdWeeklyTimeEntries } from "../api/public/reports/index.ts";
import { unwrapWebApiResult } from "../api/web-client.ts";
import {
  getWorkspaceAllActivities,
  getWorkspaceMostActive,
  getWorkspaceTopActivity,
} from "../api/public/track/index.ts";
import {
  disableWorkspaceMember,
  getWorkspacePermissions,
  getWorkspaceSettings,
  inviteWorkspaceMember,
  listWorkspaceMembers,
  removeWorkspaceMember,
  restoreWorkspaceMember,
  updateWorkspacePermissions,
  updateWorkspaceSettings,
} from "../api/web/index.ts";

import {
  sessionQueryKey,
  type UpdateWorkspacePermissionsRequestDto,
  type WeeklyReportQueryOptions,
} from "./web-shell.ts";

const workspaceSettingsQueryKey = (workspaceId: number) =>
  ["workspace-settings", workspaceId] as const;
const workspacePermissionsQueryKey = (workspaceId: number) =>
  ["workspace-permissions", workspaceId] as const;
const workspaceDashboardAllActivitiesQueryKey = (workspaceId: number) =>
  ["workspace-dashboard-all-activities", workspaceId] as const;
const workspaceDashboardMostActiveQueryKey = (workspaceId: number, since?: number) =>
  ["workspace-dashboard-most-active", workspaceId, since ?? null] as const;
const workspaceDashboardTopActivityQueryKey = (workspaceId: number, since?: number) =>
  ["workspace-dashboard-top-activity", workspaceId, since ?? null] as const;

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

export function useWorkspaceMostActiveQuery(workspaceId: number, since?: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspaceMostActive({
          path: {
            workspace_id: workspaceId,
          },
          // Upstream Toggl OpenAPI declares `since` as formData on a GET (invalid),
          // so the generated type drops it. Backend + real API both accept it as a query param.
          ...(since !== undefined ? ({ query: { since } } as object) : {}),
        }),
      ),
    queryKey: workspaceDashboardMostActiveQueryKey(workspaceId, since),
  });
}

export function useWorkspaceTopActivityQuery(workspaceId: number, since?: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspaceTopActivity({
          path: {
            workspace_id: workspaceId,
          },
          // See note on useWorkspaceMostActiveQuery re: missing `since` in generated type.
          ...(since !== undefined ? ({ query: { since } } as object) : {}),
        }),
      ),
    queryKey: workspaceDashboardTopActivityQueryKey(workspaceId, since),
  });
}

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
