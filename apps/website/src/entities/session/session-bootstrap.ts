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
  isInstanceAdmin: boolean;
};

export type SessionOrganizationViewModel = {
  defaultWorkspaceId: number | null;
  id: number;
  isDefault: boolean;
  isCurrent: boolean;
  name: string;
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
  logoUrl: string | null;
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
  availableOrganizations: SessionOrganizationViewModel[];
  user: SessionUserViewModel;
  currentOrganization: SessionOrganizationViewModel | null;
  currentWorkspace: SessionWorkspaceViewModel;
  availableWorkspaces: SessionWorkspaceSummaryViewModel[];
  workspaceCapabilities: CapabilitySnapshot | null;
  workspaceQuota: QuotaWindow | null;
  siteUrl: string;
};

type MapSessionBootstrapOptions = {
  requestedWorkspaceId?: number;
};

export function mapSessionBootstrap(
  dto: WebSessionBootstrapDto,
  options?: MapSessionBootstrapOptions,
): SessionBootstrapViewModel {
  const selectedWorkspace = selectWorkspace(dto.workspaces, dto.current_workspace_id, options);
  const currentOrganizationId =
    selectedWorkspace.organization_id ?? dto.current_organization_id ?? null;
  const resolvedDefaultWorkspaceId =
    dto.user.default_workspace_id ?? dto.workspaces[0]?.id ?? selectedWorkspace.id ?? null;
  const defaultOrganizationId =
    dto.workspaces.find((workspace) => workspace.id === resolvedDefaultWorkspaceId)
      ?.organization_id ?? null;

  return {
    availableOrganizations: dto.organizations
      .map((organization) =>
        mapOrganization(
          dto.workspaces,
          organization,
          organization.id === defaultOrganizationId,
          organization.id === currentOrganizationId,
        ),
      )
      .filter(
        (organization): organization is SessionOrganizationViewModel => organization !== null,
      ),
    user: mapUser(dto.user),
    currentOrganization: mapOrganization(
      dto.workspaces,
      dto.organizations.find((entry) => entry.id === currentOrganizationId) ?? null,
      defaultOrganizationId === currentOrganizationId,
      true,
    ),
    currentWorkspace: mapWorkspace(selectedWorkspace, true),
    availableWorkspaces: dto.workspaces
      .map((workspace) => mapWorkspace(workspace, workspace.id === selectedWorkspace.id))
      .map(({ id, name, organizationId, isCurrent, logoUrl }) => ({
        id,
        name,
        organizationId,
        isCurrent,
        logoUrl,
      })),
    workspaceCapabilities: dto.workspace_capabilities,
    workspaceQuota: dto.workspace_quota,
    siteUrl: (dto.site_url ?? "").replace(/\/+$/, ""),
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
    isInstanceAdmin: dto.is_instance_admin ?? false,
  };
}

function mapOrganization(
  workspaces: WebWorkspaceSettingsDto[],
  organization: WebOrganizationSettingsDto | null,
  isDefault: boolean,
  isCurrent: boolean,
): SessionOrganizationViewModel | null {
  if (!organization?.id) {
    return null;
  }

  const defaultWorkspaceId =
    workspaces.find((workspace) => workspace.organization_id === organization.id)?.id ?? null;

  return {
    defaultWorkspaceId,
    id: organization.id,
    isDefault,
    isCurrent,
    name: organization.name ?? "",
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
