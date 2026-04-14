import { expect, test } from "@playwright/test";

import {
  createTagForWorkspace,
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";

/**
 * Functional regression: the inline tag picker on a list entry must open
 * on click and let the user toggle a tag that persists back to the entry.
 *
 * User reported that after clicking the tag icon, tags inside the
 * dropdown are not selectable — the dropdown either closes before the
 * click lands or the toggle silently fails.
 */
test.describe("List entry tag picker", () => {
  test("clicking a tag in the inline tag picker toggles it onto the time entry", async ({
    page,
  }) => {
    const email = `list-tag-picker-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "List Tag Picker User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    const tagName = `picker-tag-${Date.now()}`;
    await createTagForWorkspace(page, {
      name: tagName,
      workspaceId: session.currentWorkspaceId,
    });

    const now = new Date();
    const startUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 0, 0),
    );
    const stopUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 11, 0, 0),
    );
    const entryId = await createTimeEntryForWorkspace(page, {
      description: "Tag picker target",
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

    // The tag button must be visible without hovering the row. Earlier
    // the icon was hidden behind `opacity-0 group-hover:opacity-100`, which
    // made users think the tag picker was broken because they could not
    // see the entry point. Lock that in with an opacity assertion.
    const tagButton = row.getByRole("button", { name: "Select tags" });
    await expect(tagButton).toBeVisible();
    await expect(tagButton).toHaveCSS("opacity", "1");
    await tagButton.click();

    // Picker dropdown appears.
    const picker = page.getByTestId("bulk-edit-tag-picker");
    await expect(picker).toBeVisible();

    // Click the tag option — it must toggle onto the entry.
    await picker.getByRole("button", { name: tagName }).click();

    // Tag appears on the row (rendered as the tagName text inside the
    // tag-picker button when the entry has at least one tag).
    await expect(row.getByText(tagName)).toBeVisible();
  });
});
