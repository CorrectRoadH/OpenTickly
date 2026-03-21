import { expect, test } from "@playwright/test";

test("logs in and lands in the current workspace shell", async ({ page }) => {
  const sessionPayload = {
    current_organization_id: 14,
    current_workspace_id: 202,
    organizations: [
      {
        id: 14,
        name: "North Ridge Org",
        admin: true,
        pricing_plan_name: "Starter",
      },
    ],
    user: {
      id: 99,
      email: "alex@example.com",
      fullname: "Alex North",
      timezone: "Europe/Tallinn",
      default_workspace_id: 202,
      beginning_of_week: 1,
      has_password: true,
      "2fa_enabled": true,
    },
    workspace_capabilities: null,
    workspace_quota: null,
    workspaces: [
      {
        id: 202,
        organization_id: 14,
        name: "North Ridge Delivery",
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
      },
    ],
  };

  await page.route("**/web/v1/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify(sessionPayload),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.route("**/web/v1/auth/login", async (route) => {
    await route.fulfill({
      body: JSON.stringify(sessionPayload),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.goto("/login");

  await page.getByLabel("Email").fill("alex@example.com");
  await page.getByLabel("Password").fill("secret-pass");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByRole("heading", { name: "Workspace Overview" })).toBeVisible();
  await expect(page.getByLabel("Workspace")).toHaveValue("202");
  await expect(page.getByRole("main").getByText("North Ridge Delivery")).toBeVisible();
});

test("logs out from the shell and returns to login", async ({ page }) => {
  const sessionPayload = {
    current_organization_id: 14,
    current_workspace_id: 202,
    organizations: [
      {
        id: 14,
        name: "North Ridge Org",
        admin: true,
        pricing_plan_name: "Starter",
      },
    ],
    user: {
      id: 99,
      email: "alex@example.com",
      fullname: "Alex North",
      timezone: "Europe/Tallinn",
      default_workspace_id: 202,
      beginning_of_week: 1,
      has_password: true,
      "2fa_enabled": true,
    },
    workspace_capabilities: null,
    workspace_quota: null,
    workspaces: [
      {
        id: 202,
        organization_id: 14,
        name: "North Ridge Delivery",
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
      },
    ],
  };

  let signedOut = false;

  await page.route("**/web/v1/session", async (route) => {
    if (signedOut) {
      await route.fulfill({
        body: JSON.stringify("Session missing."),
        contentType: "application/json",
        status: 401,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify(sessionPayload),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.route("**/web/v1/auth/login", async (route) => {
    await route.fulfill({
      body: JSON.stringify(sessionPayload),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.route("**/web/v1/auth/logout", async (route) => {
    signedOut = true;
    await route.fulfill({
      status: 204,
    });
  });

  await page.goto("/login");

  await page.getByLabel("Email").fill("alex@example.com");
  await page.getByLabel("Password").fill("secret-pass");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByRole("heading", { name: "Workspace Overview" })).toBeVisible();

  const logoutResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/web/v1/auth/logout") && response.request().method() === "POST",
  );

  await page.getByRole("button", { name: "Log out" }).click();

  const logoutResponse = await logoutResponsePromise;
  expect(logoutResponse.status()).toBe(204);

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Log in to OpenToggl" })).toBeVisible();
});
