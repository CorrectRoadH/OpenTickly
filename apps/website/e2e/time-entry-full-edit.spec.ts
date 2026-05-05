import { expect, test } from "@playwright/test";

import { createProjectForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";
import { expectedDuration } from "./fixtures/e2e-format.ts";

/** Return today's date as YYYY-MM-DD so entries always land in the current week. */
function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/**
 * Story: A user edits a time entry from the calendar view, changing its
 * description, project, tags, billable status, start/stop times, and saves.
 *
 * This is the highest-frequency user flow in the app — every tracking
 * session involves opening the editor and adjusting at least one field.
 */
test.describe("Story: full time entry editing from calendar", () => {
  const INITIAL_DESCRIPTION = "Initial task";
  const PROJECT_NAME = `Project-${Date.now()}`;

  let workspaceId: number;

  test.beforeEach(async ({ page }) => {
    const email = `full-edit-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Full Edit User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    workspaceId = session.currentWorkspaceId;

    // Seed: create a project and a stopped time entry
    await createProjectForWorkspace(page, {
      name: PROJECT_NAME,
      workspaceId,
    });

    await createTagForWorkspace(page, { name: "urgent", workspaceId });

    const today = todayISO();
    await createStoppedTimeEntry(page, {
      description: INITIAL_DESCRIPTION,
      start: `${today}T09:00:00Z`,
      stop: `${today}T10:00:00Z`,
      workspaceId,
    });

    await page.reload();
    await expect(page.getByRole("button", { name: INITIAL_DESCRIPTION }).first()).toBeVisible();
  });

  test("when the user selects a project in the editor, the project is saved and visible after reload", async ({
    page,
  }) => {
    // Open the editor
    await page.getByRole("button", { name: INITIAL_DESCRIPTION }).first().click();
    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    // Click the project picker
    await dialog.getByLabel("Select project").click();

    // Search for the project
    const searchInput = dialog.locator('input[placeholder*="Search"]');
    await searchInput.fill(PROJECT_NAME.substring(0, 8));

    // Select the project
    await dialog.getByText(PROJECT_NAME).click();

    // Project should now show in the picker button
    await expect(dialog.getByLabel("Select project")).toContainText(PROJECT_NAME);

    // Save
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Time entry saved")).toBeVisible();

    // Verify: reload — the calendar entry itself should show the project name
    await page.reload();
    await expect(page.getByRole("button", { name: INITIAL_DESCRIPTION }).first()).toBeVisible();
    await expect(page.getByText(PROJECT_NAME).first()).toBeVisible();
  });

  test("when the user selects a tag in the editor, the tag is saved and visible after reload", async ({
    page,
  }) => {
    await page.getByRole("button", { name: INITIAL_DESCRIPTION }).first().dispatchEvent("click");
    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    // Open tag picker
    await dialog.getByLabel("Select tags").click();

    // Select the "urgent" tag
    await dialog.getByText("urgent").click();

    // Tag should show in the picker button
    await expect(dialog.getByLabel("Tags: urgent")).toContainText("urgent");

    // Close the tag picker so it doesn't intercept clicks on Save
    await dialog.getByLabel("Tags: urgent").click();

    // Save
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Time entry saved")).toBeVisible();

    // Verify: reload — the calendar entry itself should show the tag
    await page.reload();
    await expect(page.getByRole("button", { name: INITIAL_DESCRIPTION }).first()).toBeVisible();
    await expect(page.getByText("urgent").first()).toBeVisible();
  });

  test("when the user toggles billable and edits the stop time, both changes are saved", async ({
    page,
  }) => {
    await page.getByRole("button", { name: INITIAL_DESCRIPTION }).first().click();
    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    // Toggle billable
    await dialog.getByLabel("Billable").click();

    // Edit stop time: click the stop time button to enter edit mode
    await dialog.getByRole("button", { name: "Edit stop time" }).click();
    const timeInput = dialog.getByLabel("Edit time");
    await timeInput.fill("11:30");
    await timeInput.press("Enter");

    // Duration should update (9:00 to 11:30 = 2h30m)
    await expect(dialog.locator(`text=${expectedDuration(9000)}`)).toBeVisible();

    // Save
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Time entry saved")).toBeVisible();

    // Verify: reload and reopen — billable and stop time must persist from the API
    await page.reload();
    await expect(page.getByRole("button", { name: INITIAL_DESCRIPTION }).first()).toBeVisible();
    await page.getByRole("button", { name: INITIAL_DESCRIPTION }).first().click();
    const reopened = page.getByTestId("time-entry-editor-dialog");
    await expect(reopened).toBeVisible();
    await expect(reopened.getByLabel("Billable")).toHaveAttribute("aria-pressed", "true");
    await expect(reopened.getByRole("button", { name: "Edit stop time" })).toContainText("11:30");
  });

  test("when the user changes the description and saves, the new description appears on the calendar", async ({
    page,
  }) => {
    await page.getByRole("button", { name: INITIAL_DESCRIPTION }).first().click();
    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    // Clear and type new description
    const descInput = dialog.getByLabel("Time entry description");
    await descInput.fill("Updated task name");

    // Save
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Time entry saved")).toBeVisible();

    // The calendar should now show the updated description
    await expect(page.getByRole("button", { name: "Updated task name" }).first()).toBeVisible();

    // Verify: reload — description must persist from the API
    await page.reload();
    await expect(page.getByRole("button", { name: "Updated task name" }).first()).toBeVisible();
  });
});

/**
 * Story: Calendar view interaction details that match Toggl's behavior.
 * These verify the scroll-to-now, context menu persistence, and
 * right-click menu functionality.
 */
test.describe("Story: calendar view interactions", () => {
  // Freeze clock so "now" straddles the seeded 14:00–15:00 entry. Without
  // this the scroll-to-now contract (indicator centered in viewport) is
  // clock-dependent: CalendarView now refines its scroll target to keep
  // any above-"now" entries in view, so when the wall clock drifts far
  // from the 14:00–15:00 seed the indicator intentionally slides off
  // center to show the earlier entry. Pinning "now" to 14:30 on today's
  // date keeps the entry around "now" and preserves the centered-indicator
  // promise — without hardcoding a calendar date that would rot.
  test.beforeEach(async ({ page }) => {
    const today = todayISO();
    await page.clock.install({ time: new Date(`${today}T14:30:00Z`) });
    const email = `cal-interact-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Calendar Interaction User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    await createStoppedTimeEntry(page, {
      description: "Context menu test entry",
      start: `${today}T14:00:00Z`,
      stop: `${today}T15:00:00Z`,
      workspaceId: session.currentWorkspaceId,
    });

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Context menu test entry" }).first(),
    ).toBeVisible();
  });

  test("when the page loads, the current time indicator is centered in the viewport", async ({
    page,
  }) => {
    // Contract locked by this test:
    //   1. The scroll-to-now effect actually ran to completion — we gate
    //      on `data-scroll-to-now="done"` (the state signal CalendarView
    //      writes when it applied `window.scrollTo`). "skipped" or
    //      "pending" both fail — the user is on `/timer` with today in
    //      the visible week, so the indicator MUST be present and the
    //      scroll MUST fire.
    //   2. The window actually scrolled (`scrollY > 0`). A test that
    //      passes with `scrollY === 0` proves nothing — the calendar's
    //      natural top-anchored layout can place the indicator in the
    //      viewport without any scroll happening.
    //   3. The indicator lands near the vertical middle of the
    //      viewport — that is the UX promise ("进入后指示器在中间").
    //      We allow a generous ±25% half-window tolerance (i.e. the
    //      middle 50% of the viewport), strict enough to catch
    //      "stuck at the top of the calendar" and "stuck below the
    //      composer" regressions but loose enough to survive minor
    //      header-height changes.
    const wrapper = page.getByTestId("timer-calendar-view");
    await expect(wrapper).toHaveAttribute("data-scroll-to-now", "done");

    const state = await page.evaluate(() => {
      const indicator = document.querySelector<HTMLElement>(".rbc-current-time-indicator");
      return {
        indicatorTop: indicator ? indicator.getBoundingClientRect().top : null,
        scrollY: window.scrollY,
        viewportHeight: window.innerHeight,
      };
    });

    expect(state.scrollY).toBeGreaterThan(0);
    expect(state.indicatorTop).not.toBeNull();
    const indicatorTop = state.indicatorTop as number;
    const center = state.viewportHeight / 2;
    // ±15% of viewport height around the center — the indicator must
    // land in the middle ~30% of the screen. At 720px this is y ∈
    // [252, 468]. The current impl lands the indicator at
    // `headerHeight + 40` (≈217px with a 177px header), which is
    // firmly in the top third, not the middle — this assertion is what
    // turns the regression red.
    const tolerance = state.viewportHeight * 0.15;
    expect(Math.abs(indicatorTop - center)).toBeLessThan(tolerance);
  });

  test("when the user right-clicks a calendar entry, the context menu appears with expected items", async ({
    page,
  }) => {
    const entry = page.getByRole("button", { name: "Context menu test entry" }).first();
    await entry.click({ button: "right" });

    // Context menu should appear with standard items
    const menu = page.getByTestId("calendar-entry-context-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByText("Duplicate")).toBeVisible();
    await expect(menu.getByText("Copy description")).toBeVisible();
    await expect(menu.getByText("Delete")).toBeVisible();

    // Close with Escape
    await page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible();
  });

  test("when the user right-clicks and waits 3 seconds, the context menu stays open", async ({
    page,
  }) => {
    const entry = page.getByRole("button", { name: "Context menu test entry" }).first();
    await entry.click({ button: "right" });

    const menu = page.getByTestId("calendar-entry-context-menu");
    await expect(menu).toBeVisible();

    // Menu should survive timer ticks (nowMs re-renders).
    // Poll visibility over 3 seconds to confirm it stays open.
    await expect.poll(async () => menu.isVisible(), { timeout: 3000, intervals: [500] }).toBe(true);
  });
});

// ── Helpers ──

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
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`Failed to create time entry: ${response.status}`);
    }
  }, options);
}

async function createTagForWorkspace(
  page: import("@playwright/test").Page,
  options: { name: string; workspaceId: number },
): Promise<void> {
  await page.evaluate(async ({ name, workspaceId }) => {
    const response = await fetch(`/api/v9/workspaces/${workspaceId}/tags`, {
      body: JSON.stringify({ name }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`Failed to create tag: ${response.status}`);
    }
  }, options);
}
