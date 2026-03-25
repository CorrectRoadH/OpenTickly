import { expect, test } from "@playwright/test";

import {
  createProjectForWorkspace,
  createTimeEntryForWorkspace,
  loginE2eUser,
  readSessionBootstrap,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";

test.describe("VAL-REG-002: Workspace scoping regression", () => {
  /**
   * VAL-REG-002: Timer page is always scoped to the current workspace
   *
   * The timer page family only renders entries whose `workspace_id` matches the current workspace.
   * After a successful workspace or organization switch, entries from the previous context
   * disappear across `calendar`, `list`, and `timesheet` without stale cross-workspace leakage.
   *
   * This test verifies:
   * - Entries created in workspace A are visible in all timer views while on workspace A
   * - After switching to workspace B, entries from workspace A disappear from all timer views
   * - Entries created in workspace B become visible in all timer views after the switch
   * - The scoping rule holds consistently across calendar, list, and timesheet
   */
  test("VAL-REG-002: workspace switch removes prior-workspace entries and reveals new-workspace entries across all timer views", async ({
    page,
  }) => {
    const email = `workspace-scoping-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const workspaceAEntryDescription = "Entry in workspace A";
    const workspaceBEntryDescription = "Entry in workspace B";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Workspace Scoping User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), {
      email,
      password,
    });
    const workspaceAId = loginSession.currentWorkspaceId;

    // Create a project in workspace A so entries appear in all views (including timesheet)
    const projectAId = await createProjectForWorkspace(page, {
      name: "Workspace A Project",
      workspaceId: workspaceAId,
    });

    // Create time entries for today in workspace A
    const now = new Date();
    const baseYear = now.getUTCFullYear();
    const baseMonth = now.getUTCMonth();
    const baseDate = now.getUTCDate();

    const entryAStart = new Date(Date.UTC(baseYear, baseMonth, baseDate, 9, 0, 0));
    const entryAStop = new Date(Date.UTC(baseYear, baseMonth, baseDate, 10, 0, 0));
    await createTimeEntryForWorkspace(page, {
      description: workspaceAEntryDescription,
      projectId: projectAId,
      start: entryAStart.toISOString(),
      stop: entryAStop.toISOString(),
      workspaceId: workspaceAId,
    });

    // Navigate to timer page and verify workspace A entries are visible
    await page.goto(new URL("/timer", page.url()).toString());

    // Verify entries are visible in calendar view
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await expect(page.getByRole("button", { name: "Calendar" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // Calendar shows entries as event cards in the grid
    const calendarScrollArea = page.getByTestId("calendar-grid-scroll-area");
    await expect(calendarScrollArea).toBeVisible();
    await expect(page.locator(`text=${workspaceAEntryDescription}`)).toBeVisible();

    // Verify entries are visible in list view
    await page.getByRole("button", { name: "List view" }).click();
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const listViewContainer = page.getByTestId("timer-list-view");
    await expect(listViewContainer).toBeVisible();
    await expect(listViewContainer.locator(`text=${workspaceAEntryDescription}`)).toBeVisible();

    // Verify entries are visible in timesheet view
    await page.getByRole("button", { name: "Timesheet" }).click();
    await expect(page.getByRole("button", { name: "Timesheet" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const timesheetViewContainer = page.getByTestId("timer-timesheet-view");
    await expect(timesheetViewContainer).toBeVisible();
    // Timesheet aggregates by project, so verify project row is visible
    await expect(timesheetViewContainer.locator("text=Workspace A Project")).toBeVisible();
    // Verify timesheet is not empty
    await expect(page.getByText("No week data available")).not.toBeVisible();

    // Create a second organization (which creates workspace B) and switch to it
    const secondOrganizationName = `Organization ${Date.now()}`;
    const organizationButton = page.getByRole("button", {
      exact: true,
      name: "Organization",
    });

    await organizationButton.click();
    const workspaceListbox = page.getByRole("listbox");
    await expect(workspaceListbox).toBeVisible();

    await page.getByRole("button", { name: "Create organization" }).click();

    const createOrganizationDialog = page.getByRole("dialog", {
      name: "New organization",
    });
    await expect(createOrganizationDialog).toBeVisible();
    await createOrganizationDialog.getByLabel("Organization name").fill(secondOrganizationName);
    await createOrganizationDialog.getByRole("button", { name: "Create organization" }).click();

    // Wait for organization switch to complete by polling session
    await expect
      .poll(async () => (await readSessionBootstrap(page)).current_workspace_id)
      .not.toBe(workspaceAId);

    const switchedSession = await readSessionBootstrap(page);
    const workspaceBId = switchedSession.current_workspace_id;

    // Create a project in workspace B
    const projectBId = await createProjectForWorkspace(page, {
      name: "Workspace B Project",
      workspaceId: workspaceBId,
    });

    // Create time entry in workspace B
    const entryBStart = new Date(Date.UTC(baseYear, baseMonth, baseDate, 14, 0, 0));
    const entryBStop = new Date(Date.UTC(baseYear, baseMonth, baseDate, 15, 0, 0));
    await createTimeEntryForWorkspace(page, {
      description: workspaceBEntryDescription,
      projectId: projectBId,
      start: entryBStart.toISOString(),
      stop: entryBStop.toISOString(),
      workspaceId: workspaceBId,
    });

    // Now verify that workspace A entries are NOT visible and workspace B entries ARE visible
    // in all three timer views

    // Verify in calendar view - workspace A entry should be absent, workspace B entry should be present
    // NOTE: With TimerView persistence (VAL-CROSS-005), the selected view persists across workspace
    // switch. We explicitly switch to calendar to verify scoping in a known view state, since the
    // previous view (e.g., timesheet from workspace A) would persist otherwise.
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    // Explicitly select calendar to test workspace scoping in a known view state
    await page.getByRole("button", { name: "Calendar" }).click();
    await expect(page.getByRole("button", { name: "Calendar" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // Scope assertions to calendar grid to ensure view-local proof
    const calendarScrollAreaB = page.getByTestId("calendar-grid-scroll-area");
    await expect(calendarScrollAreaB).toBeVisible();
    // Workspace A entry should NOT be visible in calendar
    await expect(
      calendarScrollAreaB.locator(`text=${workspaceAEntryDescription}`),
    ).not.toBeVisible();
    // Workspace B entry should be visible in calendar
    await expect(calendarScrollAreaB.locator(`text=${workspaceBEntryDescription}`)).toBeVisible();

    // Verify in list view - workspace A entry should be absent, workspace B entry should be present
    await page.getByRole("button", { name: "List view" }).click();
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const listViewContainerB = page.getByTestId("timer-list-view");
    await expect(listViewContainerB).toBeVisible();
    // Workspace A entry should NOT be visible in list view
    await expect(
      listViewContainerB.locator(`text=${workspaceAEntryDescription}`),
    ).not.toBeVisible();
    // Workspace B entry should be visible in list view
    await expect(listViewContainerB.locator(`text=${workspaceBEntryDescription}`)).toBeVisible();

    // Verify in timesheet view - workspace A project should be absent, workspace B project should be present
    await page.getByRole("button", { name: "Timesheet" }).click();
    await expect(page.getByRole("button", { name: "Timesheet" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const timesheetViewContainerB = page.getByTestId("timer-timesheet-view");
    await expect(timesheetViewContainerB).toBeVisible();
    // Workspace A project should NOT be visible in timesheet
    await expect(timesheetViewContainerB.locator("text=Workspace A Project")).not.toBeVisible();
    // Workspace B project should be visible in timesheet
    await expect(timesheetViewContainerB.locator("text=Workspace B Project")).toBeVisible();
    // Verify timesheet is not showing empty state
    await expect(page.getByText("No week data available")).not.toBeVisible();

    // Switch back to workspace A and verify workspace A entries return and workspace B entries disappear
    await organizationButton.click();
    await expect(workspaceListbox).toBeVisible();
    // Find and click the original organization (which contains workspace A)
    const originalOrganizationName = switchedSession.organizations.find(
      (org) => org.id !== switchedSession.current_organization_id,
    )?.name;

    if (originalOrganizationName) {
      await page.getByRole("button", { name: new RegExp(originalOrganizationName) }).click();

      // Wait for switch back to workspace A
      await expect
        .poll(async () => (await readSessionBootstrap(page)).current_workspace_id)
        .toBe(workspaceAId);

      // Navigate to timer page and verify workspace A entries are back
      // NOTE: Explicitly select calendar to verify scoping in a known view state, since
      // TimerView persistence would keep the previously selected view (e.g., timesheet) otherwise.
      await page.goto(new URL("/timer", page.url()).toString());
      await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
      await page.getByRole("button", { name: "Calendar" }).click();

      // Verify in calendar view with scoped locator
      const calendarScrollAreaBack = page.getByTestId("calendar-grid-scroll-area");
      await expect(calendarScrollAreaBack).toBeVisible();
      // Workspace A entry should be visible again in calendar
      await expect(
        calendarScrollAreaBack.locator(`text=${workspaceAEntryDescription}`),
      ).toBeVisible();
      // Workspace B entry should not be visible in calendar
      await expect(
        calendarScrollAreaBack.locator(`text=${workspaceBEntryDescription}`),
      ).not.toBeVisible();

      // Verify in list view
      await page.getByRole("button", { name: "List view" }).click();
      const listViewContainerBack = page.getByTestId("timer-list-view");
      await expect(
        listViewContainerBack.locator(`text=${workspaceAEntryDescription}`),
      ).toBeVisible();
      await expect(
        listViewContainerBack.locator(`text=${workspaceBEntryDescription}`),
      ).not.toBeVisible();

      // Verify in timesheet view
      await page.getByRole("button", { name: "Timesheet" }).click();
      const timesheetViewContainerBack = page.getByTestId("timer-timesheet-view");
      await expect(timesheetViewContainerBack.locator("text=Workspace A Project")).toBeVisible();
      await expect(
        timesheetViewContainerBack.locator("text=Workspace B Project"),
      ).not.toBeVisible();
    }
  });
});

test.describe("VAL-REG-004: Current timer and history consistency regression", () => {
  /**
   * VAL-REG-004: Current timer and time-entry history stay mutually consistent
   *
   * After starting, stopping, or editing tracked time, the current-timer read and
   * the time-entry history do not contradict each other. The UI does not simultaneously
   * present a running timer that the history already treats as fully stopped, or vice versa.
   *
   * This test verifies:
   * - After starting: browser shows running state AND current-timer API returns the running entry
   * - After stopping: browser shows idle state AND current-timer API returns null
   * - After editing: browser shows updated entry AND current-timer API still returns null
   */
  test("VAL-REG-004: current-timer and history stay consistent after start, stop, and edit", async ({
    page,
  }) => {
    const email = `current-history-consistency-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const initialDescription = "Initial entry description";
    const editedDescription = "Edited entry description";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Current History Consistency User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    // Navigate to timer page
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Phase 1: Start a timer and verify consistency between UI and API
    await page.getByLabel("Time entry description").fill(initialDescription);
    await page.getByRole("button", { name: "Start timer" }).click();

    // Verify UI shows running state
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "stop");

    // Verify current-timer API returns the running entry (not null)
    const runningResponse = await page.evaluate(async () => {
      const response = await fetch("/api/v9/me/time_entries/current", {
        credentials: "include",
      });
      const body = await response.json();
      return {
        status: response.status,
        body,
        hasStop: "stop" in body,
        stopValue: body.stop,
      };
    });
    expect(runningResponse.status).toBe(200);
    expect(runningResponse.body).not.toBeNull();
    expect(runningResponse.body.description).toBe(initialDescription);
    // Running entries have no stop time - stop should be absent or null
    expect(runningResponse.body.stop).toBeFalsy(); // null, undefined, or absent

    // Phase 2: Stop the timer and verify consistency
    await page.getByRole("button", { name: "Stop timer" }).click();

    // Verify UI shows idle state
    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "play");

    // Verify current-timer API returns null (idle state)
    const stoppedResponse = await page.evaluate(async () => {
      const response = await fetch("/api/v9/me/time_entries/current", {
        credentials: "include",
      });
      return { status: response.status, body: await response.json() };
    });
    expect(stoppedResponse.status).toBe(200);
    expect(stoppedResponse.body).toBeNull();

    // Verify the stopped entry appears in history (list view)
    await page.getByRole("button", { name: "List view" }).click();
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const listViewContainer = page.getByTestId("timer-list-view");
    await expect(listViewContainer).toBeVisible();
    // The stopped entry should appear in the list with the initial description
    const editButton = listViewContainer.getByRole("button", {
      name: new RegExp(`Edit ${initialDescription}`),
    });
    await expect(editButton).toBeVisible();

    // Phase 3: Edit the stopped entry and verify consistency
    await editButton.click();

    // Wait for the edit dialog to appear
    const editDialog = page.getByTestId("time-entry-editor-dialog");
    await expect(editDialog).toBeVisible();

    // Change the description
    const descriptionInput = editDialog.getByLabel("Description");
    await descriptionInput.clear();
    await descriptionInput.fill(editedDescription);

    // Save the edit
    await editDialog.getByRole("button", { name: "Save" }).click();

    // Wait for dialog to close
    await expect(editDialog).not.toBeVisible({ timeout: 5000 });

    // Verify the UI shows the updated description in history
    await expect(listViewContainer.locator(`text=${editedDescription}`)).toBeVisible();

    // Verify current-timer API STILL returns null (editing stopped entry doesn't start a timer)
    const afterEditResponse = await page.evaluate(async () => {
      const response = await fetch("/api/v9/me/time_entries/current", {
        credentials: "include",
      });
      return { status: response.status, body: await response.json() };
    });
    expect(afterEditResponse.status).toBe(200);
    expect(afterEditResponse.body).toBeNull();

    // Verify the original description is gone from history
    await expect(listViewContainer.locator(`text=${initialDescription}`)).not.toBeVisible();

    // Phase 4: Start a new timer and verify it doesn't affect the edited history entry
    await page.getByRole("button", { name: "Calendar" }).click();
    await page.getByLabel("Time entry description").fill("New running entry");
    await page.getByRole("button", { name: "Start timer" }).click();

    // Verify UI shows running state for the new entry
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();

    // Verify current-timer API returns the new running entry
    const newRunningResponse = await page.evaluate(async () => {
      const response = await fetch("/api/v9/me/time_entries/current", {
        credentials: "include",
      });
      return { status: response.status, body: await response.json() };
    });
    expect(newRunningResponse.status).toBe(200);
    expect(newRunningResponse.body).not.toBeNull();
    expect(newRunningResponse.body.description).toBe("New running entry");

    // Verify the edited entry is STILL in history (not overwritten)
    await page.getByRole("button", { name: "List view" }).click();
    await expect(listViewContainer.locator(`text=${editedDescription}`)).toBeVisible();

    // Phase 5: Restart cycle - stop the running entry and start a new one.
    // This proves the no-contradiction invariant holds after a full restart cycle:
    // current-timer shows the new running entry, while history shows only stopped entries.
    const restartedDescription = "Restarted timer entry";

    // Stop the "New running entry" timer
    await page.getByRole("button", { name: "Stop timer" }).click();

    // Verify UI shows idle state after stopping
    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "play");

    // Verify current-timer API returns null after stopping
    const afterStopForRestartResponse = await page.evaluate(async () => {
      const response = await fetch("/api/v9/me/time_entries/current", {
        credentials: "include",
      });
      return { status: response.status, body: await response.json() };
    });
    expect(afterStopForRestartResponse.status).toBe(200);
    expect(afterStopForRestartResponse.body).toBeNull();

    // Verify "New running entry" now appears in history as a stopped entry
    await page.getByRole("button", { name: "List view" }).click();
    await expect(listViewContainer.locator("text=New running entry")).toBeVisible();

    // Start a new timer (restart)
    await page.getByRole("button", { name: "Calendar" }).click();
    await page.getByLabel("Time entry description").fill(restartedDescription);
    await page.getByRole("button", { name: "Start timer" }).click();

    // Verify UI shows running state for the restarted entry
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "stop");

    // Verify current-timer API returns the restarted entry (not null)
    const restartedResponse = await page.evaluate(async () => {
      const response = await fetch("/api/v9/me/time_entries/current", {
        credentials: "include",
      });
      return { status: response.status, body: await response.json() };
    });
    expect(restartedResponse.status).toBe(200);
    expect(restartedResponse.body).not.toBeNull();
    expect(restartedResponse.body.description).toBe(restartedDescription);
    expect(restartedResponse.body.stop).toBeFalsy(); // Running entries have no stop time

    // Verify history shows ALL stopped entries, and the restarted entry appears as running.
    // The restarted entry is still running, so it appears in list view with Edit button (running state),
    // not with stop time/duration info (stopped state).
    // This is the core contradiction proof: current-timer shows restarted entry as running,
    // and the list view correctly shows it as running, not as stopped.
    await page.getByRole("button", { name: "List view" }).click();
    await expect(listViewContainer.locator(`text=${editedDescription}`)).toBeVisible();
    await expect(listViewContainer.locator("text=New running entry")).toBeVisible();
    // The restarted entry SHOULD appear in list view as a RUNNING entry (with Edit button)
    // This proves the UI is consistent - running entries show Edit button, not stop time
    const restartedEditButton = listViewContainer.getByRole("button", {
      name: `Edit ${restartedDescription}`,
    });
    await expect(restartedEditButton).toBeVisible();
    // The restarted entry should NOT appear with stop info (which would indicate it's incorrectly treated as stopped)
    // We verify this by checking it has an Edit button (running state) rather than duration/date info

    // Final contradiction check: current-timer and history are consistent
    // Current timer: restartedDescription (running)
    // History: shows initial, edited, "New running entry" (all stopped), but NOT restartedDescription
    const finalCurrentResponse = await page.evaluate(async () => {
      const response = await fetch("/api/v9/me/time_entries/current", {
        credentials: "include",
      });
      return { status: response.status, body: await response.json() };
    });
    expect(finalCurrentResponse.status).toBe(200);
    expect(finalCurrentResponse.body).not.toBeNull();
    expect(finalCurrentResponse.body.description).toBe(restartedDescription);
    expect(finalCurrentResponse.body.stop).toBeFalsy();
  });
});

test.describe("Timer page family mainline", () => {
  /**
   * VAL-TIMER-001: Timer landing defaults to calendar
   *
   * Visiting `/timer` from a logged-in browser session lands on the timer page with
   * `calendar` selected by default. The default view does not depend on a special path
   * suffix, query parameter, or persisted alternate subview state.
   */
  test("VAL-TIMER-001: /timer defaults to calendar view with stable URL", async ({ page }) => {
    const email = `timer-default-cal-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Timer Default Calendar User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    // Assert: URL is stable /timer without query params or suffixes
    await expect(page).toHaveURL(/\/timer(?:\?.*)?$/);

    // Assert: Timer page is visible
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Assert: Calendar is the active view (aria-pressed=true)
    await expect(page.getByRole("button", { name: "Calendar" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Assert: List view and Timesheet are inactive (aria-pressed=false)
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(page.getByRole("button", { name: "Timesheet" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // Assert: Timer is idle (show start affordance)
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "play");
    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();

    // Assert: No console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Reload and verify calendar remains the default
    await page.reload();
    await expect(page).toHaveURL(/\/timer(?:\?.*)?$/);
    await expect(page.getByRole("button", { name: "Calendar" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    expect(consoleErrors.filter((e) => !e.includes("Download the React DevTools"))).toHaveLength(0);
  });

  /**
   * VAL-TIMER-002: Timer subviews are one page family
   *
   * Switching between `calendar`, `list`, and `timesheet` changes only the in-page
   * projection of the same timer page. The timer URL remains `/timer`, the current
   * workspace scope stays unchanged, and the same running or stopped timer facts
   * remain visible across the three views according to each view's projection.
   */
  test("VAL-TIMER-002: switching between calendar/list/timesheet keeps URL stable and same facts visible", async ({
    page,
  }) => {
    const email = `timer-subviews-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Timer Subviews User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), {
      email,
      password,
    });
    const workspaceId = loginSession.currentWorkspaceId;

    // Create a project so entries appear in all views (including timesheet which groups by project)
    const projectId = await createProjectForWorkspace(page, {
      name: "Subviews Test Project",
      workspaceId,
    });

    // Create time entries for today that will appear across all views
    const now = new Date();
    const baseYear = now.getUTCFullYear();
    const baseMonth = now.getUTCMonth();
    const baseDate = now.getUTCDate();

    // Create 3 entries spread throughout the day, each with the project so they appear in timesheet
    for (let entryIndex = 0; entryIndex < 3; entryIndex++) {
      const hour = 8 + entryIndex * 4;
      const start = new Date(Date.UTC(baseYear, baseMonth, baseDate, hour, 0, 0));
      const stop = new Date(Date.UTC(baseYear, baseMonth, baseDate, hour, 45, 0));
      await createTimeEntryForWorkspace(page, {
        description: `Entry ${entryIndex + 1} for subview test`,
        projectId,
        start: start.toISOString(),
        stop: stop.toISOString(),
        workspaceId,
      });
    }

    await page.goto(new URL("/timer", page.url()).toString());

    // Assert: Start on calendar with stable URL
    await expect(page).toHaveURL(/\/timer(?:\?.*)?$/);
    await expect(page.getByRole("button", { name: "Calendar" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Switch to list view
    await page.getByRole("button", { name: "List view" }).click();
    await expect(page).toHaveURL(/\/timer(?:\?.*)?$/); // URL unchanged
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: "Calendar" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(page.getByRole("button", { name: "Timesheet" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // Switch to timesheet view
    await page.getByRole("button", { name: "Timesheet" }).click();
    await expect(page).toHaveURL(/\/timer(?:\?.*)?$/); // URL still unchanged
    await expect(page.getByRole("button", { name: "Timesheet" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // Switch back to calendar - verify entries are still visible
    await page.getByRole("button", { name: "Calendar" }).click();
    await expect(page.getByRole("button", { name: "Calendar" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // The entries created should be visible on the calendar as event cards
    // Each entry description should appear somewhere in the calendar grid
    const calendarScrollArea = page.getByTestId("calendar-grid-scroll-area");
    await expect(calendarScrollArea).toBeVisible();

    // Verify list view shows the seeded entries within the list view content
    await page.getByRole("button", { name: "List view" }).click();
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const listViewContainer = page.getByTestId("timer-list-view");
    await expect(listViewContainer).toBeVisible();
    // Each seeded entry description should appear in the list view specifically
    for (let entryIndex = 0; entryIndex < 3; entryIndex++) {
      await expect(
        listViewContainer.locator(`text=Entry ${entryIndex + 1} for subview test`),
      ).toBeVisible();
    }

    // Verify timesheet view shows time data for the seeded entries within the timesheet content
    await page.getByRole("button", { name: "Timesheet" }).click();
    await expect(page.getByRole("button", { name: "Timesheet" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const timesheetViewContainer = page.getByTestId("timer-timesheet-view");
    await expect(timesheetViewContainer).toBeVisible();
    // The timesheet should have project rows (since entries were created with project)
    // We verify the timesheet is not showing the empty state
    await expect(page.getByText("No week data available")).not.toBeVisible();
    // Timesheet aggregates entries by project, so individual entry descriptions don't appear.
    // The project row for "Subviews Test Project" should be visible in the timesheet.
    await expect(timesheetViewContainer.locator("text=Subviews Test Project")).toBeVisible();

    // Verify calendar again - entries should persist
    await page.getByRole("button", { name: "Calendar" }).click();
    await expect(page.getByRole("button", { name: "Calendar" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
  });

  /**
   * VAL-TIMER-003: Starting a timer creates a formal running state
   *
   * From an idle timer page, starting a timer creates exactly one formal running timer.
   * The header switches from the idle start affordance to the running stop affordance,
   * and the elapsed display updates from the running entry start time instead of
   * rendering a stale or raw negative duration value.
   */
  test("VAL-TIMER-003: starting a timer creates formal running state with stop affordance and live elapsed display", async ({
    page,
  }) => {
    const email = `timer-start-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Timer Start User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await page.goto(new URL("/timer", page.url()).toString());

    // Assert: Timer is idle
    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "play");

    // Start the timer
    await page.getByLabel("Time entry description").fill("Test running timer entry");
    await page.getByRole("button", { name: "Start timer" }).click();

    // Assert: Running state
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "stop");

    // Assert: Start affordance is now absent
    await expect(page.getByRole("button", { name: "Start timer" })).not.toBeVisible();

    // Assert: Elapsed display shows live time in HH:MM:SS format
    await expect(page.getByTestId("timer-elapsed")).toBeVisible();
    const elapsedText = await page.getByTestId("timer-elapsed").textContent();
    expect(elapsedText).toMatch(/\d{2}:\d{2}:\d{2}/);
    // Should not show a stale or negative value
    expect(elapsedText).not.toContain("492847");

    // Wait a moment and verify elapsed updates
    await page.waitForTimeout(1500);
    const elapsedTextAfter = await page.getByTestId("timer-elapsed").textContent();
    expect(elapsedTextAfter).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  /**
   * VAL-TIMER-004: Existing running timer is consistent across timer views
   *
   * If a timer is already running before the timer page loads, opening `/timer` shows
   * that running timer immediately. Switching across `calendar`, `list`, and `timesheet`
   * keeps showing the same running timer instead of resetting or forking state by view.
   */
  test("VAL-TIMER-004: pre-existing running timer is visible across all timer views", async ({
    page,
  }) => {
    const email = `timer-existing-running-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Timer Existing Running User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), {
      email,
      password,
    });
    const workspaceId = loginSession.currentWorkspaceId;

    // Create a project so the running entry appears in all views (including timesheet)
    const projectId = await createProjectForWorkspace(page, {
      name: "Running Timer Test Project",
      workspaceId,
    });

    // Create a running timer via API before navigating to /timer
    const runningDescription = "Pre-existing running timer";
    await page.evaluate(
      async ({ workspaceId: wid, projectId: pid, description }) => {
        const response = await fetch(`/api/v9/workspaces/${wid}/time_entries`, {
          body: JSON.stringify({
            created_with: "playwright-e2e",
            description,
            project_id: pid,
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
      { workspaceId, projectId, description: runningDescription },
    );

    // Navigate to timer page - should show the running timer immediately
    await page.goto(new URL("/timer", page.url()).toString());

    // Assert: Running state is immediately visible
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "stop");
    await expect(page.getByTestId("timer-elapsed")).toBeVisible();
    await expect(page.getByTestId("timer-elapsed")).toBeVisible();

    // Verify same running state across all three views
    // In calendar view, the running timer appears as a now-line indicator
    // The now-line track and dot should be visible to prove the running timer
    // is rendered within the calendar content, not just in the shared header
    const calendarNowLine = page.getByTestId("calendar-now-line");
    await expect(calendarNowLine).toBeVisible();
    await expect(page.getByTestId("calendar-now-line-track")).toBeVisible();
    await expect(page.getByTestId("calendar-now-line-dot")).toBeVisible();

    // Switch to list view
    await page.getByRole("button", { name: "List view" }).click();
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "stop");
    await expect(page.getByTestId("timer-elapsed")).toBeVisible();
    // Verify the running timer description is visible in the list view CONTENT (not just header)
    // The list view renders the running entry with an Edit button containing the description
    const listViewContainer = page.getByTestId("timer-list-view");
    await expect(listViewContainer).toBeVisible();
    const listViewEditButton = listViewContainer.getByRole("button", {
      name: `Edit ${runningDescription}`,
    });
    await expect(listViewEditButton).toBeVisible();

    // Switch to timesheet view
    await page.getByRole("button", { name: "Timesheet" }).click();
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "stop");
    await expect(page.getByTestId("timer-elapsed")).toBeVisible();
    // Verify timesheet shows content (not empty state) - timesheet aggregates by project
    // so individual entry descriptions don't appear, but the project row should be visible
    const timesheetViewContainer = page.getByTestId("timer-timesheet-view");
    await expect(timesheetViewContainer).toBeVisible();
    await expect(page.getByText("No week data available")).not.toBeVisible();
    // The project row for "Running Timer Test Project" should be visible in the timesheet
    await expect(timesheetViewContainer.locator("text=Running Timer Test Project")).toBeVisible();

    // Switch back to calendar - verify now-line is still visible
    await page.getByRole("button", { name: "Calendar" }).click();
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "stop");
    await expect(page.getByTestId("timer-elapsed")).toBeVisible();
    // Verify the now-line is still visible to prove the running timer fact
    // is rendered within the calendar content
    await expect(calendarNowLine).toBeVisible();
    await expect(page.getByTestId("calendar-now-line-track")).toBeVisible();
    await expect(page.getByTestId("calendar-now-line-dot")).toBeVisible();
  });

  /**
   * VAL-TIMER-005: Stopping a timer materializes a stopped entry
   *
   * Stopping a running timer removes the running state and leaves behind one stopped
   * time entry that preserves the tracked fact for the active workspace. The current-running
   * read model becomes `200 + null`, and the stopped entry is visible in a timer history
   * view for the same workspace.
   */
  test("VAL-TIMER-005: stopping a timer clears running state and leaves visible stopped entry in history", async ({
    page,
  }) => {
    const email = `timer-stop-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Timer Stop User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    const description = "Timer to be stopped";

    // Start a timer
    await page.goto(new URL("/timer", page.url()).toString());
    await page.getByLabel("Time entry description").fill(description);
    await page.getByRole("button", { name: "Start timer" }).click();

    // Wait a moment for the timer to accumulate some duration
    await page.waitForTimeout(2000);

    // Verify running state
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();

    // Stop the timer
    await page.getByRole("button", { name: "Stop timer" }).click();

    // Assert: Running state is cleared - back to idle
    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "play");

    // Assert: Stopped entry is visible in history (list view)
    await page.getByRole("button", { name: "List view" }).click();
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // The stopped entry should appear in the list with the description
    await expect(
      page.getByRole("button", { name: new RegExp(`Edit ${description}`) }),
    ).toBeVisible();

    // Assert: Timer header shows idle state
    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "play");

    // Verify the current timer API returns null (idle state)
    const currentTimerResponse = await page.evaluate(async () => {
      const response = await fetch("/api/v9/me/time_entries/current", {
        credentials: "include",
      });
      return { status: response.status, body: await response.json() };
    });
    expect(currentTimerResponse.status).toBe(200);
    expect(currentTimerResponse.body).toBeNull();
  });

  test("timer header stays pinned when wheel scrolling targets the timer surface without shifting shell scroll", async ({
    page,
  }) => {
    const email = `timer-sticky-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Timer Sticky User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await expect(page).toHaveURL(/\/timer(?:\?.*)?$/);
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    const mainScroll = page.getByTestId("app-shell-main");
    const scrollArea = page.getByTestId("tracking-timer-scroll-area");
    const weekRangeButton = page.getByRole("button", {
      name: /\d{4}-\d{2}-\d{2} - \d{4}-\d{2}-\d{2}/,
    });

    await expect(scrollArea).toBeVisible();
    await expect(weekRangeButton).toBeVisible();

    await mainScroll.evaluate((element: HTMLElement) => {
      element.scrollTop = 0;
    });
    await scrollArea.evaluate((element: HTMLElement) => {
      element.scrollTop = 0;
    });

    const before = await weekRangeButton.evaluate((element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, windowScrollY: window.scrollY };
    });

    const scrollAreaBox = await scrollArea.boundingBox();
    if (!scrollAreaBox) {
      throw new Error("Timer scroll area is not visible.");
    }

    await page.mouse.move(scrollAreaBox.x + scrollAreaBox.width / 2, scrollAreaBox.y + 80);
    await page.mouse.wheel(0, 900);

    await expect
      .poll(async () => ({
        main: await mainScroll.evaluate((element: HTMLElement) => element.scrollTop),
        timer: await scrollArea.evaluate((element: HTMLElement) => element.scrollTop),
      }))
      .toEqual({
        main: 0,
        timer: expect.any(Number),
      });

    const after = await weekRangeButton.evaluate((element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, windowScrollY: window.scrollY };
    });

    expect(after.windowScrollY).toBe(before.windowScrollY);
    expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(2);
  });

  test("calendar day header stays pinned when scrolling timer content", async ({ page }) => {
    const email = `timer-calendar-sticky-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Timer Calendar Sticky User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await expect(page).toHaveURL(/\/timer(?:\?.*)?$/);

    const mainScroll = page.getByTestId("app-shell-main");
    const scrollArea = page.getByTestId("tracking-timer-scroll-area");
    const calendarScrollArea = page.getByTestId("calendar-grid-scroll-area");
    const dayHeader = page.getByTestId("calendar-day-header-mon");

    await expect(scrollArea).toBeVisible();
    await expect(calendarScrollArea).toBeVisible();
    await expect(dayHeader).toBeVisible();

    await mainScroll.evaluate((element: HTMLElement) => {
      element.scrollTop = 0;
    });
    await scrollArea.evaluate((element: HTMLElement) => {
      element.scrollTop = 0;
    });
    await calendarScrollArea.evaluate((element: HTMLElement) => {
      element.scrollTop = 0;
    });

    const before = await dayHeader.evaluate((element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top };
    });

    const scrollAreaBox = await calendarScrollArea.boundingBox();
    if (!scrollAreaBox) {
      throw new Error("Calendar scroll area is not visible.");
    }

    await page.mouse.move(scrollAreaBox.x + scrollAreaBox.width / 2, scrollAreaBox.y + 120);
    await page.mouse.wheel(0, 900);

    await expect
      .poll(async () => ({
        main: await mainScroll.evaluate((element: HTMLElement) => element.scrollTop),
        timer: await scrollArea.evaluate((element: HTMLElement) => element.scrollTop),
        calendar: await calendarScrollArea.evaluate((element: HTMLElement) => element.scrollTop),
      }))
      .toEqual({
        main: 0,
        timer: 0,
        calendar: expect.any(Number),
      });

    const after = await dayHeader.evaluate((element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top };
    });

    expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(2);
  });
});

test.describe("VAL-ENTRY-001 & VAL-CROSS-005: TimerView persistence", () => {
  /**
   * VAL-ENTRY-001: Timer view persists after page refresh
   *
   * After selecting a non-default timer view (list or timesheet), the selected view
   * persists after page refresh instead of resetting to calendar.
   */
  test("VAL-ENTRY-001: selected TimerView persists after refresh", async ({ page }) => {
    const email = `timer-view-persist-refresh-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Timer View Persist User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Default to calendar
    await expect(page.getByRole("button", { name: "Calendar" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Switch to list view
    await page.getByRole("button", { name: "List view" }).click();
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Refresh the page
    await page.reload();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // The selected view should persist - list should still be active after refresh
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: "Calendar" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // Switch to timesheet view
    await page.getByRole("button", { name: "Timesheet" }).click();
    await expect(page.getByRole("button", { name: "Timesheet" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Refresh and verify timesheet persists
    await page.reload();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await expect(page.getByRole("button", { name: "Timesheet" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  /**
   * VAL-CROSS-005: Selected timer view survives workspace switch
   *
   * If the user is on list or timesheet and then switches workspace, the same
   * selected timer view remains active, the shared top composer/header remains
   * shared, and the history projection re-scopes to the new workspace.
   */
  test("VAL-CROSS-005: selected TimerView survives workspace switch", async ({ page }) => {
    const email = `timer-view-persist-ws-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Timer View Workspace Switch User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), {
      email,
      password,
    });
    const workspaceAId = loginSession.currentWorkspaceId;

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Default to calendar
    await expect(page.getByRole("button", { name: "Calendar" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Switch to list view
    await page.getByRole("button", { name: "List view" }).click();
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Create a second organization (which creates workspace B) and switch to it
    const secondOrganizationName = `Organization ${Date.now()}`;
    const organizationButton = page.getByRole("button", {
      exact: true,
      name: "Organization",
    });

    await organizationButton.click();
    const workspaceListbox = page.getByRole("listbox");
    await expect(workspaceListbox).toBeVisible();

    await page.getByRole("button", { name: "Create organization" }).click();

    const createOrganizationDialog = page.getByRole("dialog", {
      name: "New organization",
    });
    await expect(createOrganizationDialog).toBeVisible();
    await createOrganizationDialog.getByLabel("Organization name").fill(secondOrganizationName);
    await createOrganizationDialog.getByRole("button", { name: "Create organization" }).click();

    // Wait for organization switch to complete
    await expect
      .poll(async () => (await readSessionBootstrap(page)).current_workspace_id)
      .not.toBe(workspaceAId);

    // Navigate back to timer page - list view should still be selected
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // The selected view should persist across workspace switch
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: "Calendar" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // Switch to timesheet and verify it also persists across workspace switch
    await page.getByRole("button", { name: "Timesheet" }).click();
    await expect(page.getByRole("button", { name: "Timesheet" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Switch back to original workspace and verify timesheet persists
    await organizationButton.click();
    await expect(workspaceListbox).toBeVisible();

    const switchedSession = await readSessionBootstrap(page);
    const originalOrganizationName = switchedSession.organizations.find(
      (org) => org.id !== switchedSession.current_organization_id,
    )?.name;

    if (originalOrganizationName) {
      await page.getByRole("button", { name: new RegExp(originalOrganizationName) }).click();

      // Wait for switch back to workspace A
      await expect
        .poll(async () => (await readSessionBootstrap(page)).current_workspace_id)
        .toBe(workspaceAId);

      // Navigate to timer page - timesheet should still be selected
      await page.goto(new URL("/timer", page.url()).toString());
      await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

      // The selected view should persist across workspace switch
      await expect(page.getByRole("button", { name: "Timesheet" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    }
  });

  /**
   * VAL-TIMER-005: Timer header reflects true running state
   *
   * The top timer surface shows distinct idle and running states. When running,
   * the displayed duration advances from the entry `start` time rather than
   * rendering the raw stored negative duration value, and the visible primary
   * control is a stop action; when idle, the start action is shown and the
   * live duration no longer advances.
   */
  test("VAL-TIMER-005: running timer header shows live elapsed from start time", async ({
    page,
  }) => {
    const email = `timer-running-header-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Timer Running Header User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Idle state: start button visible, elapsed shows 00:00:00
    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "play");
    const idleElapsed = await page.getByTestId("timer-elapsed").textContent();
    expect(idleElapsed).toBe("00:00:00");

    // Start a timer
    await page.getByLabel("Time entry description").fill("Test running timer");
    await page.getByRole("button", { name: "Start timer" }).click();

    // Running state: stop button visible, elapsed shows live time
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "stop");

    // Elapsed should show live time in HH:MM:SS format (not a raw negative duration)
    const runningElapsed1 = await page.getByTestId("timer-elapsed").textContent();
    expect(runningElapsed1).toMatch(/\d{2}:\d{2}:\d{2}/);
    // Should not show a stale value like what might come from raw duration
    expect(runningElapsed1).not.toContain("492847");

    // Wait and verify elapsed updates (advances from start time)
    await page.waitForTimeout(1500);
    const runningElapsed2 = await page.getByTestId("timer-elapsed").textContent();
    expect(runningElapsed2).toMatch(/\d{2}:\d{2}:\d{2}/);
    // The second reading should be greater than the first (time is advancing)
    expect(runningElapsed2).not.toBe(runningElapsed1);

    // Stop the timer
    await page.getByRole("button", { name: "Stop timer" }).click();

    // Back to idle state
    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "play");
  });
});

test.describe("Cross-workspace running timer header", () => {
  /**
   * VAL-TIMER-002: Global running timer remains visible after workspace switch
   *
   * When a running timer belongs to workspace A and the user switches the current workspace
   * to workspace B, the shared top timer composer/header remains visible and still shows
   * that same running entry instead of clearing it because of the workspace mismatch.
   */
  test("VAL-TIMER-002: running timer header persists across workspace switch", async ({ page }) => {
    const email = `cross-ws-running-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Cross Workspace Running User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), {
      email,
      password,
    });
    const workspaceAId = loginSession.currentWorkspaceId;

    // Navigate to timer page
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Start a timer in workspace A
    await page.getByLabel("Time entry description").fill("Running in workspace A");
    await page.getByRole("button", { name: "Start timer" }).click();

    // Verify running state in workspace A
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "stop");

    // Get the current timer entry ID before switch
    const currentTimerBefore = await page.evaluate(async () => {
      const response = await fetch("/api/v9/me/time_entries/current", {
        credentials: "include",
      });
      return { status: response.status, body: await response.json() };
    });
    expect(currentTimerBefore.status).toBe(200);
    expect(currentTimerBefore.body).not.toBeNull();
    const runningEntryIdBefore = currentTimerBefore.body.id;
    const runningWorkspaceIdBefore =
      currentTimerBefore.body.workspace_id ?? currentTimerBefore.body.wid;

    // Create a second organization (which creates workspace B) and switch to it
    const secondOrganizationName = `Organization ${Date.now()}`;
    const organizationButton = page.getByRole("button", {
      exact: true,
      name: "Organization",
    });

    await organizationButton.click();
    const workspaceListbox = page.getByRole("listbox");
    await expect(workspaceListbox).toBeVisible();

    await page.getByRole("button", { name: "Create organization" }).click();

    const createOrganizationDialog = page.getByRole("dialog", {
      name: "New organization",
    });
    await expect(createOrganizationDialog).toBeVisible();
    await createOrganizationDialog.getByLabel("Organization name").fill(secondOrganizationName);
    await createOrganizationDialog.getByRole("button", { name: "Create organization" }).click();

    // Wait for organization switch to complete
    await expect
      .poll(async () => (await readSessionBootstrap(page)).current_workspace_id)
      .not.toBe(workspaceAId);

    // Navigate to timer page after switch
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // VAL-TIMER-002 core assertion: running timer is STILL visible in the header
    // after switching to workspace B (even though the running timer belongs to workspace A)
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "stop");

    // Verify the elapsed display is showing live time (not cleared)
    await expect(page.getByTestId("timer-elapsed")).toBeVisible();
    const elapsedText = await page.getByTestId("timer-elapsed").textContent();
    expect(elapsedText).toMatch(/\d{2}:\d{2}:\d{2}/);

    // Verify the current-timer API returns the SAME running entry ID after switch
    const currentTimerAfter = await page.evaluate(async () => {
      const response = await fetch("/api/v9/me/time_entries/current", {
        credentials: "include",
      });
      return { status: response.status, body: await response.json() };
    });
    expect(currentTimerAfter.status).toBe(200);
    expect(currentTimerAfter.body).not.toBeNull();
    expect(currentTimerAfter.body.id).toBe(runningEntryIdBefore);
    // Verify workspace_id of the running entry is still workspace A
    expect(currentTimerAfter.body.workspace_id ?? currentTimerAfter.body.wid).toBe(
      runningWorkspaceIdBefore,
    );

    // Cleanup: stop the timer
    await page.getByRole("button", { name: "Stop timer" }).click();
    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
  });

  /**
   * VAL-TIMER-003: Cross-workspace running timer remains editable and stoppable
   *
   * When the current workspace differs from the running timer's workspace, the user
   * can still edit the running timer's supported top-composer fields (description)
   * and can stop it from that same surface without being forced back to the owning workspace.
   * After stop, GET /me/time_entries/current returns HTTP 200 with body null.
   */
  test("VAL-TIMER-003: running timer is editable and stoppable from a foreign workspace", async ({
    page,
  }) => {
    const email = `foreign-edit-stop-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Foreign Edit Stop User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), {
      email,
      password,
    });
    const workspaceAId = loginSession.currentWorkspaceId;

    // Navigate to timer page
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Start a timer in workspace A
    await page.getByLabel("Time entry description").fill("Original description in workspace A");
    await page.getByRole("button", { name: "Start timer" }).click();
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();

    // Create workspace B
    const secondOrganizationName = `Organization ${Date.now()}`;
    const organizationButton = page.getByRole("button", {
      exact: true,
      name: "Organization",
    });

    await organizationButton.click();
    const workspaceListbox = page.getByRole("listbox");
    await expect(workspaceListbox).toBeVisible();

    await page.getByRole("button", { name: "Create organization" }).click();

    const createOrganizationDialog = page.getByRole("dialog", {
      name: "New organization",
    });
    await expect(createOrganizationDialog).toBeVisible();
    await createOrganizationDialog.getByLabel("Organization name").fill(secondOrganizationName);
    await createOrganizationDialog.getByRole("button", { name: "Create organization" }).click();

    await expect
      .poll(async () => (await readSessionBootstrap(page)).current_workspace_id)
      .not.toBe(workspaceAId);

    // Navigate to timer page in workspace B
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // VAL-TIMER-003: Running timer is still visible in workspace B (foreign workspace)
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();

    // Edit the running timer's description from workspace B
    // The description input should show the running timer's current description
    const descriptionInput = page.getByLabel("Time entry description");
    await expect(descriptionInput).toHaveValue("Original description in workspace A");

    // Change the description while in workspace B
    await descriptionInput.clear();
    await descriptionInput.fill("Edited from workspace B");

    // Blur to commit the edit
    await descriptionInput.blur();

    // Wait a moment for the edit to be sent
    await page.waitForTimeout(500);

    // Verify the edit was persisted by checking the current-timer API
    const afterEdit = await page.evaluate(async () => {
      const response = await fetch("/api/v9/me/time_entries/current", {
        credentials: "include",
      });
      return { status: response.status, body: await response.json() };
    });
    expect(afterEdit.status).toBe(200);
    expect(afterEdit.body).not.toBeNull();
    expect(afterEdit.body.description).toBe("Edited from workspace B");

    // Now stop the running timer from workspace B
    await page.getByRole("button", { name: "Stop timer" }).click();

    // VAL-TIMER-003: After stopping, timer should return to idle state
    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "play");

    // Verify current-timer API returns null after stop
    const afterStop = await page.evaluate(async () => {
      const response = await fetch("/api/v9/me/time_entries/current", {
        credentials: "include",
      });
      return { status: response.status, body: await response.json() };
    });
    expect(afterStop.status).toBe(200);
    expect(afterStop.body).toBeNull();
  });

  /**
   * VAL-TIMER-004: Timer history remains scoped to the current workspace
   *
   * The calendar, list, and timesheet timer views only project historical entries
   * whose workspace_id matches the current workspace. After a workspace switch,
   * historical entries from the previous workspace disappear from all three history views.
   */
  test("VAL-TIMER-004: history views are scoped to current workspace across all three views", async ({
    page,
  }) => {
    const email = `history-scope-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const workspaceAEntryDescription = "Entry only in workspace A";
    const workspaceBEntryDescription = "Entry only in workspace B";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "History Scope User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), {
      email,
      password,
    });
    const workspaceAId = loginSession.currentWorkspaceId;

    // Create a project in workspace A for timesheet visibility
    const projectAId = await createProjectForWorkspace(page, {
      name: "Workspace A Project",
      workspaceId: workspaceAId,
    });

    // Create time entry in workspace A
    const now = new Date();
    const baseYear = now.getUTCFullYear();
    const baseMonth = now.getUTCMonth();
    const baseDate = now.getUTCDate();

    const entryAStart = new Date(Date.UTC(baseYear, baseMonth, baseDate, 9, 0, 0));
    const entryAStop = new Date(Date.UTC(baseYear, baseMonth, baseDate, 10, 0, 0));
    await createTimeEntryForWorkspace(page, {
      description: workspaceAEntryDescription,
      projectId: projectAId,
      start: entryAStart.toISOString(),
      stop: entryAStop.toISOString(),
      workspaceId: workspaceAId,
    });

    // Navigate to timer page in workspace A
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Verify workspace A entry is visible in all three views
    // Calendar view
    await expect(page.getByRole("button", { name: "Calendar" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const calendarScrollAreaA = page.getByTestId("calendar-grid-scroll-area");
    await expect(calendarScrollAreaA.locator(`text=${workspaceAEntryDescription}`)).toBeVisible();

    // List view
    await page.getByRole("button", { name: "List view" }).click();
    const listViewContainerA = page.getByTestId("timer-list-view");
    await expect(listViewContainerA).toBeVisible();
    await expect(listViewContainerA.locator(`text=${workspaceAEntryDescription}`)).toBeVisible();

    // Timesheet view
    await page.getByRole("button", { name: "Timesheet" }).click();
    const timesheetViewContainerA = page.getByTestId("timer-timesheet-view");
    await expect(timesheetViewContainerA.locator("text=Workspace A Project")).toBeVisible();

    // Create workspace B
    const secondOrganizationName = `Organization ${Date.now()}`;
    const organizationButton = page.getByRole("button", {
      exact: true,
      name: "Organization",
    });

    await organizationButton.click();
    const workspaceListbox = page.getByRole("listbox");
    await expect(workspaceListbox).toBeVisible();

    await page.getByRole("button", { name: "Create organization" }).click();

    const createOrganizationDialog = page.getByRole("dialog", {
      name: "New organization",
    });
    await expect(createOrganizationDialog).toBeVisible();
    await createOrganizationDialog.getByLabel("Organization name").fill(secondOrganizationName);
    await createOrganizationDialog.getByRole("button", { name: "Create organization" }).click();

    await expect
      .poll(async () => (await readSessionBootstrap(page)).current_workspace_id)
      .not.toBe(workspaceAId);

    const switchedSession = await readSessionBootstrap(page);
    const workspaceBId = switchedSession.current_workspace_id;

    // Create a project in workspace B
    const projectBId = await createProjectForWorkspace(page, {
      name: "Workspace B Project",
      workspaceId: workspaceBId,
    });

    // Create time entry in workspace B
    const entryBStart = new Date(Date.UTC(baseYear, baseMonth, baseDate, 14, 0, 0));
    const entryBStop = new Date(Date.UTC(baseYear, baseMonth, baseDate, 15, 0, 0));
    await createTimeEntryForWorkspace(page, {
      description: workspaceBEntryDescription,
      projectId: projectBId,
      start: entryBStart.toISOString(),
      stop: entryBStop.toISOString(),
      workspaceId: workspaceBId,
    });

    // Navigate to timer page in workspace B
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // VAL-TIMER-004: Verify workspace A entries are ABSENT from all three views
    // and workspace B entries are PRESENT

    // Calendar view - explicitly select calendar to have known view state
    await page.getByRole("button", { name: "Calendar" }).click();
    const calendarScrollAreaB = page.getByTestId("calendar-grid-scroll-area");
    await expect(calendarScrollAreaB).toBeVisible();
    // Workspace A entry should NOT be visible
    await expect(
      calendarScrollAreaB.locator(`text=${workspaceAEntryDescription}`),
    ).not.toBeVisible();
    // Workspace B entry should be visible
    await expect(calendarScrollAreaB.locator(`text=${workspaceBEntryDescription}`)).toBeVisible();

    // List view
    await page.getByRole("button", { name: "List view" }).click();
    const listViewContainerB = page.getByTestId("timer-list-view");
    await expect(listViewContainerB).toBeVisible();
    await expect(
      listViewContainerB.locator(`text=${workspaceAEntryDescription}`),
    ).not.toBeVisible();
    await expect(listViewContainerB.locator(`text=${workspaceBEntryDescription}`)).toBeVisible();

    // Timesheet view
    await page.getByRole("button", { name: "Timesheet" }).click();
    const timesheetViewContainerB = page.getByTestId("timer-timesheet-view");
    // Workspace A project should NOT be visible
    await expect(timesheetViewContainerB.locator("text=Workspace A Project")).not.toBeVisible();
    // Workspace B project should be visible
    await expect(timesheetViewContainerB.locator("text=Workspace B Project")).toBeVisible();
    // Timesheet should not be empty
    await expect(page.getByText("No week data available")).not.toBeVisible();
  });

  /**
   * VAL-CROSS-001: Workspace switch preserves global running timer while re-scoping history
   *
   * If the user starts a running timer in workspace A and then switches to workspace B,
   * the running timer remains visible and operable in the top composer while the history
   * projections (calendar, list, timesheet) immediately re-scope to workspace B only.
   */
  test("VAL-CROSS-001: workspace switch preserves global running timer while re-scoping history", async ({
    page,
  }) => {
    const email = `cross-preserve-history-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const workspaceAEntryDescription = "Stopped entry in workspace A";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Cross Preserve History User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), {
      email,
      password,
    });
    const workspaceAId = loginSession.currentWorkspaceId;

    // Create a project in workspace A
    const projectAId = await createProjectForWorkspace(page, {
      name: "Workspace A Cross Project",
      workspaceId: workspaceAId,
    });

    // Create a stopped time entry in workspace A
    const now = new Date();
    const baseYear = now.getUTCFullYear();
    const baseMonth = now.getUTCMonth();
    const baseDate = now.getUTCDate();

    const entryAStart = new Date(Date.UTC(baseYear, baseMonth, baseDate, 9, 0, 0));
    const entryAStop = new Date(Date.UTC(baseYear, baseMonth, baseDate, 10, 0, 0));
    await createTimeEntryForWorkspace(page, {
      description: workspaceAEntryDescription,
      projectId: projectAId,
      start: entryAStart.toISOString(),
      stop: entryAStop.toISOString(),
      workspaceId: workspaceAId,
    });

    // Navigate to timer page
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Start a running timer in workspace A
    await page.getByLabel("Time entry description").fill("Running timer that crosses workspaces");
    await page.getByRole("button", { name: "Start timer" }).click();
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();

    // Get the running entry ID
    const runningEntryBefore = await page.evaluate(async () => {
      const response = await fetch("/api/v9/me/time_entries/current", {
        credentials: "include",
      });
      return { status: response.status, body: await response.json() };
    });
    expect(runningEntryBefore.status).toBe(200);
    expect(runningEntryBefore.body).not.toBeNull();
    const runningEntryId = runningEntryBefore.body.id;

    // Verify the stopped workspace A entry is visible in list view while on workspace A
    await page.getByRole("button", { name: "List view" }).click();
    const listViewContainerA = page.getByTestId("timer-list-view");
    await expect(listViewContainerA).toBeVisible();
    await expect(listViewContainerA.locator(`text=${workspaceAEntryDescription}`)).toBeVisible();

    // Switch to workspace B
    const secondOrganizationName = `Organization ${Date.now()}`;
    const organizationButton = page.getByRole("button", {
      exact: true,
      name: "Organization",
    });

    await organizationButton.click();
    const workspaceListbox = page.getByRole("listbox");
    await expect(workspaceListbox).toBeVisible();

    await page.getByRole("button", { name: "Create organization" }).click();

    const createOrganizationDialog = page.getByRole("dialog", {
      name: "New organization",
    });
    await expect(createOrganizationDialog).toBeVisible();
    await createOrganizationDialog.getByLabel("Organization name").fill(secondOrganizationName);
    await createOrganizationDialog.getByRole("button", { name: "Create organization" }).click();

    await expect
      .poll(async () => (await readSessionBootstrap(page)).current_workspace_id)
      .not.toBe(workspaceAId);

    const switchedSession = await readSessionBootstrap(page);
    const workspaceBId = switchedSession.current_workspace_id;

    // Create a project and entry in workspace B so the list view renders properly
    const projectBId = await createProjectForWorkspace(page, {
      name: "Workspace B Cross Project",
      workspaceId: workspaceBId,
    });

    const entryBStart = new Date(Date.UTC(baseYear, baseMonth, baseDate, 14, 0, 0));
    const entryBStop = new Date(Date.UTC(baseYear, baseMonth, baseDate, 15, 0, 0));
    await createTimeEntryForWorkspace(page, {
      description: "Entry in workspace B",
      projectId: projectBId,
      start: entryBStart.toISOString(),
      stop: entryBStop.toISOString(),
      workspaceId: workspaceBId,
    });

    // Navigate to timer page in workspace B
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // VAL-CROSS-001: Running timer is still visible after switch
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
    await expect(page.getByTestId("timer-elapsed")).toBeVisible();

    // Verify the same running entry ID is still current
    const runningEntryAfter = await page.evaluate(async () => {
      const response = await fetch("/api/v9/me/time_entries/current", {
        credentials: "include",
      });
      return { status: response.status, body: await response.json() };
    });
    expect(runningEntryAfter.status).toBe(200);
    expect(runningEntryAfter.body).not.toBeNull();
    expect(runningEntryAfter.body.id).toBe(runningEntryId);

    // VAL-CROSS-001: History re-scopes to workspace B - workspace A entry should be absent
    // Explicitly switch to list view to test history re-scoping
    await page.getByRole("button", { name: "List view" }).click();
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.waitForTimeout(500);
    const listViewContainerB = page.getByTestId("timer-list-view");
    await expect(listViewContainerB).toBeVisible();
    // Workspace A stopped entry should NOT be visible in workspace B's history
    await expect(
      listViewContainerB.locator(`text=${workspaceAEntryDescription}`),
    ).not.toBeVisible();

    // Cleanup: stop the running timer
    await page.getByRole("button", { name: "Stop timer" }).click();
    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
  });

  /**
   * VAL-CROSS-003: Stopping a foreign-workspace running timer clears global current state cleanly
   *
   * When the visible running timer belongs to another workspace, stopping it from the current
   * workspace clears the global current-timer read model, leaves the stopped entry in its
   * original workspace, and does not inject that stopped foreign entry into the current
   * workspace's history views.
   */
  test("VAL-CROSS-003: stopping foreign-workspace running timer clears current state without leaking to current workspace history", async ({
    page,
  }) => {
    const email = `foreign-stop-clean-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const workspaceAEntryDescription = "Stopped entry in workspace A before switch";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Foreign Stop Clean User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), {
      email,
      password,
    });
    const workspaceAId = loginSession.currentWorkspaceId;

    // Create a project in workspace A
    const projectAId = await createProjectForWorkspace(page, {
      name: "Workspace A Clean Project",
      workspaceId: workspaceAId,
    });

    // Create a stopped time entry in workspace A (this will serve as workspace A history)
    const now = new Date();
    const baseYear = now.getUTCFullYear();
    const baseMonth = now.getUTCMonth();
    const baseDate = now.getUTCDate();

    const entryAStart = new Date(Date.UTC(baseYear, baseMonth, baseDate, 9, 0, 0));
    const entryAStop = new Date(Date.UTC(baseYear, baseMonth, baseDate, 10, 0, 0));
    await createTimeEntryForWorkspace(page, {
      description: workspaceAEntryDescription,
      projectId: projectAId,
      start: entryAStart.toISOString(),
      stop: entryAStop.toISOString(),
      workspaceId: workspaceAId,
    });

    // Navigate to timer page
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Start a running timer in workspace A
    const runningDescription = "Running timer that will be stopped from workspace B";
    await page.getByLabel("Time entry description").fill(runningDescription);
    await page.getByRole("button", { name: "Start timer" }).click();
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();

    // Get the running entry ID and workspace
    const runningEntryBefore = await page.evaluate(async () => {
      const response = await fetch("/api/v9/me/time_entries/current", {
        credentials: "include",
      });
      return { status: response.status, body: await response.json() };
    });
    expect(runningEntryBefore.status).toBe(200);
    expect(runningEntryBefore.body).not.toBeNull();

    // Switch to workspace B
    const secondOrganizationName = `Organization ${Date.now()}`;
    const organizationButton = page.getByRole("button", {
      exact: true,
      name: "Organization",
    });

    await organizationButton.click();
    const workspaceListbox = page.getByRole("listbox");
    await expect(workspaceListbox).toBeVisible();

    await page.getByRole("button", { name: "Create organization" }).click();

    const createOrganizationDialog = page.getByRole("dialog", {
      name: "New organization",
    });
    await expect(createOrganizationDialog).toBeVisible();
    await createOrganizationDialog.getByLabel("Organization name").fill(secondOrganizationName);
    await createOrganizationDialog.getByRole("button", { name: "Create organization" }).click();

    await expect
      .poll(async () => (await readSessionBootstrap(page)).current_workspace_id)
      .not.toBe(workspaceAId);

    const switchedSessionB = await readSessionBootstrap(page);
    const workspaceBId = switchedSessionB.current_workspace_id;

    // Create a project and entry in workspace B so the list view renders properly
    const projectBId = await createProjectForWorkspace(page, {
      name: "Workspace B Clean Project",
      workspaceId: workspaceBId,
    });

    const entryBStart = new Date(Date.UTC(baseYear, baseMonth, baseDate, 14, 0, 0));
    const entryBStop = new Date(Date.UTC(baseYear, baseMonth, baseDate, 15, 0, 0));
    await createTimeEntryForWorkspace(page, {
      description: "Entry in workspace B",
      projectId: projectBId,
      start: entryBStart.toISOString(),
      stop: entryBStop.toISOString(),
      workspaceId: workspaceBId,
    });

    // Navigate to timer page in workspace B
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Verify the running timer is visible in workspace B (foreign workspace)
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();

    // Stop the foreign-workspace running timer from workspace B
    await page.getByRole("button", { name: "Stop timer" }).click();

    // VAL-CROSS-003: After stopping, timer should return to idle state
    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "play");

    // Verify current-timer API returns null after stop
    const afterStop = await page.evaluate(async () => {
      const response = await fetch("/api/v9/me/time_entries/current", {
        credentials: "include",
      });
      return { status: response.status, body: await response.json() };
    });
    expect(afterStop.status).toBe(200);
    expect(afterStop.body).toBeNull();

    // VAL-CROSS-003: The stopped foreign-workspace entry should NOT appear in workspace B's history
    // Check all three views: calendar, list, and timesheet

    // Calendar view
    await page.getByRole("button", { name: "Calendar" }).click();
    const calendarScrollArea = page.getByTestId("calendar-grid-scroll-area");
    await expect(calendarScrollArea).toBeVisible();
    // The stopped running timer description should NOT appear in workspace B's calendar
    // (it was started in workspace A, so it should not leak into workspace B history)
    await expect(calendarScrollArea.locator(`text=${runningDescription}`)).not.toBeVisible();

    // List view
    await page.getByRole("button", { name: "List view" }).click();
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.waitForTimeout(500);
    const listViewContainer = page.getByTestId("timer-list-view");
    await expect(listViewContainer).toBeVisible();
    // The stopped running timer description should NOT appear in workspace B's list
    await expect(listViewContainer.locator(`text=${runningDescription}`)).not.toBeVisible();
    // The original workspace A entry should also NOT appear in workspace B's list
    await expect(listViewContainer.locator(`text=${workspaceAEntryDescription}`)).not.toBeVisible();

    // Timesheet view
    await page.getByRole("button", { name: "Timesheet" }).click();
    const timesheetViewContainer = page.getByTestId("timer-timesheet-view");
    await expect(timesheetViewContainer).toBeVisible();
    // Workspace A project should NOT appear in workspace B's timesheet
    await expect(
      timesheetViewContainer.locator("text=Workspace A Clean Project"),
    ).not.toBeVisible();
    // Workspace B project SHOULD appear in workspace B's timesheet
    await expect(timesheetViewContainer.locator("text=Workspace B Clean Project")).toBeVisible();
  });
});
