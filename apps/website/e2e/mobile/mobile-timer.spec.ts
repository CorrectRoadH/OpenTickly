import { devices, expect, test } from "@playwright/test";

import {
  createProjectForWorkspace,
  createTagForWorkspace,
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "../fixtures/e2e-auth.ts";
import { pollCurrentRunningEntry } from "../fixtures/e2e-api.ts";

test.use({ ...devices["iPhone 13"] });

/**
 * Mobile User Story E2E Tests
 *
 * These tests follow real user workflows on the mobile experience.
 * Each test represents a complete user story that can be executed
 * without knowledge of the implementation.
 */

/* ================================
   USER STORY 1: Start and Stop Timer
   As a mobile user, I want to start a timer so I can track time.
   ================================ */
test.describe("Start and Stop Timer", () => {
  test.beforeEach(async ({ page }) => {
    const email = `mobile-timer-${Date.now()}-${Math.random()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Mobile Timer User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });
  });

  test("User starts a timer with a description, sees it running, then stops it", async ({
    page,
  }) => {
    await page.goto(new URL("/m/timer", page.url()).toString());

    // User types a description in the composer input
    const composerInput = page.getByPlaceholder("What are you working on?");
    await expect(composerInput).toBeVisible();
    const description = "Writing mobile tests";
    await composerInput.fill(description);

    // User presses Enter to start the timer
    await composerInput.press("Enter");

    // Timer is now running - the composer bar shows the running entry
    await expect(page.getByText(description)).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toBeVisible();

    // User taps the stop button to stop the timer
    await page.getByTestId("timer-action-button").click();

    // Timer is stopped - composer bar returns to input mode
    await expect(composerInput).toBeVisible();

    // The stopped entry appears in the Recent section
    await expect(page.getByText("Recent")).toBeVisible();
    await expect(page.getByText(description).first()).toBeVisible();
  });

  test("User starts a timer and verifies it is running via API", async ({ page }) => {
    await page.goto(new URL("/m/timer", page.url()).toString());

    const composerInput = page.getByPlaceholder("What are you working on?");
    const description = "Timer that must be running";
    await composerInput.fill(description);
    await composerInput.press("Enter");

    // Wait for the timer to be recognized as running
    await expect(page.getByText(description)).toBeVisible();

    // Verify via API that a timer is running with correct description
    const { body: currentEntry } = await pollCurrentRunningEntry(page, { timeoutMs: 5000 });
    expect(currentEntry).not.toBeNull();
    expect(currentEntry?.description).toBe(description);
  });
});

/* ================================
   USER STORY 2: View Running Timer on Calendar
   As a mobile user, I want to see my running timer on the calendar.
   ================================ */
test.describe("View Running Timer on Calendar", () => {
  test.beforeEach(async ({ page }) => {
    const email = `mobile-calendar-${Date.now()}-${Math.random()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Mobile Calendar User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });
  });

  test("User starts a timer on Timer tab, navigates to Calendar, and sees the running entry", async ({
    page,
  }) => {
    // Start a timer on the Timer tab
    await page.goto(new URL("/m/timer", page.url()).toString());
    const composerInput = page.getByPlaceholder("What are you working on?");
    const description = "Running while viewing calendar";
    await composerInput.fill(description);
    await composerInput.press("Enter");
    await expect(page.getByText(description).first()).toBeVisible();

    // Navigate to Calendar tab
    await page.getByRole("navigation").getByText("Calendar").click();
    await expect(page).toHaveURL(/\/m\/calendar/);

    // The running entry is visible on the calendar timeline
    const timeline = page.locator(".overflow-y-auto").first();
    await expect(timeline.getByText(description)).toBeVisible();
  });
});

/* ================================
   USER STORY 3: Edit Time Entry Duration
   As a mobile user, I want to edit a time entry's start/end time
   to correct mistakes.
   ================================ */
test.describe("Edit Time Entry Duration", () => {
  let workspaceId: number;
  const ENTRY_DESCRIPTION = "Entry with wrong duration";

  test.beforeEach(async ({ page }) => {
    const email = `mobile-edit-time-${Date.now()}-${Math.random()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Mobile Edit Time User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    workspaceId = session.currentWorkspaceId;

    // Pre-create a stopped time entry (1 hour duration: 10:00 - 11:00)
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 0, 0),
    );
    const stop = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 11, 0, 0),
    );

    await createTimeEntryForWorkspace(page, {
      description: ENTRY_DESCRIPTION,
      start: start.toISOString(),
      stop: stop.toISOString(),
      workspaceId,
    });
  });

  test("User taps an entry, changes start time to extend duration, and saves", async ({ page }) => {
    await page.goto(new URL("/m/timer", page.url()).toString());

    // Entry appears in Recent section
    await expect(page.getByText("Recent")).toBeVisible();
    await expect(page.getByText(ENTRY_DESCRIPTION).first()).toBeVisible();

    // User taps the entry to open the editor
    await page
      .getByRole("button", { name: `Edit ${ENTRY_DESCRIPTION}` })
      .first()
      .click();

    // Editor is visible
    const editor = page.getByTestId("mobile-time-entry-editor");
    await expect(editor).toBeVisible();
    await expect(editor.getByText("Edit Entry")).toBeVisible();

    // User changes start time from 10:00 to 09:30 (extends to 1.5 hours)
    const startTimeInput = editor.getByLabel("Edit start time");
    await startTimeInput.fill("09:30");

    // User saves the changes
    await editor.getByRole("button", { name: "Save changes" }).click();

    // Editor closes
    await expect(editor).not.toBeVisible();

    // Entry is still visible
    await expect(page.getByText(ENTRY_DESCRIPTION).first()).toBeVisible();
  });

  test("User taps an entry in the This Week grouped list (not Recent) and opens the editor", async ({
    page,
  }) => {
    await page.goto(new URL("/m/timer", page.url()).toString());

    // Entry appears both in "Recent" (top) and "This Week" (grouped by day, below).
    // Each section renders its own `Edit {description}` button, so there are 2 of them.
    const editButtons = page.getByRole("button", { name: `Edit ${ENTRY_DESCRIPTION}` });
    await expect(editButtons.first()).toBeVisible();
    await expect(editButtons).toHaveCount(2);

    // Tap the SECOND one — the one inside the "This Week" grouped list.
    // This is the entry the user sees below the "Recent" section.
    await editButtons.nth(1).click();

    // Editor must open.
    await expect(page.getByTestId("mobile-time-entry-editor")).toBeVisible();
  });

  test("User edits an entry on Calendar tab, changes both start and end time", async ({ page }) => {
    await page.goto(new URL("/m/calendar", page.url()).toString());

    // Find the entry on calendar
    await expect(page.getByText(ENTRY_DESCRIPTION).first()).toBeVisible();

    // Tap to open editor
    await page
      .getByRole("button", { name: `Edit ${ENTRY_DESCRIPTION}` })
      .first()
      .click();

    const editor = page.getByTestId("mobile-time-entry-editor");
    await expect(editor.getByText("Edit Entry")).toBeVisible();

    // Change start to 09:00 and end to 12:00 (3 hour duration)
    await editor.getByLabel("Edit start time").fill("09:00");
    await editor.getByLabel("Edit end time").fill("12:00");

    // Save
    await editor.getByRole("button", { name: "Save changes" }).click();
    await expect(editor).not.toBeVisible();

    // Entry still visible on calendar
    await expect(page.getByText(ENTRY_DESCRIPTION).first()).toBeVisible();
  });

  test("User cancels editing and the entry remains unchanged", async ({ page }) => {
    await page.goto(new URL("/m/timer", page.url()).toString());

    // Wait for entry to appear before clicking
    const editButton = page.getByRole("button", { name: `Edit ${ENTRY_DESCRIPTION}` }).first();
    await expect(editButton).toBeVisible();

    // Open entry editor
    await editButton.click();

    const editor = page.getByTestId("mobile-time-entry-editor");
    await expect(editor).toBeVisible();

    // Change the description
    await editor.getByLabel("Time entry description").fill("Modified description");

    // Cancel the edit
    await editor.getByRole("button", { name: "Cancel editing" }).click();
    await expect(editor).not.toBeVisible();

    // Original description is still there, modified is not
    await expect(page.getByText(ENTRY_DESCRIPTION).first()).toBeVisible();
    await expect(page.getByText("Modified description")).not.toBeVisible();
  });
});

/* ================================
   USER STORY 4: Assign Project to Time Entry
   As a mobile user, I want to assign a project to my time entry
   so I can categorize my work.
   ================================ */
test.describe("Assign Project to Time Entry", () => {
  let workspaceId: number;
  const PROJECT_NAME = "Mobile Development";
  const ENTRY_DESCRIPTION = "Working on mobile app";

  test.beforeEach(async ({ page }) => {
    const email = `mobile-project-${Date.now()}-${Math.random()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Mobile Project User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    workspaceId = session.currentWorkspaceId;

    // Create a project
    await createProjectForWorkspace(page, {
      name: PROJECT_NAME,
      workspaceId,
    });

    // Create a time entry without project
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 14, 0, 0),
    );
    const stop = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 15, 0, 0),
    );

    await createTimeEntryForWorkspace(page, {
      description: ENTRY_DESCRIPTION,
      start: start.toISOString(),
      stop: stop.toISOString(),
      workspaceId,
    });
  });

  test("User opens entry editor, selects a project, and saves", async ({ page }) => {
    await page.goto(new URL("/m/timer", page.url()).toString());

    // Entry visible but without project indicator
    await expect(page.getByText(ENTRY_DESCRIPTION).first()).toBeVisible();

    // Open editor
    await page
      .getByRole("button", { name: `Edit ${ENTRY_DESCRIPTION}` })
      .first()
      .click();

    const editor = page.getByTestId("mobile-time-entry-editor");
    await expect(editor).toBeVisible();

    // Open project picker and select project
    const projectTrigger = editor.getByTestId("mobile-project-trigger");
    await expect(projectTrigger).toBeVisible();
    await projectTrigger.click();
    const projectPicker = page.getByTestId("mobile-project-picker");
    await expect(projectPicker).toBeVisible();
    await projectPicker.getByRole("button", { name: PROJECT_NAME }).click();
    await expect(projectPicker).not.toBeVisible();

    // Save — `handleSave` closes the editor synchronously and fires the
    // PUT as a void background mutation for snappiness. If we called
    // `page.reload()` right here, we'd race the in-flight PUT and the
    // reload would abort it before the server persists the change. Wait
    // for the PUT to complete before reloading so the assertion actually
    // tests server-side persistence, not request-cancellation behavior.
    const savePromise = page.waitForResponse(
      (resp) => resp.url().includes("/time_entries/") && resp.request().method() === "PUT",
    );
    await editor.getByRole("button", { name: "Save changes" }).click();
    await expect(editor).not.toBeVisible();
    // First prove the optimistic cache patch surfaces the project
    // instantly — without reloading. This also doubles as a gate that
    // keeps the editor's close-then-mutate path honest.
    await expect(page.getByText(PROJECT_NAME).first()).toBeVisible();
    await savePromise;

    // Now verify persistence — fresh page load pulls fresh data from the
    // server, so the project must still be there.
    await page.reload();
    await expect(page.getByText(PROJECT_NAME).first()).toBeVisible();
  });

  test("User starts a timer, assigns a project while running, then stops", async ({ page }) => {
    await page.goto(new URL("/m/timer", page.url()).toString());

    // Start timer
    const composerInput = page.getByPlaceholder("What are you working on?");
    await composerInput.fill("Running with project");
    await composerInput.press("Enter");
    await expect(page.getByText("Running with project").first()).toBeVisible();

    // Open running entry for editing
    await page.getByText("Running with project").first().click();

    const editor = page.getByTestId("mobile-time-entry-editor");
    await expect(editor).toBeVisible();
    const projectTrigger2 = editor.getByTestId("mobile-project-trigger");
    await expect(projectTrigger2).toBeVisible();
    await projectTrigger2.click();
    const projectPicker = page.getByTestId("mobile-project-picker");
    await expect(projectPicker).toBeVisible();
    await projectPicker.getByRole("button", { name: PROJECT_NAME }).click();
    await expect(projectPicker).not.toBeVisible();

    // Save - timer should still be running
    await editor.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Running with project").first()).toBeVisible();

    // Stop timer
    await page.getByTestId("timer-action-button").click();

    // Stopped entry now shows the project
    await expect(page.getByText(PROJECT_NAME).first()).toBeVisible();
  });
});

/* ================================
   USER STORY 5: Assign Tags to Time Entry
   As a mobile user, I want to add tags to my time entry
   for better organization.
   ================================ */
test.describe("Assign Tags to Time Entry", () => {
  let workspaceId: number;
  const TAG_NAME = "mobile-testing";
  const ENTRY_DESCRIPTION = "Entry to tag";

  test.beforeEach(async ({ page }) => {
    const email = `mobile-tags-${Date.now()}-${Math.random()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Mobile Tags User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    workspaceId = session.currentWorkspaceId;

    // Create a tag
    await createTagForWorkspace(page, {
      name: TAG_NAME,
      workspaceId,
    });

    // Create a time entry
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 16, 0, 0),
    );
    const stop = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 17, 0, 0),
    );

    await createTimeEntryForWorkspace(page, {
      description: ENTRY_DESCRIPTION,
      start: start.toISOString(),
      stop: stop.toISOString(),
      workspaceId,
    });
  });

  test("User opens entry, adds a tag, and saves", async ({ page }) => {
    await page.goto(new URL("/m/timer", page.url()).toString());

    // Wait for entry to appear before clicking
    const editButton = page.getByRole("button", { name: `Edit ${ENTRY_DESCRIPTION}` }).first();
    await expect(editButton).toBeVisible();

    // Open entry editor
    await editButton.click();

    const editor = page.getByTestId("mobile-time-entry-editor");
    await expect(editor).toBeVisible();

    // Open tag picker and select tag
    const tagTrigger = editor.getByTestId("mobile-tag-trigger");
    await expect(tagTrigger).toBeVisible();
    await tagTrigger.click();
    const tagPicker = page.getByTestId("mobile-tag-picker");
    await expect(tagPicker).toBeVisible();

    const tagButton = tagPicker.getByRole("button", { name: TAG_NAME }).first();
    await expect(tagButton).toBeVisible({ timeout: 5000 });
    await tagButton.click();

    // Close tag picker
    await tagPicker.getByLabel("Close tags picker").click();
    await expect(tagPicker).not.toBeVisible();

    // Click Save button
    const saveButton = editor.getByRole("button", { name: "Save changes" });
    await saveButton.click();

    // Wait for save to complete and editor to close
    await expect(editor).not.toBeVisible({ timeout: 10000 });
  });
});

/* ================================
   USER STORY 6: Continue (Restart) a Stopped Entry
   As a mobile user, I want to continue a stopped time entry
   so I can finish work on the same task.
   ================================ */
test.describe("Continue a Stopped Time Entry", () => {
  let workspaceId: number;
  const ENTRY_DESCRIPTION = "Entry to continue";

  test.beforeEach(async ({ page }) => {
    const email = `mobile-continue-${Date.now()}-${Math.random()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Mobile Continue User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    workspaceId = session.currentWorkspaceId;

    // Create a stopped time entry
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8, 0, 0),
    );
    const stop = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0),
    );

    await createTimeEntryForWorkspace(page, {
      description: ENTRY_DESCRIPTION,
      start: start.toISOString(),
      stop: stop.toISOString(),
      workspaceId,
    });
  });

  test("User taps the play button on a stopped entry to continue it", async ({ page }) => {
    await page.goto(new URL("/m/timer", page.url()).toString());

    // Entry appears in Recent
    await expect(page.getByText("Recent")).toBeVisible();
    await expect(page.getByText(ENTRY_DESCRIPTION).first()).toBeVisible();

    // Find and tap the continue (play) button
    const continueButton = page
      .getByRole("button", { name: `Continue ${ENTRY_DESCRIPTION}` })
      .first();
    await continueButton.click();

    // Timer is now running
    await expect(page.getByTestId("timer-action-button")).toBeVisible();
    await expect(page.getByText(ENTRY_DESCRIPTION).first()).toBeVisible();

    // Verify via API that timer is running with correct description
    const { body: currentEntry } = await pollCurrentRunningEntry(page, { timeoutMs: 5000 });
    expect(currentEntry).not.toBeNull();
    expect(currentEntry?.description).toBe(ENTRY_DESCRIPTION);
  });
});

/* ================================
   USER STORY 7: Delete a Time Entry
   As a mobile user, I want to delete a time entry
   to remove incorrect entries.
   ================================ */
test.describe("Delete a Time Entry", () => {
  let workspaceId: number;
  const ENTRY_DESCRIPTION = "Entry to delete";

  test.beforeEach(async ({ page }) => {
    const email = `mobile-delete-${Date.now()}-${Math.random()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Mobile Delete User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    workspaceId = session.currentWorkspaceId;

    // Create a stopped time entry
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 0, 0),
    );
    const stop = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 11, 0, 0),
    );

    await createTimeEntryForWorkspace(page, {
      description: ENTRY_DESCRIPTION,
      start: start.toISOString(),
      stop: stop.toISOString(),
      workspaceId,
    });
  });

  test("User opens entry editor and deletes the entry", async ({ page }) => {
    await page.goto(new URL("/m/timer", page.url()).toString());

    // Entry is visible
    await expect(page.getByText(ENTRY_DESCRIPTION).first()).toBeVisible();

    // Open editor
    await page
      .getByRole("button", { name: `Edit ${ENTRY_DESCRIPTION}` })
      .first()
      .click();

    const editor = page.getByTestId("mobile-time-entry-editor");

    // Click delete
    await editor.getByRole("button", { name: "Delete this time entry" }).click();

    // Editor closes and entry is gone
    await expect(editor).not.toBeVisible();
    await expect(page.getByText(ENTRY_DESCRIPTION)).not.toBeVisible();
  });
});

/* ================================
   USER STORY 8: Empty State
   As a new mobile user with no time entries, I want to see a
   friendly message so I know the page loaded and what to do next.
   ================================ */
test.describe("Empty State for New User", () => {
  test.beforeEach(async ({ page }) => {
    const email = `mobile-empty-${Date.now()}-${Math.random()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Mobile Empty User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });
  });

  test("Timer page shows empty state message when user has no time entries", async ({ page }) => {
    await page.goto(new URL("/m/timer", page.url()).toString());

    // The page should show a friendly empty state, not a blank void
    await expect(page.getByTestId("mobile-timer-empty-state")).toBeVisible({ timeout: 10_000 });
  });

  test("No API errors on time_entries endpoint when page loads", async ({ page }) => {
    const apiErrors: string[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/time_entries") && response.status() >= 400) {
        apiErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    // Wait for the initial time_entries fetch to complete before checking errors
    const initialFetch = page.waitForResponse(
      (resp) => resp.url().includes("/time_entries") && resp.request().method() === "GET",
    );
    await page.goto(new URL("/m/timer", page.url()).toString());
    await expect(page.getByPlaceholder("What are you working on?")).toBeVisible();
    await initialFetch;

    expect(apiErrors).toEqual([]);
  });
});

/* ================================
   USER STORY 9: Continue Suggestion Pills
   As a mobile user with recent entries, I want to see quick-continue
   pills below the composer input so I can restart common tasks in one tap.
   ================================ */
test.describe("Continue Suggestion Pills", () => {
  const ENTRY_DESCRIPTION = "Pill suggestion entry";

  test.beforeEach(async ({ page }) => {
    const email = `mobile-pills-${Date.now()}-${Math.random()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Mobile Pills User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    // Create a stopped time entry within the last 7 days
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 0, 0),
    );
    const stop = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 11, 0, 0),
    );

    await createTimeEntryForWorkspace(page, {
      description: ENTRY_DESCRIPTION,
      start: start.toISOString(),
      stop: stop.toISOString(),
      workspaceId: session.currentWorkspaceId,
    });
  });

  test("Continue pills appear below the composer when no text is entered", async ({ page }) => {
    await page.goto(new URL("/m/timer", page.url()).toString());

    // Composer input should be visible (no running timer)
    await expect(page.getByPlaceholder("What are you working on?")).toBeVisible();

    // The continue pill chips live in the composer bar at the bottom,
    // which uses rounded-full pill styling (not the timer page's list rows).
    const pill = page.locator("button.rounded-full", {
      hasText: ENTRY_DESCRIPTION,
    });
    await expect(pill).toBeVisible({ timeout: 10_000 });
  });

  test("Tapping a continue pill starts a new timer with that description", async ({ page }) => {
    await page.goto(new URL("/m/timer", page.url()).toString());

    await expect(page.getByPlaceholder("What are you working on?")).toBeVisible();

    // Wait for the pill chip in the composer bar
    const pill = page.locator("button.rounded-full", {
      hasText: ENTRY_DESCRIPTION,
    });
    await expect(pill).toBeVisible({ timeout: 10_000 });

    // Tap the pill
    await pill.click();

    // Timer should now be running with the entry's description
    await expect(page.getByText(ENTRY_DESCRIPTION).first()).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toBeVisible();

    // Verify via API
    const { body: currentEntry } = await pollCurrentRunningEntry(page, { timeoutMs: 5000 });
    expect(currentEntry).not.toBeNull();
    expect(currentEntry?.description).toBe(ENTRY_DESCRIPTION);
  });
});

/* ================================
   SMOKE TESTS: Navigation
   Basic navigation sanity checks.
   ================================ */
test.describe("Mobile Navigation", () => {
  test.beforeEach(async ({ page }) => {
    const email = `mobile-nav-${Date.now()}-${Math.random()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Mobile Nav User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });
  });

  test("Bottom tab bar shows all four tabs and navigates correctly", async ({ page }) => {
    await page.goto(new URL("/m/timer", page.url()).toString());

    // All tabs present
    await expect(page.getByRole("link", { name: "Timer", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Calendar" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Report" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Me", exact: true })).toBeVisible();

    // Navigate to each tab and verify URL
    await page.getByRole("link", { name: "Calendar" }).click();
    await expect(page).toHaveURL(/\/m\/calendar/);

    await page.getByRole("link", { name: "Report" }).click();
    await expect(page).toHaveURL(/\/m\/report/);

    await page.getByRole("link", { name: "Me", exact: true }).click();
    await expect(page).toHaveURL(/\/m\/me/);

    await page.getByRole("link", { name: "Timer", exact: true }).click();
    await expect(page).toHaveURL(/\/m\/timer/);
  });

  test("Navigating to /m redirects to /m/timer", async ({ page }) => {
    await page.goto(new URL("/m", page.url()).toString());
    await expect(page).toHaveURL(/\/m\/timer/);
  });
});
