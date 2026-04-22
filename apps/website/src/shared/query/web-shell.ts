import type { ModelsAllPreferences } from "../api/generated/public-track/types.gen.ts";
import type { WebWorkspaceSettingsDto } from "../api/web-contract.ts";

// ── Shared query keys ──────────────────────────────────────────────────
export const sessionQueryKey = ["web-session"] as const;

// ── Shared types ───────────────────────────────────────────────────────

export type ProfilePreferencesDto = ModelsAllPreferences & {
  animation_opt_out?: boolean;
  language_code?: string;
  reports_collapse?: boolean;
};

export type ProjectListStatusFilter = "active" | "all" | "archived";

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

export type UpdateProjectRequest = CreateProjectRequest & {
  active?: boolean;
  projectId: number;
};

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

export type WeeklyReportQueryOptions = {
  description?: string;
  endDate: string;
  projectIds?: number[];
  startDate: string;
  tagIds?: number[];
};

export type BulkEditPatchOperation = {
  op: "add" | "remove" | "replace";
  path: string;
  value: unknown;
};

// ── Shared utilities ───────────────────────────────────────────────────

export function toTrackUtcString(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().replace(".000Z", "Z");
}

// ── Re-exports by domain ───────────────────────────────────────────────

export {
  useSessionBootstrapQuery,
  useLoginMutation,
  useRegisterMutation,
  useVerifyEmailMutation,
  useLogoutMutation,
  useUpdateWebSessionMutation,
  useOnboardingQuery,
  useCompleteOnboardingMutation,
  useResetOnboardingMutation,
} from "./web-shell-session.ts";

export {
  useProfileQuery,
  useUpdateProfileMutation,
  useResetApiTokenMutation,
  usePreferencesQuery,
  useUpdatePreferencesMutation,
} from "./web-shell-profile.ts";

export {
  useTimeEntriesQuery,
  useCurrentTimeEntryQuery,
  useStartTimeEntryMutation,
  useCreateTimeEntryMutation,
  useStopTimeEntryMutation,
  useUpdateTimeEntryMutation,
  useDeleteTimeEntryMutation,
} from "./web-shell-time-entries.ts";

export {
  useBulkEditTimeEntriesMutation,
  useBulkDeleteTimeEntriesMutation,
  useSearchTimeEntriesQuery,
} from "./web-shell-time-entry-bulk.ts";

export {
  useProjectsQuery,
  useProjectDetailQuery,
  useProjectStatisticsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useArchiveProjectMutation,
  useRestoreProjectMutation,
  usePinProjectMutation,
  useUnpinProjectMutation,
  useProjectMembersQuery,
  useWorkspaceUsersQuery,
  useAddProjectMemberMutation,
  useDeleteProjectMutation,
  useProjectGroupsQuery,
  useAddProjectGroupMutation,
  useDeleteProjectGroupMutation,
} from "./web-shell-projects.ts";

export {
  useClientsQuery,
  useCreateClientMutation,
  useRenameClientMutation,
  useDeleteClientMutation,
  useArchiveClientMutation,
  useRestoreClientMutation,
} from "./web-shell-clients.ts";

export {
  useTagsQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
} from "./web-shell-tags.ts";

export { useTasksQuery, useCreateTaskMutation } from "./web-shell-tasks.ts";

export {
  useFavoritesQuery,
  useCreateWorkspaceFavoriteMutation,
  useDeleteFavoriteMutation,
} from "./web-shell-favorites.ts";

export {
  useGoalsQuery,
  useCreateGoalMutation,
  useUpdateGoalMutation,
  useDeleteGoalMutation,
} from "./web-shell-goals.ts";

export {
  useGroupsQuery,
  useCreateGroupMutation,
  useOrgGroupsQuery,
  useCreateOrgGroupMutation,
  useRenameOrgGroupMutation,
  useDeleteOrgGroupMutation,
  useUpdateOrgGroupMutation,
} from "./web-shell-groups.ts";

export {
  useOrganizationSettingsQuery,
  useOrganizationMembersQuery,
  useUpdateOrganizationUserMutation,
  useCreateWorkspaceMutation,
  useCreateOrganizationMutation,
  useUpdateOrganizationSettingsMutation,
  useDeleteOrganizationMutation,
} from "./web-shell-organizations.ts";

export {
  useWorkspaceSettingsQuery,
  useUpdateWorkspaceSettingsMutation,
  useWorkspacePermissionsQuery,
  useUpdateWorkspacePermissionsMutation,
  useWorkspaceMembersQuery,
  useInviteWorkspaceMemberMutation,
  useDisableWorkspaceMemberMutation,
  useRestoreWorkspaceMemberMutation,
  useRemoveWorkspaceMemberMutation,
  useResendWorkspaceInviteMutation,
  useWorkspaceInviteQuery,
  useAcceptWorkspaceInviteMutation,
  useAcceptWorkspaceInviteSignupMutation,
  useWorkspaceAllActivitiesQuery,
  useWorkspaceMostActiveQuery,
  useWorkspaceTopActivityQuery,
  useWorkspaceWeeklyReportQuery,
} from "./web-shell-workspaces.ts";
