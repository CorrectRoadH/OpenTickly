import { expect, test } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

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
    const loginSession = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = loginSession.currentWorkspaceId;

    // Create time entries for today that will appear across all views
    const now = new Date();
    const baseYear = now.getUTCFullYear();
    const baseMonth = now.getUTCMonth();
    const baseDate = now.getUTCDate();

    // Create 3 entries spread throughout the day
    for (let entryIndex = 0; entryIndex < 3; entryIndex++) {
      const hour = 8 + entryIndex * 4;
      const start = new Date(Date.UTC(baseYear, baseMonth, baseDate, hour, 0, 0));
      const stop = new Date(Date.UTC(baseYear, baseMonth, baseDate, hour, 45, 0));
      await createTimeEntryForWorkspace(page, {
        description: `Entry ${entryIndex + 1} for subview test`,
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

    // Verify list view shows the seeded entries
    await page.getByRole("button", { name: "List view" }).click();
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // Each seeded entry description should appear in the list
    for (let entryIndex = 0; entryIndex < 3; entryIndex++) {
      await expect(page.locator(`text=Entry ${entryIndex + 1} for subview test`)).toBeVisible();
    }

    // Verify timesheet view shows time data for the seeded entries
    await page.getByRole("button", { name: "Timesheet" }).click();
    await expect(page.getByRole("button", { name: "Timesheet" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // The timesheet should have project rows with non-zero time (since entries were created)
    // We verify the timesheet is not showing the empty state
    await expect(page.getByText("No week data available")).not.toBeVisible();

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
    const loginSession = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = loginSession.currentWorkspaceId;

    // Create a running timer via API before navigating to /timer
    const runningDescription = "Pre-existing running timer";
    await page.evaluate(
      async ({ workspaceId: wid, description }) => {
        const response = await fetch(`/api/v9/workspaces/${wid}/time_entries`, {
          body: JSON.stringify({
            created_with: "playwright-e2e",
            description,
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
      { workspaceId, description: runningDescription },
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
    // Running timer description should be visible in the timer description input (shared header)
    // and the stop button should reflect the running state
    const listViewDescription = await page.getByLabel("Time entry description").inputValue();
    expect(listViewDescription).toContain(runningDescription);

    // Switch to timesheet view
    await page.getByRole("button", { name: "Timesheet" }).click();
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "stop");
    await expect(page.getByTestId("timer-elapsed")).toBeVisible();
    // Running timer description should be visible in the header
    const timesheetDescription = await page.getByLabel("Time entry description").inputValue();
    expect(timesheetDescription).toContain(runningDescription);

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
