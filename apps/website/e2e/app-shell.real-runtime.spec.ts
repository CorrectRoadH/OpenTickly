import { expect, test } from "@playwright/test";

import {
  createTimeEntryForWorkspace,
  loginE2eUser,
  pollSessionBootstrap,
  readSessionBootstrap,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";

test.describe("Story: enter the tracking shell", () => {
  const defaultBadges = (scope: { locator: (selector: string) => any }) =>
    scope.locator("span").filter({ hasText: /^Default$/ });

  test("Given a newly registered account, when the user signs back in, then the time-entry shell loads", async ({
    page,
  }) => {
    const email = `real-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Real Runtime User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await expect(page.getByRole("button", { exact: true, name: "Organization" })).toBeVisible();
    await expect(page.getByTestId("app-shell")).toBeVisible();
    await expect(page.getByTestId("shell-primary-nav")).toContainText("Track");
    await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Timer" })).toBeVisible();
  });

  test("Given the shell organization switcher, when the user creates an organization from the dropdown, then the new organization appears and can be selected", async ({
    page,
  }) => {
    const email = `organization-create-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const organizationName = `Organization ${Date.now()}`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Organization Create User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    const organizationButton = page.getByRole("button", { exact: true, name: "Organization" });
    await organizationButton.click();

    const workspaceListbox = page.getByRole("listbox");
    await expect(workspaceListbox).toBeVisible();

    await page.getByRole("button", { name: "Create organization" }).click();

    const createOrganizationDialog = page.getByRole("dialog", { name: "New organization" });
    await expect(createOrganizationDialog).toBeVisible();
    await createOrganizationDialog.getByLabel("Organization name").fill(organizationName);
    await createOrganizationDialog.getByRole("button", { name: "Create organization" }).click();

    await expect(organizationButton).toContainText(organizationName);

    await organizationButton.click();
    await expect(workspaceListbox.getByRole("button", { name: organizationName })).toBeVisible();
  });

  test("Given the shell organization switcher with multiple organizations, when the user selects another organization from the dropdown, then the current organization and session switch to that organization", async ({
    page,
  }) => {
    const email = `organization-switch-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const secondOrganizationName = `Organization ${Date.now()}`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Organization Switch User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    const initialSession = await readSessionBootstrap(page);
    const initialOrganizationId = initialSession.current_organization_id;
    const initialOrganizationName =
      initialSession.organizations.find((organization) => organization.id === initialOrganizationId)
        ?.name ?? "";

    const organizationButton = page.getByRole("button", { exact: true, name: "Organization" });
    await organizationButton.click();
    await page.getByRole("button", { name: "Create organization" }).click();

    const createOrganizationDialog = page.getByRole("dialog", { name: "New organization" });
    await expect(createOrganizationDialog).toBeVisible();
    await createOrganizationDialog.getByLabel("Organization name").fill(secondOrganizationName);
    await createOrganizationDialog.getByRole("button", { name: "Create organization" }).click();

    await expect(organizationButton).toContainText(secondOrganizationName);

    await organizationButton.click();
    await page.getByRole("button", { name: new RegExp(initialOrganizationName) }).click();

    await expect(organizationButton).toContainText(initialOrganizationName);
    await expect(page.getByRole("link", { name: "Reports" })).toHaveAttribute(
      "href",
      `/workspaces/${initialSession.current_workspace_id}/reports`,
    );

    await expect
      .poll(async () => (await pollSessionBootstrap(page))?.current_organization_id)
      .toBe(initialOrganizationId);

    const switchedSession = await readSessionBootstrap(page);
    expect(
      switchedSession.organizations.find(
        (organization) => organization.id === switchedSession.current_organization_id,
      )?.name,
    ).toBe(initialOrganizationName);
  });

  test("Given a non-default current organization, when the user hovers it in the switcher, then they can set it as the only default organization", async ({
    page,
  }) => {
    const email = `organization-default-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const secondOrganizationName = `Organization ${Date.now()}`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Organization Default User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    const initialSession = await readSessionBootstrap(page);
    expect(initialSession.user.default_workspace_id).toBe(initialSession.current_workspace_id);
    const initialOrganizationName =
      initialSession.organizations.find(
        (organization) => organization.id === initialSession.current_organization_id,
      )?.name ?? "";

    const organizationButton = page.getByRole("button", { exact: true, name: "Organization" });
    await organizationButton.click();
    const workspaceListbox = page.getByRole("listbox");
    await expect(defaultBadges(workspaceListbox)).toHaveCount(1);
    await expect(
      workspaceListbox.locator("li", {
        has: page.getByRole("button", { name: initialOrganizationName }),
      }),
    ).toContainText("Default");
    await expect(
      workspaceListbox.locator("li", {
        has: page.getByRole("button", { name: initialOrganizationName }),
      }),
    ).not.toContainText("Set to default");

    await page.getByRole("button", { name: "Create organization" }).click();

    const createOrganizationDialog = page.getByRole("dialog", { name: "New organization" });
    await expect(createOrganizationDialog).toBeVisible();
    await createOrganizationDialog.getByLabel("Organization name").fill(secondOrganizationName);
    await createOrganizationDialog.getByRole("button", { name: "Create organization" }).click();

    await expect(organizationButton).toContainText(secondOrganizationName);
    await expect
      .poll(async () => (await pollSessionBootstrap(page))?.current_workspace_id)
      .not.toBe(initialSession.current_workspace_id);

    await organizationButton.click();
    await expect(defaultBadges(workspaceListbox)).toHaveCount(1);
    await expect(
      workspaceListbox.getByRole("button", { name: initialOrganizationName }),
    ).toBeVisible();
    await expect(workspaceListbox.locator('[aria-label="Current organization"]')).toHaveCount(1);

    const currentOrganizationRow = workspaceListbox.locator("li", {
      has: page.getByRole("button", { name: secondOrganizationName }),
    });
    await currentOrganizationRow.hover();
    await currentOrganizationRow
      .getByRole("button", { name: `Set to default ${secondOrganizationName}` })
      .click();

    await expect
      .poll(async () => (await pollSessionBootstrap(page))?.user?.default_workspace_id)
      .not.toBe(initialSession.user.default_workspace_id);

    await page.keyboard.press("Escape");
    await organizationButton.click();
    await expect(workspaceListbox).toBeVisible();
    await expect(defaultBadges(workspaceListbox)).toHaveCount(1);
    const updatedSession = await readSessionBootstrap(page);
    expect(updatedSession.user.default_workspace_id).toBe(updatedSession.current_workspace_id);
  });
});

test.describe("VAL-CROSS: Shell entry convergence", () => {
  /**
   * VAL-CROSS-001: Timer is reachable via real shell navigation
   *
   * From an authenticated shell session, the user can navigate to Timer by clicking
   * the visible Timer navigation item. The Timer navigation state becomes active,
   * and the resulting page matches the same timer page family as direct entry.
   */
  test("VAL-CROSS-001: clicking Timer nav item reaches /timer and activates Timer nav state", async ({
    page,
  }) => {
    const email = `cross-shell-nav-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Cross Shell Nav User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    // Start on overview page (after login lands on /timer, navigate away to overview)
    await page.goto(new URL("/overview", page.url()).toString());
    await expect(page).toHaveURL(/\/overview(?:\?.*)?$/);

    // Verify Timer nav link is visible
    const timerNavLink = page.getByRole("link", { name: "Timer" });
    await expect(timerNavLink).toBeVisible();

    // Assert: Timer nav does not have aria-current before clicking (not yet on /timer)
    const hasAriaCurrentBefore = await timerNavLink.getAttribute("aria-current");
    expect(hasAriaCurrentBefore).toBeNull();

    // Click the Timer nav item
    await timerNavLink.click();

    // Assert: URL is /timer
    await expect(page).toHaveURL(/\/timer(?:\?.*)?$/);

    // Assert: Timer page content is visible
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Assert: Calendar is the default view
    await expect(page.getByRole("radio", { name: "Calendar" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    // Assert: Timer nav is now active via stable aria-current attribute
    const hasAriaCurrentAfter = await timerNavLink.getAttribute("aria-current");
    expect(hasAriaCurrentAfter).toBe("page");

    // Assert: No console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.reload();
    await expect(page).toHaveURL(/\/timer(?:\?.*)?$/);
    // After reload, Timer nav should still have aria-current since we're on /timer
    const hasAriaCurrentReload = await timerNavLink.getAttribute("aria-current");
    expect(hasAriaCurrentReload).toBe("page");

    expect(consoleErrors.filter((e) => !e.includes("Download the React DevTools"))).toHaveLength(0);
  });

  /**
   * VAL-CROSS-002: Direct entry and shell entry converge on the same timer state
   *
   * Opening Timer through shell navigation and opening `/timer` directly both produce
   * the same observable timer state under the same session context: default `calendar`
   * view, the same running-or-idle header state, and the same seeded current-workspace-scoped facts.
   */
  test("VAL-CROSS-002: shell-entry and direct-entry produce same timer state under same session", async ({
    browser,
    page,
  }) => {
    const email = `cross-convergence-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    // Register and login on page1, seed data
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Cross Convergence User",
      password,
    });

    // Clear cookies and re-login to ensure proper auth state
    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    // Get workspace ID from the session
    const session = await readSessionBootstrap(page);
    const workspaceId = session.current_workspace_id ?? session.workspaces[0]?.id ?? 0;

    // Create time entries for today that will appear across all views
    const now = new Date();
    const baseYear = now.getUTCFullYear();
    const baseMonth = now.getUTCMonth();
    const baseDate = now.getUTCDate();

    // Create entries that will appear in all views
    for (let entryIndex = 0; entryIndex < 3; entryIndex++) {
      const hour = 8 + entryIndex * 4;
      const start = new Date(Date.UTC(baseYear, baseMonth, baseDate, hour, 0, 0));
      const stop = new Date(Date.UTC(baseYear, baseMonth, baseDate, hour, 45, 0));
      await createTimeEntryForWorkspace(page, {
        description: `Convergence Entry ${entryIndex + 1}`,
        start: start.toISOString(),
        stop: stop.toISOString(),
        workspaceId,
      });
    }

    // Create a running timer
    const runningDescription = "Pre-existing running timer for convergence test";
    await page.evaluate(
      async ({ workspaceId: wid, description }) => {
        const response = await fetch(`/api/v9/workspaces/${wid}/time_entries`, {
          body: JSON.stringify({
            created_with: "playwright-e2e",
            description,
            start: new Date().toISOString(),
            workspace_id: wid,
          }),
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        if (!response.ok) {
          throw new Error(`Failed to start timer: ${response.status}`);
        }
        return response.json();
      },
      { workspaceId, description: runningDescription },
    );

    // Capture storage state from page1's authenticated session
    const storageState = await page.context().storageState();

    // Keep both entry paths under the same session prefs baseline.
    await page.evaluate(() => {
      localStorage.removeItem("opentoggl:user-prefs:timer-view");
    });

    // Create page2 with the same authenticated storage state
    const context2 = await browser.newContext({ storageState });
    const page2 = await context2.newPage();
    await page2.addInitScript(() => {
      window.localStorage.removeItem("opentoggl:user-prefs:timer-view");
    });

    // PAGE 1: Navigate to /timer via shell click (Timer nav link)
    await page.goto(new URL("/overview", page.url()).toString());
    await page.getByRole("link", { name: "Timer" }).click();
    await expect(page).toHaveURL(/\/timer(?:\?.*)?$/);
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Capture state from shell-entry page (calendar view - default)
    const shellEntryCalendarActive = await page
      .getByRole("radio", { name: "Calendar" })
      .getAttribute("aria-checked");
    const shellEntryRunningTimer = await page
      .getByRole("button", { name: "Stop timer" })
      .isVisible();
    const shellEntryElapsed = await page.getByTestId("timer-elapsed").isVisible();

    // PAGE 2: Navigate to /timer directly (use page.url() as base since page2 hasn't navigated yet)
    await page2.goto(new URL("/timer", page.url()).toString());
    await expect(page2).toHaveURL(/\/timer(?:\?.*)?$/);
    await expect(page2.getByTestId("tracking-timer-page")).toBeVisible();

    // Wait for running timer state to load on direct-entry page before capturing
    await expect(page2.getByRole("button", { name: "Stop timer" })).toBeVisible();
    await expect(page2.getByTestId("timer-elapsed")).toBeVisible();

    // Capture state from direct-entry page (calendar view - default)
    const directEntryCalendarActive = await page2
      .getByRole("radio", { name: "Calendar" })
      .getAttribute("aria-checked");
    const directEntryRunningTimer = await page2
      .getByRole("button", { name: "Stop timer" })
      .isVisible();
    const directEntryElapsed = await page2.getByTestId("timer-elapsed").isVisible();

    // Assert: Both pages show the same state (convergence)
    expect(shellEntryCalendarActive).toBe(directEntryCalendarActive);
    expect(shellEntryCalendarActive).toBe("true");

    expect(shellEntryRunningTimer).toBe(directEntryRunningTimer);
    expect(shellEntryRunningTimer).toBe(true);

    expect(shellEntryElapsed).toBe(directEntryElapsed);
    expect(shellEntryElapsed).toBe(true);

    await page.getByRole("radio", { name: "List view" }).click();
    await expect(page.getByRole("radio", { name: "List view" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page2.getByRole("radio", { name: "List view" }).click();
    await expect(page2.getByRole("radio", { name: "List view" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    const expectedDescriptions = [
      "Convergence Entry 1",
      "Convergence Entry 2",
      "Convergence Entry 3",
      runningDescription,
    ];

    for (const description of expectedDescriptions) {
      await expect(
        page.getByRole("button", { name: new RegExp(`Edit ${description}`) }),
      ).toBeVisible({
        timeout: 5000,
      });
      await expect(
        page2.getByRole("button", { name: new RegExp(`Edit ${description}`) }),
      ).toBeVisible({
        timeout: 5000,
      });
    }

    // Assert: No console errors on either page
    const consoleErrorsPage1: string[] = [];
    const consoleErrorsPage2: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrorsPage1.push(msg.text());
      }
    });
    page2.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrorsPage2.push(msg.text());
      }
    });

    // Reload both pages to verify stability
    await page.reload();
    await page2.reload();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await expect(page2.getByTestId("tracking-timer-page")).toBeVisible();

    expect(
      consoleErrorsPage1.filter((e) => !e.includes("Download the React DevTools")),
    ).toHaveLength(0);
    expect(
      consoleErrorsPage2.filter((e) => !e.includes("Download the React DevTools")),
    ).toHaveLength(0);

    await page2.close();
    await context2.close();
  });
});
