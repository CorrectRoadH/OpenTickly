import type {
  WebCurrentUserProfileDto,
  WebOrganizationSettingsDto,
  WebSessionBootstrapDto,
  WebUserPreferencesDto,
  WebWorkspaceSettingsDto,
} from "../../shared/api/web-contract.ts";

export function createSessionFixture(
  overrides?: Partial<WebSessionBootstrapDto>,
): WebSessionBootstrapDto {
  return {
    current_organization_id: 14,
    current_workspace_id: 202,
    organization_subscription: {
      plan_name: "Starter",
      state: "active",
    },
    organizations: [createOrganizationFixture()],
    user: createProfileFixture(),
    workspace_capabilities: {
      context: {
        scope: "workspace",
        organization_id: 14,
        workspace_id: 202,
      },
      capabilities: [
        {
          key: "reports",
          enabled: true,
          source: "billing",
        },
      ],
    },
    workspace_quota: {
      organization_id: 14,
      remaining: 20,
      resets_in_secs: 600,
      total: 100,
    },
    workspace_subscription: {
      plan_name: "Starter",
      state: "active",
    },
    workspaces: [
      createWorkspaceFixture(),
      createWorkspaceFixture({
        id: 303,
        name: "North Ridge Studio",
        default_currency: "EUR",
      }),
    ],
    ...overrides,
  };
}

export function createProfileFixture(
  overrides?: Partial<WebCurrentUserProfileDto>,
): WebCurrentUserProfileDto {
  return {
    id: 99,
    email: "alex@example.com",
    fullname: "Alex North",
    timezone: "Europe/Tallinn",
    default_workspace_id: 202,
    beginning_of_week: 1,
    country_id: 70,
    has_password: true,
    "2fa_enabled": true,
    ...overrides,
  };
}

export function createPreferencesFixture(
  overrides?: Partial<WebUserPreferencesDto>,
): WebUserPreferencesDto {
  return {
    date_format: "YYYY-MM-DD",
    duration_format: "improved",
    pg_time_zone_name: "Europe/Tallinn",
    beginningOfWeek: 1,
    collapseTimeEntries: true,
    language_code: "en-US",
    hide_sidebar_right: false,
    reports_collapse: true,
    manualMode: false,
    manualEntryMode: "timer",
    timeofday_format: "h:mm a",
    ...overrides,
  };
}

export function createOrganizationFixture(
  overrides?: Partial<WebOrganizationSettingsDto>,
): WebOrganizationSettingsDto {
  return {
    id: 14,
    name: "North Ridge Org",
    admin: true,
    max_workspaces: 12,
    pricing_plan_name: "Starter",
    is_multi_workspace_enabled: true,
    user_count: 8,
    ...overrides,
  };
}

export function createWorkspaceFixture(
  overrides?: Partial<WebWorkspaceSettingsDto>,
): WebWorkspaceSettingsDto {
  return {
    id: 202,
    organization_id: 14,
    name: "North Ridge Delivery",
    logo_url: "https://cdn.example.com/logo.png",
    default_currency: "USD",
    default_hourly_rate: 175,
    rounding: 1,
    rounding_minutes: 15,
    reports_collapse: true,
    only_admins_may_create_projects: false,
    only_admins_may_create_tags: true,
    only_admins_see_team_dashboard: false,
    projects_billable_by_default: true,
    projects_private_by_default: false,
    projects_enforce_billable: true,
    limit_public_project_data: false,
    admin: true,
    premium: true,
    role: "admin",
    ...overrides,
  };
}
