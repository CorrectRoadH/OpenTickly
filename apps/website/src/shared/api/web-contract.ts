import type { CapabilitySnapshot, QuotaWindow } from "@opentoggl/shared-contracts";

export type WebSubscriptionDto = {
  plan_name?: string;
  state?: string;
};

export type LoginRequestDto = {
  email: string;
  password: string;
};

export type RegisterRequestDto = LoginRequestDto & {
  fullname?: string;
};

export type WebCurrentUserProfileDto = {
  id?: number;
  email?: string;
  fullname?: string;
  image_url?: string;
  timezone?: string;
  default_workspace_id?: number;
  beginning_of_week?: number;
  country_id?: number;
  has_password?: boolean;
  "2fa_enabled"?: boolean;
};

export type WebUserPreferencesDto = {
  date_format?: string;
  duration_format?: string;
  pg_time_zone_name?: string;
  beginningOfWeek?: number;
  collapseTimeEntries?: boolean;
  language_code?: string;
  hide_sidebar_right?: boolean;
  reports_collapse?: boolean;
  manualMode?: boolean;
  manualEntryMode?: string;
  timeofday_format?: string;
};

export type WebOrganizationSettingsDto = {
  id?: number;
  name?: string;
  admin?: boolean;
  max_workspaces?: number;
  pricing_plan_name?: string;
  is_multi_workspace_enabled?: boolean;
  user_count?: number;
};

export type WebWorkspaceSettingsDto = {
  id?: number;
  organization_id?: number;
  name?: string;
  logo_url?: string;
  default_currency?: string;
  default_hourly_rate?: number;
  rounding?: number;
  rounding_minutes?: number;
  reports_collapse?: boolean;
  only_admins_may_create_projects?: boolean;
  only_admins_may_create_tags?: boolean;
  only_admins_see_team_dashboard?: boolean;
  projects_billable_by_default?: boolean;
  projects_private_by_default?: boolean;
  projects_enforce_billable?: boolean;
  limit_public_project_data?: boolean;
  admin?: boolean;
  premium?: boolean;
  role?: string;
};

export type WebWorkspacePreferencesDto = {
  hide_start_end_times?: boolean;
  report_locked_at?: string;
};

export type WebSessionBootstrapDto = {
  current_organization_id?: number | null;
  current_workspace_id?: number | null;
  organization_subscription?: WebSubscriptionDto | null;
  organizations: WebOrganizationSettingsDto[];
  user: WebCurrentUserProfileDto;
  workspace_capabilities: CapabilitySnapshot | null;
  workspace_quota: QuotaWindow | null;
  workspace_subscription?: WebSubscriptionDto | null;
  workspaces: WebWorkspaceSettingsDto[];
};

export type OrganizationSettingsEnvelopeDto = {
  organization: WebOrganizationSettingsDto;
  subscription?: WebSubscriptionDto | null;
};

export type WorkspaceSettingsEnvelopeDto = {
  capabilities?: CapabilitySnapshot | null;
  preferences: WebWorkspacePreferencesDto;
  subscription?: WebSubscriptionDto | null;
  workspace: WebWorkspaceSettingsDto;
  quota?: QuotaWindow | null;
};

export type UpdateCurrentUserProfileRequestDto = {
  email: string;
  fullname: string;
  timezone: string;
  beginning_of_week: number;
  country_id: number;
  default_workspace_id: number;
  current_password?: string;
  password?: string;
};

export type UpdateOrganizationSettingsRequestDto = {
  organization: {
    name: string;
  };
};

export type UpdateWorkspaceSettingsRequestDto = {
  workspace?: {
    name: string;
    default_currency: string;
    default_hourly_rate: number;
    rounding: number;
    rounding_minutes: number;
    reports_collapse: boolean;
    only_admins_may_create_projects: boolean;
    only_admins_may_create_tags: boolean;
    only_admins_see_team_dashboard: boolean;
    projects_billable_by_default: boolean;
    projects_private_by_default: boolean;
    projects_enforce_billable: boolean;
    limit_public_project_data: boolean;
  };
  preferences?: WebWorkspacePreferencesDto;
};
