import { z } from "zod";

import type {
  UpdateWorkspaceSettingsRequestDto,
  WorkspaceSettingsEnvelopeDto,
} from "../api/web-contract.ts";
import type {
  ModelsMeOrganization,
  ModelsPutPayload,
} from "../api/generated/public-track/types.gen.ts";

const organizationSettingsUpdateSchema = z.object({
  name: z.string().min(1),
});

export type OrganizationSettingsFormValues = z.infer<typeof organizationSettingsUpdateSchema> & {
  maxWorkspaces: number;
  isMultiWorkspaceEnabled: boolean;
  userCount: number;
};

const workspaceSettingsUpdateSchema = z.object({
  name: z.string().min(1),
  defaultCurrency: z.string().min(1),
  defaultHourlyRate: z.number(),
  rounding: z.number().int(),
  roundingMinutes: z.number().int().nonnegative(),
  reportsCollapse: z.boolean(),
  onlyAdminsMayCreateProjects: z.boolean(),
  onlyAdminsMayCreateTags: z.boolean(),
  onlyAdminsSeeTeamDashboard: z.boolean(),
  projectsBillableByDefault: z.boolean(),
  projectsPrivateByDefault: z.boolean(),
  projectsEnforceBillable: z.boolean(),
  limitPublicProjectData: z.boolean(),
  hideStartEndTimes: z.boolean(),
  reportLockedAt: z.string(),
  showTimesheetView: z.boolean(),
  requiredTimeEntryFields: z.array(z.string()),
});

export type WorkspaceSettingsFormValues = z.infer<typeof workspaceSettingsUpdateSchema> & {
  logoUrl: string;
};

export function createOrganizationSettingsFormValues(
  organization: ModelsMeOrganization,
): OrganizationSettingsFormValues {
  return {
    name: organization.name ?? "",
    maxWorkspaces: organization.max_workspaces ?? 0,
    isMultiWorkspaceEnabled: organization.is_multi_workspace_enabled ?? false,
    userCount: organization.user_count ?? 0,
  };
}

export function mapOrganizationSettingsFormToRequest(
  values: OrganizationSettingsFormValues,
): ModelsPutPayload {
  return organizationSettingsUpdateSchema.parse(values);
}

export function createWorkspaceSettingsFormValues(
  envelope: WorkspaceSettingsEnvelopeDto,
): WorkspaceSettingsFormValues {
  const workspace = envelope.workspace;
  const preferences = envelope.preferences;
  return {
    name: workspace.name ?? "",
    defaultCurrency: workspace.default_currency ?? "USD",
    defaultHourlyRate: workspace.default_hourly_rate ?? 0,
    rounding: workspace.rounding ?? 0,
    roundingMinutes: workspace.rounding_minutes ?? 0,
    reportsCollapse: workspace.reports_collapse ?? false,
    onlyAdminsMayCreateProjects: workspace.only_admins_may_create_projects ?? false,
    onlyAdminsMayCreateTags: workspace.only_admins_may_create_tags ?? false,
    onlyAdminsSeeTeamDashboard: workspace.only_admins_see_team_dashboard ?? false,
    projectsBillableByDefault: workspace.projects_billable_by_default ?? false,
    projectsPrivateByDefault: workspace.projects_private_by_default ?? false,
    projectsEnforceBillable: workspace.projects_enforce_billable ?? false,
    limitPublicProjectData: workspace.limit_public_project_data ?? false,
    hideStartEndTimes: preferences.hide_start_end_times ?? false,
    reportLockedAt: preferences.report_locked_at ?? "",
    showTimesheetView: preferences.show_timesheet_view ?? true,
    requiredTimeEntryFields: preferences.required_time_entry_fields ?? [],
    logoUrl: workspace.logo_url ?? "",
  };
}

export function mapWorkspaceSettingsFormToRequest(
  values: WorkspaceSettingsFormValues,
): UpdateWorkspaceSettingsRequestDto {
  const parsed = workspaceSettingsUpdateSchema.parse(values);

  return {
    workspace: {
      name: parsed.name,
      default_currency: parsed.defaultCurrency,
      default_hourly_rate: parsed.defaultHourlyRate,
      rounding: parsed.rounding,
      rounding_minutes: parsed.roundingMinutes,
      reports_collapse: parsed.reportsCollapse,
      only_admins_may_create_projects: parsed.onlyAdminsMayCreateProjects,
      only_admins_may_create_tags: parsed.onlyAdminsMayCreateTags,
      only_admins_see_team_dashboard: parsed.onlyAdminsSeeTeamDashboard,
      projects_billable_by_default: parsed.projectsBillableByDefault,
      projects_private_by_default: parsed.projectsPrivateByDefault,
      projects_enforce_billable: parsed.projectsEnforceBillable,
      limit_public_project_data: parsed.limitPublicProjectData,
    },
    preferences: {
      hide_start_end_times: parsed.hideStartEndTimes,
      report_locked_at: parsed.reportLockedAt,
      show_timesheet_view: parsed.showTimesheetView,
      required_time_entry_fields: parsed.requiredTimeEntryFields,
    },
  };
}
