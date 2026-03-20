import { describe, expect, it } from "vitest";

import {
  createOrganizationSettingsFormValues,
  createWorkspaceSettingsFormValues,
  mapOrganizationSettingsFormToRequest,
  mapWorkspaceSettingsFormToRequest,
} from "../settings-form.ts";

describe("settings form adapters", () => {
  it("creates organization settings defaults and maps them back into the envelope contract", () => {
    const values = createOrganizationSettingsFormValues({
      id: 14,
      name: "North Ridge Org",
      admin: true,
      max_workspaces: 12,
      pricing_plan_name: "Starter",
      is_multi_workspace_enabled: true,
      user_count: 8,
    });

    expect(values).toEqual({
      name: "North Ridge Org",
      maxWorkspaces: 12,
      planName: "Starter",
      isMultiWorkspaceEnabled: true,
      userCount: 8,
    });
    expect(
      mapOrganizationSettingsFormToRequest({
        ...values,
        name: "North Ridge Group",
      }),
    ).toEqual({
      organization: {
        name: "North Ridge Group",
      },
    });
  });

  it("creates workspace settings defaults and maps editable fields into the update envelope", () => {
    const values = createWorkspaceSettingsFormValues({
      id: 202,
      organization_id: 14,
      name: "North Ridge Delivery",
      admin: true,
      default_currency: "USD",
      default_hourly_rate: 175,
      rounding: 1,
      rounding_minutes: 15,
      reports_collapse: true,
      premium: true,
      only_admins_may_create_projects: false,
      only_admins_may_create_tags: true,
      only_admins_see_team_dashboard: false,
      projects_billable_by_default: true,
      projects_private_by_default: false,
      projects_enforce_billable: true,
      limit_public_project_data: false,
      logo_url: "https://cdn.example.com/logo.png",
      role: "admin",
    });

    expect(values).toEqual({
      name: "North Ridge Delivery",
      defaultCurrency: "USD",
      defaultHourlyRate: 175,
      rounding: 1,
      roundingMinutes: 15,
      reportsCollapse: true,
      onlyAdminsMayCreateProjects: false,
      onlyAdminsMayCreateTags: true,
      onlyAdminsSeeTeamDashboard: false,
      projectsBillableByDefault: true,
      projectsPrivateByDefault: false,
      projectsEnforceBillable: true,
      limitPublicProjectData: false,
      logoUrl: "https://cdn.example.com/logo.png",
    });
    expect(
      mapWorkspaceSettingsFormToRequest({
        ...values,
        defaultCurrency: "EUR",
        roundingMinutes: 5,
      }),
    ).toEqual({
      workspace: {
        name: "North Ridge Delivery",
        default_currency: "EUR",
        default_hourly_rate: 175,
        rounding: 1,
        rounding_minutes: 5,
        reports_collapse: true,
        only_admins_may_create_projects: false,
        only_admins_may_create_tags: true,
        only_admins_see_team_dashboard: false,
        projects_billable_by_default: true,
        projects_private_by_default: false,
        projects_enforce_billable: true,
        limit_public_project_data: false,
      },
    });
  });
});
