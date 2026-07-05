import { expect, test, type Page } from "@playwright/test";

import {
  createProjectForWorkspace,
  createTagForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";

/**
 * Issue #39: typing `@` / `#` in the main timer description box must open a
 * keyboard-navigable project / tag picker (gated by the user's shortcut
 * preferences), instead of being treated as plain description characters.
 */

async function enableShortcutPreferences(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const response = await fetch("/api/v9/me/preferences", {
      body: JSON.stringify({
        keyboard_shortcuts_enabled: true,
        project_shortcut_enabled: true,
        tags_shortcut_enabled: true,
      }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`Update preferences failed with ${response.status}`);
    }
  });
}

async function openTimerPage(page: Page): Promise<void> {
  await page.goto(new URL("/timer", page.url()).toString());
  await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
}

test.describe("Timer composer @ / # shortcuts", () => {
  test("@ opens a keyboard-navigable project picker and assigns the project", async ({ page }) => {
    const email = `composer-shortcut-project-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Shortcut Project User",
      password,
    });
    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    await createProjectForWorkspace(page, { name: "Marketing", workspaceId });
    await createProjectForWorkspace(page, { name: "Mobile App", workspaceId });
    await enableShortcutPreferences(page);

    await openTimerPage(page);

    const description = page.locator("#timer-description");
    await description.click();
    await description.type("@M");

    const menu = page.getByTestId("timer-composer-shortcut-menu");
    await expect(menu).toBeVisible();
    const options = page.getByTestId("timer-composer-shortcut-option");
    await expect(options).toHaveCount(2);

    // First option is highlighted; arrow down moves to the second, Enter selects it.
    await expect(options.first()).toHaveAttribute("data-active", "true");
    await description.press("ArrowDown");
    await expect(options.nth(1)).toHaveAttribute("data-active", "true");
    await description.press("Enter");

    // Menu closes, the trigger token is cleared, and the project is assigned.
    await expect(menu).toBeHidden();
    await expect(description).toHaveValue("");
    await expect(page.getByRole("button", { name: "Add a project: Mobile App" })).toBeVisible();
  });

  test("# opens a tag picker and assigns the chosen tag", async ({ page }) => {
    const email = `composer-shortcut-tag-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Shortcut Tag User",
      password,
    });
    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    await createTagForWorkspace(page, { name: "focus", workspaceId });
    await enableShortcutPreferences(page);

    await openTimerPage(page);

    const description = page.locator("#timer-description");
    await description.click();
    await description.type("#foc");

    const menu = page.getByTestId("timer-composer-shortcut-menu");
    await expect(menu).toBeVisible();
    await expect(menu).toContainText("focus");

    await description.press("Enter");
    await expect(menu).toBeHidden();
    await expect(description).toHaveValue("");
    await expect(page.getByRole("button", { name: "Tags: focus" })).toBeVisible();
  });

  test("# can create a new tag on the spot", async ({ page }) => {
    const email = `composer-shortcut-create-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Shortcut Create User",
      password,
    });
    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });
    await enableShortcutPreferences(page);

    await openTimerPage(page);

    const description = page.locator("#timer-description");
    await description.click();
    await description.type("#deep-work");

    const menu = page.getByTestId("timer-composer-shortcut-menu");
    await expect(menu).toBeVisible();
    await expect(menu).toContainText("deep-work");

    await description.press("Enter");
    await expect(menu).toBeHidden();
    await expect(page.getByRole("button", { name: "Tags: deep-work" })).toBeVisible();
  });

  test("@ typed after an existing description opens the picker and keeps the text", async ({
    page,
  }) => {
    const email = `composer-shortcut-midtext-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Shortcut Midtext User",
      password,
    });
    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    await createProjectForWorkspace(page, { name: "Marketing", workspaceId });
    await createProjectForWorkspace(page, { name: "Mobile App", workspaceId });
    await enableShortcutPreferences(page);

    await openTimerPage(page);

    const description = page.locator("#timer-description");
    await description.click();
    await description.type("fix bug @Mob");

    const menu = page.getByTestId("timer-composer-shortcut-menu");
    await expect(menu).toBeVisible();
    await expect(menu).toContainText("Mobile App");

    await description.press("Enter");

    // Menu closes, only the trigger token is stripped, and the project is assigned.
    await expect(menu).toBeHidden();
    await expect(description).toHaveValue("fix bug");
    await expect(page.getByRole("button", { name: "Add a project: Mobile App" })).toBeVisible();
  });

  test("@ assigns a project to the running entry", async ({ page }) => {
    const email = `composer-shortcut-running-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Shortcut Running User",
      password,
    });
    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    await createProjectForWorkspace(page, { name: "Marketing", workspaceId });
    await createProjectForWorkspace(page, { name: "Mobile App", workspaceId });
    await enableShortcutPreferences(page);

    await openTimerPage(page);

    const description = page.locator("#timer-description");
    await description.click();
    await description.type("deploy");
    await page.getByRole("button", { name: "Start timer" }).click();
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();

    await description.click();
    await description.press("End");
    await description.type(" @Mob");

    const menu = page.getByTestId("timer-composer-shortcut-menu");
    await expect(menu).toBeVisible();
    await expect(menu).toContainText("Mobile App");

    await description.press("Enter");

    // The trigger token is stripped, the description survives, and the
    // running entry gets the project while it keeps running.
    await expect(menu).toBeHidden();
    await expect(description).toHaveValue("deploy");
    await expect(page.getByRole("button", { name: "Add a project: Mobile App" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
  });

  test("triggers stay plain text when shortcut preferences are disabled", async ({ page }) => {
    const email = `composer-shortcut-off-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Shortcut Off User",
      password,
    });
    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    await createProjectForWorkspace(page, {
      name: "Marketing",
      workspaceId: session.currentWorkspaceId,
    });
    // Preferences left at their defaults (shortcuts disabled).

    await openTimerPage(page);

    const description = page.locator("#timer-description");
    await description.click();
    await description.type("@Marketing");

    await expect(page.getByTestId("timer-composer-shortcut-menu")).toBeHidden();
    await expect(description).toHaveValue("@Marketing");
  });
});
