import { expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

const ENTRY_DESCRIPTION = "Time entry to edit";

test.describe("Story: edit a stopped time entry", () => {
  test.beforeEach(async ({ page }) => {
    const email = `edit-entry-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Edit Entry User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), { email, password });

    await createStoppedTimeEntry(page, {
      description: ENTRY_DESCRIPTION,
      start: "2026-03-23T10:00:00Z",
      stop: "2026-03-23T10:30:00Z",
      workspaceId: loginSession.currentWorkspaceId,
    });

    await page.reload();
    await expect(
      page.getByRole("button", { name: `Edit ${ENTRY_DESCRIPTION}` }).first(),
    ).toBeVisible();
  });

  test("Given a stopped time entry, when the user opens the editor dialog, then the header close button is vertically centered and has consistent styling with other header buttons", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: `Edit ${ENTRY_DESCRIPTION}` })
      .first()
      .click();

    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    const closeButton = dialog.getByRole("button", { name: "Close editor" });
    await expect(closeButton).toBeVisible();

    const closeButtonBox = await closeButton.boundingBox();
    expect(closeButtonBox).not.toBeNull();

    const playButton = dialog.getByRole("button", { name: /continue entry|stop timer/i });
    await expect(playButton).toBeVisible();
    const playButtonBox = await playButton.boundingBox();
    expect(playButtonBox).not.toBeNull();

    if (closeButtonBox && playButtonBox) {
      const closeButtonCenterY = closeButtonBox.y + closeButtonBox.height / 2;
      const playButtonCenterY = playButtonBox.y + playButtonBox.height / 2;
      expect(Math.abs(closeButtonCenterY - playButtonCenterY)).toBeLessThan(3);
    }

    const closeButtonClasses = await closeButton.getAttribute("class");
    expect(closeButtonClasses).toContain("size-7");
    expect(closeButtonClasses).toContain("rounded-full");
  });

  test("when the user presses Escape with dirty edits, the editor shows discard protection before closing", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: `Edit ${ENTRY_DESCRIPTION}` })
      .first()
      .click();

    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    const descInput = dialog.getByLabel("Time entry description");
    await descInput.fill("Dirty edit");
    await expect(descInput).toHaveValue("Dirty edit");
    // Wait for React to propagate the dirty state from the description change
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");

    const discardPrompt = page.getByTestId("time-entry-editor-discard-confirmation");
    await expect(discardPrompt).toBeVisible();
    await discardPrompt.getByRole("button", { name: "Keep editing" }).click();
    await expect(discardPrompt).not.toBeVisible();
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(discardPrompt).toBeVisible();
    await discardPrompt.getByRole("button", { name: "Discard" }).click();

    await expect(dialog).not.toBeVisible();
  });

  test("when the user clicks the close button with dirty edits, the editor shows discard protection before closing", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: `Edit ${ENTRY_DESCRIPTION}` })
      .first()
      .click();

    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Time entry description").fill("Dirty edit");
    await dialog.getByRole("button", { name: "Close editor" }).click();

    const discardPrompt = page.getByTestId("time-entry-editor-discard-confirmation");
    await expect(discardPrompt).toBeVisible();
    await discardPrompt.getByRole("button", { name: "Discard" }).click();

    await expect(dialog).not.toBeVisible();
  });

  test("when the user clicks outside the dialog, the editor dialog closes", async ({ page }) => {
    await page
      .getByRole("button", { name: `Edit ${ENTRY_DESCRIPTION}` })
      .first()
      .click();

    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();

    if (dialogBox) {
      // Click a known visible element outside the dialog to trigger the outside-click handler.
      const timerPage = page.getByTestId("tracking-timer-page");
      await timerPage.click({ position: { x: 10, y: 10 }, force: true });
    }

    await expect(dialog).not.toBeVisible();
  });

  test("when the user edits the start time from the editor popover, the updated time is saved", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: `Edit ${ENTRY_DESCRIPTION}` })
      .first()
      .click();

    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Edit start time" }).click();
    const timeInput = dialog.getByLabel("Edit time");
    await expect(timeInput).toBeVisible();
    await timeInput.fill("09:28");
    await timeInput.blur();

    await expect(dialog.getByRole("button", { name: "Edit start time" })).toContainText("9:28");
    await page.waitForTimeout(300);
    await expect(dialog.getByRole("button", { name: "Edit start time" })).toContainText("9:28");

    await dialog.getByRole("button", { name: "Edit start date" }).click();
    const datePicker = page.getByTestId("time-entry-editor-start-date-picker");
    await expect(datePicker).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Edit start time" })).toContainText("9:28");
    await datePicker.getByRole("button", { name: "March 23, 2026" }).click();
    await expect(datePicker).not.toBeVisible();

    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: `Edit ${ENTRY_DESCRIPTION}` }).first(),
    ).toBeVisible();

    await page
      .getByRole("button", { name: `Edit ${ENTRY_DESCRIPTION}` })
      .first()
      .click();
    await expect(page.getByTestId("time-entry-editor-dialog")).toBeVisible();
    await expect(
      page.getByTestId("time-entry-editor-dialog").getByRole("button", { name: "Edit start time" }),
    ).toContainText("9:28");
  });

  test("when the user opens the start date picker, the picker is anchored inside /timer without navigation", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: `Edit ${ENTRY_DESCRIPTION}` })
      .first()
      .click();

    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/timer$/);

    await dialog.getByRole("button", { name: "Edit start date" }).click();
    await expect(page.getByTestId("time-entry-editor-start-date-picker")).toBeVisible();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await expect(page).toHaveURL(/\/timer$/);
  });

  test("when the calendar is scrolled while the editor is open, the editor scrolls with the entry", async ({
    page,
  }) => {
    const entryButton = page.getByRole("button", { name: `Edit ${ENTRY_DESCRIPTION}` }).first();
    await expect(entryButton).toBeVisible();
    await entryButton.click();

    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    // Record the initial vertical offset between the entry and the dialog
    const entryBox = await entryButton.boundingBox();
    const dialogBox = await dialog.boundingBox();
    expect(entryBox).not.toBeNull();
    expect(dialogBox).not.toBeNull();
    // Scroll the react-big-calendar time content area (the actual scroll
    // container inside the calendar grid, rendered by react-big-calendar)
    const rbcTimeContent = page.locator(".rbc-time-content");
    await rbcTimeContent.evaluate((el) => {
      el.scrollTop += 200;
    });

    // Wait a tick for any reflow
    await page.waitForTimeout(100);

    // After scrolling, the entry must have moved up in the viewport
    const entryBoxAfter = await entryButton.boundingBox();
    const dialogBoxAfter = await dialog.boundingBox();
    expect(entryBoxAfter).not.toBeNull();
    expect(dialogBoxAfter).not.toBeNull();

    // Sanity: the entry must have actually scrolled (moved up in viewport)
    const entryDeltaY = entryBoxAfter!.y - entryBox!.y;
    expect(Math.abs(entryDeltaY)).toBeGreaterThan(50);

    // The editor must have moved by the same amount as the entry
    const dialogDeltaY = dialogBoxAfter!.y - dialogBox!.y;
    expect(Math.abs(dialogDeltaY - entryDeltaY)).toBeLessThan(5);
  });

  test("when the user clicks a calendar entry, the editor dialog shows its start and stop times", async ({
    page,
  }) => {
    const entryButton = page.getByRole("button", { name: `Edit ${ENTRY_DESCRIPTION}` }).first();
    await expect(entryButton).toBeVisible();

    await entryButton.click();
    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Edit start time" })).toContainText("10:00");
    await expect(dialog.getByRole("button", { name: "Edit stop time" })).toContainText("10:30");
  });
});

async function createStoppedTimeEntry(
  page: import("@playwright/test").Page,
  options: {
    description: string;
    start: string;
    stop: string;
    workspaceId: number;
  },
): Promise<void> {
  await page.evaluate(async ({ description, start, stop, workspaceId }) => {
    const response = await fetch(`/api/v9/workspaces/${workspaceId}/time_entries`, {
      body: JSON.stringify({
        created_with: "opentoggl-e2e",
        description,
        duration: Math.round((new Date(stop).getTime() - new Date(start).getTime()) / 1000),
        start,
        stop,
      }),
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Failed to create time entry: ${response.status}`);
    }
  }, options);
}
