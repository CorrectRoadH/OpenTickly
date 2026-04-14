import { expect, test } from "@playwright/test";

import {
  createProjectForWorkspace,
  createTaskForProject,
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";

/**
 * Functional regressions for the list-row inline controls:
 *
 * 1. Inline project picker on a time entry that starts with NO project must
 *    reflect the newly picked project in the row immediately. Before the fix,
 *    the row button stayed stuck on "Add a project" after selection because
 *    the optimistic patch only updated `project_id` while the button branched
 *    on `project_name`, so the UI only settled after a full server round-trip
 *    — and stayed broken if the denormalized field was missing.
 *
 * 2. "Pin as favorite" in the row's more-actions menu must actually create a
 *    favorite. `ConnectedListView` previously wired `onFavoriteEntry` to a
 *    `noopFavorite = () => {}`, so the menu item was silent.
 */
test.describe("List row inline actions", () => {
  test("picking a project from empty state updates the list row", async ({ page }) => {
    const email = `list-row-proj-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "List Row Project User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    const projectName = `AI聊天游戏-${Date.now()}`;
    await createProjectForWorkspace(page, {
      name: projectName,
      workspaceId: session.currentWorkspaceId,
    });

    const description = `empty-project-entry-${Date.now()}`;
    const now = new Date();
    const startUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 0, 0),
    );
    const stopUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 11, 0, 0),
    );
    const entryId = await createTimeEntryForWorkspace(page, {
      description,
      start: startUtc.toISOString(),
      stop: stopUtc.toISOString(),
      workspaceId: session.currentWorkspaceId,
    });

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await page.getByRole("radio", { name: "List" }).click();
    await expect(page.getByTestId("timer-list-view")).toBeVisible();

    const row = page.locator(`[data-testid="time-entry-list-row"][data-entry-id="${entryId}"]`);
    await expect(row).toBeVisible();

    // Empty-state button exposes the `Add a project` aria label.
    const addProjectButton = row.getByRole("button", { name: "Add a project" });
    await expect(addProjectButton).toBeVisible();
    await addProjectButton.click();

    const picker = page.getByTestId("bulk-edit-project-picker");
    await expect(picker).toBeVisible();
    await picker.getByText(projectName, { exact: true }).click();

    // After selection the row must flip to the "has project" branch —
    // identified by the `Change project for <description>` aria label —
    // AND the project name pill must be rendered inside that button.
    const changeProjectButton = row.getByRole("button", {
      name: `Change project for ${description}`,
    });
    await expect(changeProjectButton).toBeVisible();
    await expect(changeProjectButton).toContainText(projectName);

    // The `Add a project` empty-state button must no longer be present.
    await expect(row.getByRole("button", { name: "Add a project" })).toHaveCount(0);
  });

  test("list row project picker search input accepts focus and filters clickable results", async ({
    page,
  }) => {
    const email = `list-row-search-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "List Row Search User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    // Create two projects so the search filter is observable.
    const uniqueToken = `zzsrch${test.info().workerIndex}${Date.now()}`;
    const targetProjectName = `${uniqueToken}-target`;
    await createProjectForWorkspace(page, {
      name: targetProjectName,
      workspaceId: session.currentWorkspaceId,
    });
    await createProjectForWorkspace(page, {
      name: `other-${Date.now()}`,
      workspaceId: session.currentWorkspaceId,
    });

    const description = `search-picker-entry-${Date.now()}`;
    const now = new Date();
    const startUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8, 0, 0),
    );
    const stopUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0),
    );
    const entryId = await createTimeEntryForWorkspace(page, {
      description,
      start: startUtc.toISOString(),
      stop: stopUtc.toISOString(),
      workspaceId: session.currentWorkspaceId,
    });

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await page.getByRole("radio", { name: "List" }).click();
    await expect(page.getByTestId("timer-list-view")).toBeVisible();

    const row = page.locator(`[data-testid="time-entry-list-row"][data-entry-id="${entryId}"]`);
    await row.getByRole("button", { name: "Add a project" }).click();

    const picker = page.getByTestId("bulk-edit-project-picker");
    await expect(picker).toBeVisible();

    // Clicking the search input must focus it — previously a blanket
    // `onMouseDown preventDefault` on the dropdown wrapper blocked focus,
    // so users couldn't type into the search field at all.
    const searchInput = picker.getByPlaceholder("Search by project, task or client");
    await searchInput.click();
    await expect(searchInput).toBeFocused();

    // Typing via the keyboard (not programmatic `.fill()`) must reach the
    // focused input and filter the list.
    await page.keyboard.type(uniqueToken);
    await expect(searchInput).toHaveValue(uniqueToken);

    // Filtered target project is shown and clickable; selecting it closes
    // the picker and flips the row to the "has project" branch.
    await picker.getByText(targetProjectName, { exact: true }).click();
    await expect(
      row.getByRole("button", { name: `Change project for ${description}` }),
    ).toContainText(targetProjectName);
  });

  test("list row project picker search can select a task and assigns it to the entry", async ({
    page,
  }) => {
    const email = `list-row-task-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "List Row Task User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    const projectName = `task-host-${Date.now()}`;
    const projectId = await createProjectForWorkspace(page, {
      name: projectName,
      workspaceId: session.currentWorkspaceId,
    });

    // Task name uses a unique token so the search filter lands on exactly
    // one result in the flat task list inside the picker.
    const taskToken = `zztask${test.info().workerIndex}${Date.now()}`;
    const taskName = `${taskToken}-subtask`;
    const taskId = await createTaskForProject(page, {
      name: taskName,
      projectId,
      workspaceId: session.currentWorkspaceId,
    });

    const description = `task-select-entry-${Date.now()}`;
    const now = new Date();
    const startUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 7, 0, 0),
    );
    const stopUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8, 0, 0),
    );
    const entryId = await createTimeEntryForWorkspace(page, {
      description,
      start: startUtc.toISOString(),
      stop: stopUtc.toISOString(),
      workspaceId: session.currentWorkspaceId,
    });

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await page.getByRole("radio", { name: "List" }).click();
    await expect(page.getByTestId("timer-list-view")).toBeVisible();

    const row = page.locator(`[data-testid="time-entry-list-row"][data-entry-id="${entryId}"]`);
    await row.getByRole("button", { name: "Add a project" }).click();

    const picker = page.getByTestId("bulk-edit-project-picker");
    await expect(picker).toBeVisible();

    // Search by the task token — the picker is supposed to expose a flat
    // task-search branch (same `ProjectPickerDropdown` the editor uses).
    // Before the fix, `ListRowProjectPicker` never passed `tasks` or
    // `onTaskSelect`, so the search hid all task results and the user
    // could never pick a task from the list view.
    const searchInput = picker.getByPlaceholder("Search by project, task or client");
    await searchInput.click();
    await page.keyboard.type(taskToken);

    // Flat task button renders as `${projectName} | ${taskName}`.
    const taskButton = picker.getByRole("button", {
      name: new RegExp(`${projectName}\\s*\\|\\s*${taskName}`),
    });
    await expect(taskButton).toBeVisible();
    await taskButton.click();

    // Row flips to the "has project" branch (task selection implies the
    // project is selected too).
    await expect(
      row.getByRole("button", { name: `Change project for ${description}` }),
    ).toContainText(projectName);

    // Source of truth: the persisted time entry carries both project_id
    // AND task_id. Poll the /me/time_entries list until the update lands.
    await expect
      .poll(
        async () => {
          return page.evaluate(async (id) => {
            const response = await fetch(`/api/v9/me/time_entries`, {
              credentials: "include",
            });
            if (!response.ok) return null;
            const payload = (await response.json()) as {
              id?: number;
              project_id?: number | null;
              task_id?: number | null;
            }[];
            const match = payload.find((e) => e.id === id);
            if (!match) return null;
            return {
              projectId: match.project_id ?? null,
              taskId: match.task_id ?? null,
            };
          }, entryId);
        },
        { timeout: 10_000 },
      )
      .toEqual({ projectId, taskId });
  });

  test("pinning an entry as favorite from the list row more-actions menu creates a favorite", async ({
    page,
  }) => {
    const email = `list-row-fav-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "List Row Favorite User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    const description = `list-row-fav-${Date.now()}`;
    const now = new Date();
    const startUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0),
    );
    const stopUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 0, 0),
    );
    const entryId = await createTimeEntryForWorkspace(page, {
      description,
      start: startUtc.toISOString(),
      stop: stopUtc.toISOString(),
      workspaceId: session.currentWorkspaceId,
    });

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await page.getByRole("radio", { name: "List" }).click();
    await expect(page.getByTestId("timer-list-view")).toBeVisible();

    const row = page.locator(`[data-testid="time-entry-list-row"][data-entry-id="${entryId}"]`);
    await expect(row).toBeVisible();

    // More-actions trigger is hidden until hover (`group-hover:opacity-100`).
    // Force the click rather than waiting for a hover gesture — we only need
    // the onClick handler to fire.
    const moreActionsButton = row.getByRole("button", {
      name: `More actions for ${description}`,
    });
    await moreActionsButton.click({ force: true });

    await page.getByRole("menuitem", { name: "Pin as favorite" }).click();

    await expect
      .poll(
        async () => {
          const favs = await page.evaluate(async (wid) => {
            const response = await fetch(`/api/v9/workspaces/${wid}/favorites`, {
              credentials: "include",
            });
            if (!response.ok) return [];
            return response.json();
          }, session.currentWorkspaceId);
          return (favs as { description?: string }[]).some((f) => f.description === description);
        },
        { timeout: 10_000 },
      )
      .toBe(true);
  });
});
