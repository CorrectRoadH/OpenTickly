import { describe, expect, it } from "vitest";

import { mapSessionBootstrap } from "../session-bootstrap.ts";

describe("mapSessionBootstrap", () => {
  it("maps the bootstrap payload into a shell view model and prefers the requested workspace", () => {
    const result = mapSessionBootstrap(
      {
        current_organization_id: 14,
        current_workspace_id: 202,
        organization_subscription: {
          plan_name: "Starter",
          state: "active",
        },
        organizations: [
          {
            id: 14,
            name: "North Ridge Org",
            admin: true,
            max_workspaces: 12,
            pricing_plan_name: "Starter",
            is_multi_workspace_enabled: true,
            user_count: 8,
          },
        ],
        user: {
          id: 99,
          email: "alex@example.com",
          fullname: "Alex North",
          api_token: "api-token-99",
          image_url: "https://cdn.example.com/alex.png",
          timezone: "Europe/Tallinn",
          default_workspace_id: 202,
          beginning_of_week: 1,
          country_id: 70,
          has_password: true,
          "2fa_enabled": true,
        },
        workspace_capabilities: {
          context: {
            scope: "workspace",
            organization_id: 14,
            workspace_id: 303,
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
          remaining: 12,
          resets_in_secs: 600,
          total: 100,
        },
        workspace_subscription: {
          plan_name: "Starter",
          state: "active",
        },
        workspaces: [
          {
            id: 202,
            organization_id: 14,
            name: "North Ridge Delivery",
            logo_url: "https://cdn.example.com/delivery.png",
            default_currency: "USD",
            default_hourly_rate: 175,
            rounding: 1,
            rounding_minutes: 15,
            reports_collapse: true,
            only_admins_may_create_projects: false,
            only_admins_may_create_tags: false,
            only_admins_see_team_dashboard: false,
            projects_billable_by_default: true,
            projects_private_by_default: false,
            projects_enforce_billable: true,
            limit_public_project_data: false,
            admin: true,
            premium: true,
            role: "admin",
          },
          {
            id: 303,
            organization_id: 14,
            name: "North Ridge Studio",
            logo_url: "https://cdn.example.com/studio.png",
            default_currency: "EUR",
            default_hourly_rate: 200,
            rounding: 0,
            rounding_minutes: 5,
            reports_collapse: false,
            only_admins_may_create_projects: true,
            only_admins_may_create_tags: true,
            only_admins_see_team_dashboard: true,
            projects_billable_by_default: false,
            projects_private_by_default: true,
            projects_enforce_billable: false,
            limit_public_project_data: true,
            admin: false,
            premium: true,
            role: "member",
          },
        ],
      },
      {
        requestedWorkspaceId: 303,
      },
    );

    expect(result.user).toEqual({
      id: 99,
      email: "alex@example.com",
      fullName: "Alex North",
      imageUrl: "https://cdn.example.com/alex.png",
      timezone: "Europe/Tallinn",
      defaultWorkspaceId: 202,
      beginningOfWeek: 1,
      hasPassword: true,
      twoFactorEnabled: true,
    });
    expect(result.currentOrganization).toMatchObject({
      id: 14,
      name: "North Ridge Org",
      planName: "Starter",
      isAdmin: true,
    });
    expect(result.currentWorkspace).toMatchObject({
      id: 303,
      name: "North Ridge Studio",
      organizationId: 14,
      defaultCurrency: "EUR",
      logoUrl: "https://cdn.example.com/studio.png",
      isAdmin: false,
      role: "member",
    });
    expect(result.availableWorkspaces).toEqual([
      {
        id: 202,
        name: "North Ridge Delivery",
        organizationId: 14,
        isCurrent: false,
      },
      {
        id: 303,
        name: "North Ridge Studio",
        organizationId: 14,
        isCurrent: true,
      },
    ]);
    expect(result.workspaceCapabilities?.capabilities).toHaveLength(1);
    expect(result.workspaceQuota?.remaining).toBe(12);
  });

  it("falls back to the bootstrapped current workspace when the requested workspace is missing", () => {
    const result = mapSessionBootstrap({
      current_organization_id: 14,
      current_workspace_id: 202,
      organization_subscription: {
        plan_name: "Starter",
        state: "active",
      },
      workspace_subscription: {
        plan_name: "Starter",
        state: "active",
      },
      organizations: [],
      user: {
        id: 99,
        email: "alex@example.com",
        fullname: "Alex North",
        api_token: "api-token-99",
        timezone: "UTC",
        default_workspace_id: 202,
        beginning_of_week: 1,
        country_id: 70,
        has_password: true,
        "2fa_enabled": false,
      },
      workspace_capabilities: {
        context: {
          scope: "workspace",
          organization_id: 14,
          workspace_id: 202,
        },
        capabilities: [],
      },
      workspace_quota: {
        organization_id: 14,
        remaining: 0,
        resets_in_secs: 60,
        total: 100,
      },
      workspaces: [
        {
          id: 202,
          organization_id: 14,
          name: "North Ridge Delivery",
          default_currency: "USD",
          default_hourly_rate: 0,
          rounding: 0,
          rounding_minutes: 0,
          reports_collapse: false,
          only_admins_may_create_projects: false,
          only_admins_may_create_tags: false,
          only_admins_see_team_dashboard: false,
          projects_billable_by_default: false,
          projects_private_by_default: false,
          projects_enforce_billable: false,
          limit_public_project_data: false,
          admin: true,
          premium: false,
          role: "admin",
        },
      ],
    });

    expect(result.currentWorkspace.id).toBe(202);
    expect(result.availableWorkspaces[0]?.isCurrent).toBe(true);
  });
});
