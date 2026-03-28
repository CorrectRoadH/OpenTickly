import { expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

test.describe("Story: create and edit a goal with CalendarPanel date picker", () => {
  test("Given the goals page, when the user creates a goal with a specific end date via CalendarPanel, then the goal appears in the list with that end date", async ({
    page,
  }) => {
    const email = `goal-date-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Goal Date User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    // Navigate to goals page
    await page.getByRole("link", { name: "Goals" }).click();
    await expect(page.getByTestId("goals-page")).toBeVisible();

    // Click "New goal" to open the editor
    await page.getByTestId("goals-create-button").click();
    const dialog = page.getByTestId("goal-editor-dialog");
    await expect(dialog).toBeVisible();

    // Fill in goal name
    await dialog.getByTestId("goal-name-input").fill("Ship v2");

    // Set target hours
    await dialog.getByTestId("goal-hours-input").fill("4");

    // Uncheck "No end date" to reveal the date picker
    await dialog.getByText("No end date").click();

    // Click the date picker button to open CalendarPanel
    const datePickerButton = dialog.getByTestId("goal-end-date-input");
    await datePickerButton.click();

    // CalendarPanel should appear
    const calendarPanel = page.getByTestId("calendar-panel");
    await expect(calendarPanel).toBeVisible();

    // Navigate to next month (April 2026) and pick April 15
    await calendarPanel.getByRole("button", { name: "Next month" }).click();
    await expect(calendarPanel).toContainText("April 2026");
    await calendarPanel.getByRole("button", { name: "April 15, 2026" }).click();

    // CalendarPanel should close
    await expect(calendarPanel).not.toBeVisible();

    // Date picker button should show the selected date
    await expect(datePickerButton).toContainText("Apr 15, 2026");

    // Submit the goal
    await dialog.getByTestId("goal-submit-button").click();
    await expect(dialog).not.toBeVisible();

    // Goal should appear in the goals list
    const goalsList = page.getByTestId("goals-list");
    await expect(goalsList).toBeVisible();
    await expect(goalsList.getByTestId("goal-row")).toContainText("Ship v2");
    await expect(goalsList.getByTestId("goal-row")).toContainText("2026-04-15");
  });

  test("Given an existing goal with an end date, when the user edits it and changes the end date via CalendarPanel, then the goal list reflects the new date", async ({
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

    // Navigate to goals page
    await page.getByRole("link", { name: "Goals" }).click();
    await expect(page.getByTestId("goals-page")).toBeVisible();

    // Create a goal first
    await page.getByTestId("goals-create-button").click();
    const createDialog = page.getByTestId("goal-editor-dialog");
    await expect(createDialog).toBeVisible();

    await createDialog.getByTestId("goal-name-input").fill("Daily standup prep");
    await createDialog.getByTestId("goal-hours-input").fill("1");
    await createDialog.getByText("No end date").click();

    // Pick end date: use whatever date is shown (just click a visible day)
    const createDatePicker = createDialog.getByTestId("goal-end-date-input");
    await createDatePicker.click();
    let calendarPanel = page.getByTestId("calendar-panel");
    await expect(calendarPanel).toBeVisible();
    await calendarPanel.getByRole("button", { name: "March 30, 2026" }).click();
    await expect(calendarPanel).not.toBeVisible();

    await createDialog.getByTestId("goal-submit-button").click();
    await expect(createDialog).not.toBeVisible();

    // Goal should be in the list
    const goalRow = page.getByTestId("goal-row").filter({ hasText: "Daily standup prep" });
    await expect(goalRow).toBeVisible();

    // Open the actions menu and click Edit goal
    await goalRow.getByRole("button", { name: /actions/i }).click();
    await page.getByRole("menuitem", { name: "Edit goal" }).click();

    const editDialog = page.getByTestId("goal-editor-dialog");
    await expect(editDialog).toBeVisible();

    // If "No end date" is checked, uncheck it to reveal the date picker
    const noEndDateLabel = editDialog.getByText("No end date");
    const noEndDateCheckbox = editDialog.getByTestId("goal-no-end-date-checkbox");
    if (await noEndDateCheckbox.isChecked()) {
      await noEndDateLabel.click();
    }

    const editDatePicker = editDialog.getByTestId("goal-end-date-input");
    await editDatePicker.click();
    calendarPanel = page.getByTestId("calendar-panel");
    await expect(calendarPanel).toBeVisible();

    // Navigate to May 2026 and pick May 1
    await calendarPanel.getByRole("button", { name: "Next month" }).click();
    await calendarPanel.getByRole("button", { name: "Next month" }).click();
    await expect(calendarPanel).toContainText("May 2026");
    await calendarPanel.getByRole("button", { name: "May 1, 2026" }).click();
    await expect(calendarPanel).not.toBeVisible();

    // Save
    await editDialog.getByTestId("goal-submit-button").click();
    await expect(editDialog).not.toBeVisible();

    // Verify updated end date in the goals list
    await expect(goalRow).toContainText("2026-05-01");
  });
});
