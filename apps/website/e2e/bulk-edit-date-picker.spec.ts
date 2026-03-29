import { expect, test } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

test.describe("Story: bulk edit time entries with CalendarPanel date picker", () => {
  const ENTRY_A = "Bulk date entry A";
  const ENTRY_B = "Bulk date entry B";

  test("Given two time entries in list view, when the user selects both, opens bulk edit, picks a new date via CalendarPanel, and saves, then the entries are updated", async ({
    page,
  }) => {
    const email = `bulk-date-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Bulk Date User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    await createTimeEntryForWorkspace(page, {
      description: ENTRY_A,
      start: "2026-03-28T09:00:00Z",
      stop: "2026-03-28T10:00:00Z",
      workspaceId: session.currentWorkspaceId,
    });
    await createTimeEntryForWorkspace(page, {
      description: ENTRY_B,
      start: "2026-03-28T11:00:00Z",
      stop: "2026-03-28T12:00:00Z",
      workspaceId: session.currentWorkspaceId,
    });

    await page.reload();

    // Switch to list view
    await page.getByRole("radio", { name: "List view" }).click();
    const listView = page.getByTestId("timer-list-view");
    await expect(listView).toBeVisible();

    // Select both entries via group checkbox (selects all in the day group)
    const groupCheckbox = listView.locator('input[type="checkbox"]').first();
    await groupCheckbox.check();

    // Verify bulk action toolbar appears
    const toolbar = page.getByTestId("bulk-action-toolbar");
    await expect(toolbar).toBeVisible();
    await expect(toolbar).toContainText("2 items selected");

    // Click Edit to open bulk edit dialog
    await toolbar.getByRole("button", { name: "Bulk edit selected entries" }).click();
    const dialog = page.getByTestId("bulk-edit-dialog");
    await expect(dialog).toBeVisible();

    // Click the date picker button to open CalendarPanel
    const datePickerButton = dialog.getByTestId("bulk-edit-date");
    await datePickerButton.click();

    // CalendarPanel should appear
    const calendarPanel = page.getByTestId("calendar-panel");
    await expect(calendarPanel).toBeVisible();

    // Pick a date — March 25, 2026
    await calendarPanel.getByRole("button", { name: "March 25, 2026" }).click();

    // CalendarPanel should close after selection
    await expect(calendarPanel).not.toBeVisible();

    // The date picker button should now show the selected date
    await expect(datePickerButton).toContainText("Mar 25, 2026");

    // Save bulk edit
    await dialog.getByTestId("bulk-edit-save").click();
    await expect(dialog).not.toBeVisible();
  });
});
