import { expect, test } from "@playwright/test";

const sourceRefs = {
  profile: {
    figmaNode: "10:14814",
    prd: "docs/product/identity-and-tenant.md",
  },
  settings: {
    figmaNode: "11:3680",
    prd: "docs/product/identity-and-tenant.md",
  },
  shell: {
    figmaNode: "8:2829",
    prd: "docs/product/tracking.md",
  },
} as const;

const sessionPayload = {
  current_organization_id: 14,
  current_workspace_id: 202,
  organizations: [
    {
      admin: true,
      id: 14,
      name: "North Ridge Org",
      pricing_plan_name: "Starter",
    },
  ],
  user: {
    "2fa_enabled": true,
    beginning_of_week: 1,
    default_workspace_id: 202,
    email: "alex@example.com",
    fullname: "Alex North",
    has_password: true,
    id: 99,
    timezone: "Europe/Tallinn",
  },
  workspace_capabilities: null,
  workspace_quota: null,
  workspaces: [
    {
      admin: true,
      default_currency: "USD",
      default_hourly_rate: 175,
      id: 202,
      limit_public_project_data: false,
      name: "North Ridge Delivery",
      only_admins_may_create_projects: false,
      only_admins_may_create_tags: true,
      only_admins_see_team_dashboard: false,
      organization_id: 14,
      premium: true,
      projects_billable_by_default: true,
      projects_enforce_billable: true,
      projects_private_by_default: false,
      reports_collapse: true,
      role: "admin",
      rounding: 1,
      rounding_minutes: 15,
    },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.route("**/web/v1/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify(sessionPayload),
      contentType: "application/json",
      status: 200,
    });
  });
});

test("shell parity baseline evidence", async ({ page }, testInfo) => {
  await page.goto("/workspaces/202");

  await expect(page.getByRole("heading", { name: "Workspace Overview" })).toBeVisible();
  await expect(page.getByTestId("shell-hero")).toContainText("Workspace access");

  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("shell-overview.png"),
  });

  testInfo.annotations.push({
    description: `PRD=${sourceRefs.shell.prd}; FIGMA_NODE=${sourceRefs.shell.figmaNode}`,
    type: "source",
  });
});

test("profile parity baseline evidence", async ({ page }, testInfo) => {
  await page.route("**/web/v1/profile", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        api_token: "api-token-99",
        beginning_of_week: 1,
        country_id: 70,
        default_workspace_id: 202,
        email: "alex@example.com",
        fullname: "Alex North",
        id: 99,
        timezone: "Europe/Tallinn",
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/web/v1/preferences", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        beginning_of_week: 1,
        date_format: "YYYY-MM-DD",
        duration_format: "improved",
        record_timeline: true,
        reports_collapse: true,
      }),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.goto("/profile");

  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Account details" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "API token" })).toBeVisible();

  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("profile.png"),
  });

  testInfo.annotations.push({
    description: `PRD=${sourceRefs.profile.prd}; FIGMA_NODE=${sourceRefs.profile.figmaNode}`,
    type: "source",
  });
});

test("settings parity baseline evidence", async ({ page }, testInfo) => {
  await page.route("**/web/v1/workspaces/202/settings", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        capabilities: null,
        organization: {
          id: 14,
          name: "North Ridge Org",
        },
        workspace: {
          default_currency: "USD",
          default_hourly_rate: 175,
          id: 202,
          logo_url: null,
          name: "North Ridge Delivery",
          only_admins_may_create_projects: false,
          only_admins_may_create_tags: true,
          only_admins_see_team_dashboard: false,
          organization_id: 14,
          reports_collapse: true,
          rounding: 1,
          rounding_minutes: 15,
        },
      }),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.goto("/workspaces/202/settings?section=branding");

  await expect(page.getByRole("heading", { name: "Workspace settings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Branding assets" })).toBeVisible();

  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("settings-branding.png"),
  });

  testInfo.annotations.push({
    description: `PRD=${sourceRefs.settings.prd}; FIGMA_NODE=${sourceRefs.settings.figmaNode}`,
    type: "source",
  });
});
