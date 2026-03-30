import { expect, test } from "@playwright/test";

import {
  createProjectForWorkspace,
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";
import { selectDropdownOption } from "./fixtures/e2e-select.ts";

test.describe("Story: manage goals end-to-end", () => {
  test("Given a new user, when they create a goal with name and hours, then it appears in the goals list", async ({
    page,
  }) => {
    const email = `goal-basic-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Goal Basic User",
      password,
    });
    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await page.getByRole("link", { name: "Goals" }).click();
    await expect(page.getByTestId("goals-page")).toBeVisible();

    // Empty state should show
    await expect(page.getByTestId("goals-empty-state")).toBeVisible();

    // Open create dialog
    await page.getByTestId("goals-create-button").click();
    const dialog = page.getByTestId("goal-editor-dialog");
    await expect(dialog).toBeVisible();

    // Fill in goal
    await dialog.getByTestId("goal-name-input").fill("Daily coding");
    await dialog.getByTestId("goal-hours-input").fill("3");

    // Submit
    await dialog.getByTestId("goal-submit-button").click();
    await expect(dialog).not.toBeVisible();

    // Goal appears in list
    const goalsList = page.getByTestId("goals-list");
    await expect(goalsList).toBeVisible();
    const row = goalsList.getByTestId("goal-row").filter({ hasText: "Daily coding" });
    await expect(row).toBeVisible();
    await expect(row).toContainText("at least");
    await expect(row).toContainText("3 hours");
    await expect(row).toContainText("every day");
    await expect(row).toContainText("No end date");
  });

  test("Given the create dialog, when the user picks weekday recurrence with at-least comparison, then the goal list shows 'at least X hours weekdays'", async ({
    page,
  }) => {
    const email = `goal-weekday-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Goal Weekday User",
      password,
    });
    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await page.getByRole("link", { name: "Goals" }).click();
    await expect(page.getByTestId("goals-page")).toBeVisible();

    await page.getByTestId("goals-create-button").click();
    const dialog = page.getByTestId("goal-editor-dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByTestId("goal-name-input").fill("Focus work");
    await dialog.getByTestId("goal-hours-input").fill("4");
    await selectDropdownOption(page, "goal-recurrence-select", "Weekdays");

    await dialog.getByTestId("goal-submit-button").click();
    await expect(dialog).not.toBeVisible();

    const row = page.getByTestId("goal-row").filter({ hasText: "Focus work" });
    await expect(row).toBeVisible();
    await expect(row).toContainText("at least");
    await expect(row).toContainText("4 hours");
    await expect(row).toContainText("weekdays");
  });

  test("Given a workspace with a project, when the user creates a goal tracking that project and logs time against it, then the goal progress reflects the tracked hours", async ({
    page,
  }) => {
    const email = `goal-track-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Goal Track User",
      password,
    });
    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    // Seed a project via API
    const projectId = await createProjectForWorkspace(page, { name: "Backend API", workspaceId });

    // Log 1.5 hours against that project today
    const now = new Date();
    const stop = now.toISOString();
    const start = new Date(now.getTime() - 1.5 * 3600 * 1000).toISOString();
    await createTimeEntryForWorkspace(page, {
      description: "Implement endpoints",
      projectId,
      start,
      stop,
      workspaceId,
    });

    await page.getByRole("link", { name: "Goals" }).click();
    await expect(page.getByTestId("goals-page")).toBeVisible();

    // Open create dialog
    await page.getByTestId("goals-create-button").click();
    const dialog = page.getByTestId("goal-editor-dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByTestId("goal-name-input").fill("Ship features");
    await dialog.getByTestId("goal-hours-input").fill("2");

    // Open track picker and select the project
    await dialog.getByTestId("goal-track-button").click();
    await dialog.getByRole("button", { name: /Select project/ }).click();
    await dialog.getByRole("button", { name: "Backend API" }).click();

    // Close the track picker by clicking the goal name input (outside the picker)
    await dialog.getByTestId("goal-name-input").click();

    // Submit
    await dialog.getByTestId("goal-submit-button").click();
    await expect(dialog).not.toBeVisible();

    // Goal should be in the list
    const goalsList = page.getByTestId("goals-list");
    await expect(goalsList).toBeVisible();
    const row = goalsList.getByTestId("goal-row").filter({ hasText: "Ship features" });
    await expect(row).toBeVisible();
    await expect(row).toContainText("2 hours");

    // Verify the goal was persisted with the project filter via API
    const goals = await page.evaluate(async (wsId) => {
      const resp = await fetch(`/api/v9/workspaces/${wsId}/goals?active=true`, {
        credentials: "include",
      });
      return resp.json();
    }, workspaceId);
    const createdGoal = goals.find((g: { name?: string }) => g.name === "Ship features");
    expect(createdGoal).toBeDefined();
    expect(createdGoal.project_ids).toContain(projectId);
  });

  test("Given the create dialog, when the user sets weekly recurrence and less-than comparison with an end date, then the goal list shows those settings", async ({
    page,
  }) => {
    const email = `goal-options-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Goal Options User",
      password,
    });
    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await page.getByRole("link", { name: "Goals" }).click();
    await expect(page.getByTestId("goals-page")).toBeVisible();

    await page.getByTestId("goals-create-button").click();
    const dialog = page.getByTestId("goal-editor-dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByTestId("goal-name-input").fill("Limit meetings");
    await dialog.getByTestId("goal-hours-input").fill("5");

    // Set comparison to "less than"
    await selectDropdownOption(page, "goal-comparison-select", "less than");

    // Set recurrence to "every week"
    await selectDropdownOption(page, "goal-recurrence-select", "every week");

    // Uncheck "No end date" and pick a date
    await dialog.getByText("No end date").click();
    const datePickerButton = dialog.getByTestId("goal-end-date-input");
    await datePickerButton.click();
    const calendarPanel = page.getByTestId("calendar-panel");
    await expect(calendarPanel).toBeVisible();
    await calendarPanel.getByRole("button", { name: "Next month" }).click();
    await calendarPanel.getByRole("button", { name: /April 30/ }).click();
    await expect(calendarPanel).not.toBeVisible();

    await dialog.getByTestId("goal-submit-button").click();
    await expect(dialog).not.toBeVisible();

    const row = page.getByTestId("goal-row").filter({ hasText: "Limit meetings" });
    await expect(row).toBeVisible();
    await expect(row).toContainText("less than");
    await expect(row).toContainText("5 hours");
    await expect(row).toContainText("every week");
    await expect(row).toContainText("2026-04-30");
  });

  test("Given an existing goal, when the user edits its name and target hours, then the list reflects the changes", async ({
    page,
  }) => {
    const email = `goal-edit-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Goal Edit User",
      password,
    });
    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    // Create a goal first
    await page.getByRole("link", { name: "Goals" }).click();
    await expect(page.getByTestId("goals-page")).toBeVisible();

    await page.getByTestId("goals-create-button").click();
    const createDialog = page.getByTestId("goal-editor-dialog");
    await createDialog.getByTestId("goal-name-input").fill("Read books");
    await createDialog.getByTestId("goal-hours-input").fill("1");
    await createDialog.getByTestId("goal-submit-button").click();
    await expect(createDialog).not.toBeVisible();

    // Open edit via actions menu
    const row = page.getByTestId("goal-row").filter({ hasText: "Read books" });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: /actions/i }).click();
    await page.getByRole("menuitem", { name: "Edit goal" }).click();

    const editDialog = page.getByTestId("goal-editor-dialog");
    await expect(editDialog).toBeVisible();

    // Change name and hours
    await editDialog.getByTestId("goal-name-input").fill("Read more books");
    await editDialog.getByTestId("goal-hours-input").fill("2");
    await editDialog.getByTestId("goal-submit-button").click();
    await expect(editDialog).not.toBeVisible();

    // Verify updated values
    const updatedRow = page.getByTestId("goal-row").filter({ hasText: "Read more books" });
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow).toContainText("2 hours");
  });

  test("Given an active goal, when the user archives it and switches to the archived filter, then it appears there; restoring it moves it back to active", async ({
    page,
  }) => {
    const email = `goal-archive-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Goal Archive User",
      password,
    });
    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await page.getByRole("link", { name: "Goals" }).click();
    await expect(page.getByTestId("goals-page")).toBeVisible();

    // Create a goal
    await page.getByTestId("goals-create-button").click();
    const dialog = page.getByTestId("goal-editor-dialog");
    await dialog.getByTestId("goal-name-input").fill("Morning run");
    await dialog.getByTestId("goal-hours-input").fill("1");
    await dialog.getByTestId("goal-submit-button").click();
    await expect(dialog).not.toBeVisible();

    const row = page.getByTestId("goal-row").filter({ hasText: "Morning run" });
    await expect(row).toBeVisible();

    // Archive via actions menu
    await row.getByRole("button", { name: /actions/i }).click();
    await page.getByRole("menuitem", { name: "Archive" }).click();

    // Goal should disappear from active list
    await expect(row).not.toBeVisible();

    // Switch to archived filter
    await selectDropdownOption(page, "goals-status-filter", "Archived goals");

    // Goal should appear in archived list
    const archivedRow = page.getByTestId("goal-row").filter({ hasText: "Morning run" });
    await expect(archivedRow).toBeVisible();

    // Restore via actions menu
    await archivedRow.getByRole("button", { name: /actions/i }).click();
    await page.getByRole("menuitem", { name: "Restore" }).click();
    await expect(archivedRow).not.toBeVisible();

    // Switch back to active and verify it's back
    await selectDropdownOption(page, "goals-status-filter", "Active goals");
    await expect(page.getByTestId("goal-row").filter({ hasText: "Morning run" })).toBeVisible();
  });

  test("Given an existing goal, when the user deletes it, then it disappears from the list", async ({
    page,
  }) => {
    const email = `goal-delete-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Goal Delete User",
      password,
    });
    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await page.getByRole("link", { name: "Goals" }).click();
    await expect(page.getByTestId("goals-page")).toBeVisible();

    // Create a goal
    await page.getByTestId("goals-create-button").click();
    const dialog = page.getByTestId("goal-editor-dialog");
    await dialog.getByTestId("goal-name-input").fill("Temp goal");
    await dialog.getByTestId("goal-hours-input").fill("1");
    await dialog.getByTestId("goal-submit-button").click();
    await expect(dialog).not.toBeVisible();

    const row = page.getByTestId("goal-row").filter({ hasText: "Temp goal" });
    await expect(row).toBeVisible();

    // Delete via actions menu — confirm the browser dialog
    page.on("dialog", (d) => void d.accept());
    await row.getByRole("button", { name: /actions/i }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();

    // Goal should be gone
    await expect(row).not.toBeVisible();
    await expect(page.getByTestId("goals-empty-state")).toBeVisible();
  });
});
