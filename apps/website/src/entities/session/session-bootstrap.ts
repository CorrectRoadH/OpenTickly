import type { CapabilitySnapshot, QuotaWindow } from "@opentoggl/shared-contracts";

import type {
  WebCurrentUserProfileDto,
  WebOrganizationSettingsDto,
  WebSessionBootstrapDto,
  WebWorkspaceSettingsDto,
} from "../../shared/api/web-contract.ts";

export type SessionUserViewModel = {
  id: number | null;
  email: string;
  fullName: string;
  imageUrl: string | null;
  timezone: string | null;
  defaultWorkspaceId: number | null;
  beginningOfWeek: number | null;
  hasPassword: boolean;
  twoFactorEnabled: boolean;
};

export type SessionOrganizationViewModel = {
  id: number;
  name: string;
  planName: string | null;
  isAdmin: boolean;
  maxWorkspaces: number | null;
  isMultiWorkspaceEnabled: boolean;
  userCount: number | null;
};

export type SessionWorkspaceSummaryViewModel = {
  id: number;
  name: string;
  organizationId: number | null;
  isCurrent: boolean;
};

export type SessionWorkspaceViewModel = SessionWorkspaceSummaryViewModel & {
  logoUrl: string | null;
  defaultCurrency: string | null;
  defaultHourlyRate: number | null;
  rounding: number | null;
  roundingMinutes: number | null;
  reportsCollapse: boolean;
  onlyAdminsMayCreateProjects: boolean;
  onlyAdminsMayCreateTags: boolean;
  onlyAdminsSeeTeamDashboard: boolean;
  projectsBillableByDefault: boolean;
  projectsPrivateByDefault: boolean;
  projectsEnforceBillable: boolean;
  limitPublicProjectData: boolean;
  isAdmin: boolean;
  isPremium: boolean;
  role: string | null;
};

export type SessionBootstrapViewModel = {
  user: SessionUserViewModel;
  currentOrganization: SessionOrganizationViewModel | null;
  currentWorkspace: SessionWorkspaceViewModel;
  availableWorkspaces: SessionWorkspaceSummaryViewModel[];
  workspaceCapabilities: CapabilitySnapshot | null;
  workspaceQuota: QuotaWindow | null;
};

type MapSessionBootstrapOptions = {
  requestedWorkspaceId?: number;
};

export function mapSessionBootstrap(
  dto: WebSessionBootstrapDto,
  options?: MapSessionBootstrapOptions,
): SessionBootstrapViewModel {
  const selectedWorkspace = selectWorkspace(dto.workspaces, dto.current_workspace_id, options);

  return {
    user: mapUser(dto.user),
    currentOrganization: mapOrganization(
      dto.organizations,
      dto.current_organization_id ?? selectedWorkspace.organization_id ?? null,
      dto.organization_subscription?.plan_name ?? null,
    ),
    currentWorkspace: mapWorkspace(selectedWorkspace, true),
    availableWorkspaces: dto.workspaces
      .map((workspace) => mapWorkspace(workspace, workspace.id === selectedWorkspace.id))
      .map(({ id, name, organizationId, isCurrent }) => ({
        id,
        name,
        organizationId,
        isCurrent,
      })),
    workspaceCapabilities: dto.workspace_capabilities,
    workspaceQuota: dto.workspace_quota,
  };
}

function selectWorkspace(
  workspaces: WebWorkspaceSettingsDto[],
  currentWorkspaceId: number | null | undefined,
  options?: MapSessionBootstrapOptions,
): WebWorkspaceSettingsDto {
  const requestedWorkspace = workspaces.find(
    (workspace) => workspace.id === options?.requestedWorkspaceId,
  );
  if (requestedWorkspace) {
    return requestedWorkspace;
  }

  const currentWorkspace = workspaces.find((workspace) => workspace.id === currentWorkspaceId);
  if (currentWorkspace) {
    return currentWorkspace;
  }

  const firstWorkspace = workspaces[0];
  if (!firstWorkspace) {
    throw new Error("Session bootstrap requires at least one workspace");
  }

  return firstWorkspace;
}

function mapUser(dto: WebCurrentUserProfileDto): SessionUserViewModel {
  return {
    id: dto.id ?? null,
    email: dto.email ?? "",
    fullName: dto.fullname ?? "",
    imageUrl: dto.image_url ?? null,
    timezone: dto.timezone ?? null,
    defaultWorkspaceId: dto.default_workspace_id ?? null,
    beginningOfWeek: dto.beginning_of_week ?? null,
    hasPassword: dto.has_password ?? false,
    twoFactorEnabled: dto["2fa_enabled"] ?? false,
  };
}

function mapOrganization(
  organizations: WebOrganizationSettingsDto[],
  organizationId: number | null,
  planName: string | null,
): SessionOrganizationViewModel | null {
  const organization =
    organizations.find((entry) => entry.id === organizationId) ?? organizations[0];

  if (!organization?.id) {
    return null;
  }

  return {
    id: organization.id,
    name: organization.name ?? "",
    planName: planName ?? organization.pricing_plan_name ?? null,
    isAdmin: organization.admin ?? false,
    maxWorkspaces: organization.max_workspaces ?? null,
    isMultiWorkspaceEnabled: organization.is_multi_workspace_enabled ?? false,
    userCount: organization.user_count ?? null,
  };
}

function mapWorkspace(
  workspace: WebWorkspaceSettingsDto,
  isCurrent: boolean,
): SessionWorkspaceViewModel {
  return {
    id: workspace.id ?? 0,
    name: workspace.name ?? "",
    organizationId: workspace.organization_id ?? null,
    isCurrent,
    logoUrl: workspace.logo_url ?? null,
    defaultCurrency: workspace.default_currency ?? null,
    defaultHourlyRate: workspace.default_hourly_rate ?? null,
    rounding: workspace.rounding ?? null,
    roundingMinutes: workspace.rounding_minutes ?? null,
    reportsCollapse: workspace.reports_collapse ?? false,
    onlyAdminsMayCreateProjects: workspace.only_admins_may_create_projects ?? false,
    onlyAdminsMayCreateTags: workspace.only_admins_may_create_tags ?? false,
    onlyAdminsSeeTeamDashboard: workspace.only_admins_see_team_dashboard ?? false,
    projectsBillableByDefault: workspace.projects_billable_by_default ?? false,
    projectsPrivateByDefault: workspace.projects_private_by_default ?? false,
    projectsEnforceBillable: workspace.projects_enforce_billable ?? false,
    limitPublicProjectData: workspace.limit_public_project_data ?? false,
    isAdmin: workspace.admin ?? false,
    isPremium: workspace.premium ?? false,
    role: workspace.role ?? null,
  };
}
