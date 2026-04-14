import { expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

/**
 * Re-render regression: the calendar day header must not re-render just
 * because wall-clock time advances. CalendarView has two intrinsic
 * "ticks" that re-render the whole tree and leak into the header:
 *
 *   A. `nowMinuteMs` — setInterval(5s) that recomputes a minute-resolution
 *      `now`. On every minute rollover, CalendarView re-renders, rebuilding
 *      the inline `calendarComponents` object, which forces RBC's
 *      TimeGridHeader (and thus our CalendarDayHeader) to re-render.
 *
 * We use `page.clock` to freeze and fast-forward time deterministically,
 * and read a DEV-only render counter rendered into each CalendarDayHeader
 * via `useRenderCount()`.
 *
 * If the header rerender count jumps between baseline and after tick,
 * the test is RED — pinpointing the regression CLAUDE.md's "Rerender
 * Hygiene" section exists to prevent.
 */
test.describe("Calendar day header re-render hygiene", () => {
  test("scrolling the calendar body does not re-render day headers", async ({ page }) => {
    // Freeze at a stable Tuesday so the week layout and day names are
    // deterministic regardless of when the suite runs.
    await page.clock.install({ time: new Date("2026-04-14T10:00:00Z") });

    const email = `cal-hdr-scroll-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Calendar Header Scroll",
      password,
    });
    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await expect(page.getByTestId("timer-calendar-view")).toBeVisible();

    // Any day header suffices as a witness — pick Tuesday since mocked date
    // is 2026-04-14 (Tue) and that header is guaranteed present in week view.
    const witness = page.getByTestId("calendar-day-header-rendercount-tue");
    await expect(witness).toHaveText(/^r:\d+$/);
    const baseline = await witness.textContent();

    // Pure scroll — should not re-render the header.
    const scrollable = page.locator(".rbc-time-content");
    await expect(scrollable).toBeVisible();
    await scrollable.evaluate((el) => el.scrollBy(0, 400));
    await scrollable.evaluate((el) => el.scrollBy(0, -200));

    expect(await witness.textContent()).toBe(baseline);
  });

  test("crossing a minute boundary does not re-render day headers", async ({ page }) => {
    // Start at xx:00:30 so a 40s fast-forward crosses exactly one minute
    // boundary and triggers CalendarView's nowMinuteMs setInterval tick.
    await page.clock.install({ time: new Date("2026-04-14T10:00:30Z") });

    const email = `cal-hdr-tick-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Calendar Header Tick",
      password,
    });
    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await expect(page.getByTestId("timer-calendar-view")).toBeVisible();

    const witness = page.getByTestId("calendar-day-header-rendercount-tue");
    await expect(witness).toHaveText(/^r:\d+$/);
    const baseline = await witness.textContent();

    // Advance past the next minute rollover. CalendarView's setInterval
    // fires every 5s and advances nowMinuteMs when the minute bucket changes.
    // 40s from xx:00:30 lands at xx:01:10 — well past the boundary.
    await page.clock.fastForward(40_000);

    // Give React Query + React a microtask to flush the state update.
    // We don't waitForTimeout — auto-retry assertion handles settling.
    // If the app is well-behaved, witness.textContent === baseline.
    // If the bug exists, witness bumps to `r:<baseline+1>`.
    await expect(witness).toHaveText(baseline ?? "");
  });
});
