import { expect, test, type Page } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

async function freezePageDateToWeekday(page: Page) {
  const mondayAfternoonUtc = Date.UTC(2026, 3, 6, 15, 30, 0);
  await page.addInitScript((fixedNow: number) => {
    const RealDate = Date;

    class MockDate extends RealDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) {
          super(fixedNow);
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        super(...(args as [any]));
      }

      static now() {
        return fixedNow;
      }
    }

    MockDate.parse = RealDate.parse;
    MockDate.UTC = RealDate.UTC;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.Date = MockDate as any;
  }, mondayAfternoonUtc);
}

async function expectIndicatorPlayButtonAligned(page: Page) {
  const indicator = page.locator(".rbc-current-time-indicator").first();
  const playButton = page.getByTestId("current-time-indicator-play");

  await expect(indicator).toBeVisible();
  await expect(playButton).toBeVisible();

  const indicatorBox = await indicator.boundingBox();
  const playButtonBox = await playButton.boundingBox();

  expect(indicatorBox).not.toBeNull();
  expect(playButtonBox).not.toBeNull();

  if (!indicatorBox || !playButtonBox) {
    return;
  }

  const indicatorCenterY = indicatorBox.y + indicatorBox.height / 2;
  const playButtonCenterY = playButtonBox.y + playButtonBox.height / 2;

  expect(Math.abs(playButtonCenterY - indicatorCenterY)).toBeLessThanOrEqual(2);
}

test.describe("Calendar event card continue button", () => {
  test("clicking the continue button on a stopped calendar entry starts a new timer with the same details", async ({
    page,
  }) => {
    const email = `cal-continue-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Calendar Continue User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    // Create a stopped time entry for today so it appears on the calendar
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 0, 0),
    );
    const stop = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 11, 0, 0),
    );
    const description = `Continue me ${Date.now()}`;

    await createTimeEntryForWorkspace(page, {
      description,
      start: start.toISOString(),
      stop: stop.toISOString(),
      workspaceId: session.currentWorkspaceId,
    });

    // Navigate to timer page (calendar is the default view)
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await expect(page.getByTestId("timer-calendar-view")).toBeVisible();

    // Verify the timer is not running (scope to main composer, not editor dialog)
    const timerButton = page
      .getByTestId("tracking-timer-page")
      .getByTestId("timer-action-button")
      .first();
    await expect(timerButton).toHaveAttribute("data-icon", "play");

    // Find the calendar entry and hover to reveal the continue button
    const entryCard = page
      .getByTestId("timer-calendar-view")
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: description });
    await expect(entryCard).toBeVisible();
    await entryCard.hover();

    // Click the continue button (play icon inside the event card)
    const continueButton = entryCard.getByRole("button", { name: "Continue time entry" });
    await expect(continueButton).toBeVisible();
    await continueButton.click();

    // Verify a timer is now running — the action button should show stop icon
    await expect(timerButton).toHaveAttribute("data-icon", "stop");

    // The description input should reflect the continued entry's description
    const descriptionInput = page.getByPlaceholder("What are you working on?");
    await expect(descriptionInput).toHaveValue(description);
  });
});

test.describe("Calendar current-time-indicator play button", () => {
  test("clicking the play button on the current time indicator starts a new timer", async ({
    page,
  }) => {
    await freezePageDateToWeekday(page);

    const email = `cal-indicator-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Calendar Indicator User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    // Navigate to timer page (calendar is the default view)
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await expect(page.getByTestId("timer-calendar-view")).toBeVisible();

    // Verify the timer is not running (scope to main composer, not editor dialog)
    const timerButton = page
      .getByTestId("tracking-timer-page")
      .getByTestId("timer-action-button")
      .first();
    await expect(timerButton).toHaveAttribute("data-icon", "play");

    // Find and click the current time indicator play button.
    // Scroll into view first — on CI the indicator may render outside the viewport
    // due to the Date mock placing it at a specific hour position.
    const indicatorPlayButton = page.getByTestId("current-time-indicator-play");
    await expect(indicatorPlayButton).toBeVisible();
    await indicatorPlayButton.scrollIntoViewIfNeeded();
    const startTimerResponse = page.waitForResponse(
      (resp) => resp.url().includes("/time_entries") && resp.request().method() === "POST",
    );
    await indicatorPlayButton.click();
    await startTimerResponse;

    // Verify a timer is now running — the action button should show stop icon
    await expect(timerButton).toHaveAttribute("data-icon", "stop");
  });

  test("the play button stays vertically aligned with the current-time indicator in 5 day view", async ({
    page,
  }) => {
    await freezePageDateToWeekday(page);

    const email = `cal-indicator-5day-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Calendar Indicator 5 Day User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await expect(page.getByTestId("timer-calendar-view")).toBeVisible();

    await page.getByTestId("calendar-subview-select").click();
    await page.getByRole("option", { name: "5 days view" }).click();

    await expect(page.getByTestId("calendar-subview-select")).toContainText("5 days view");
    await expectIndicatorPlayButtonAligned(page);
  });
});
