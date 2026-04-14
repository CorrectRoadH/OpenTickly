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

  // This one reproduces the user's "一往下滚还是复现" observation: in real
  // use the page has a *running* entry. A running entry is what makes
  // CalendarView actually do meaningful work on every nowMinuteMs tick —
  // `buildEvents` re-derives the running segment, rebuilding the events
  // array and (transitively) the inline `calendarComponents` object. If
  // that object loses identity stability, RBC's header subtree
  // unmounts+remounts on every minute tick. That is the remount the user
  // sees while they scroll (scrolling just happens to overlap the tick).
  test("running entry + minute tick does not remount today's header", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-04-14T10:00:30Z") });

    const email = `cal-hdr-running-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Calendar Header Running",
      password,
    });
    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Start a running entry through the real UI so the query cache state
    // matches production exactly (useCurrentTimeEntryQuery polls at 30s,
    // its `data` becomes non-null, buildEvents produces the running
    // segment, dailyTotals for today re-derives).
    await page.getByLabel("Time entry description").fill("running witness");
    await page.getByRole("button", { name: "Start timer" }).click();
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();

    await expect(page.getByTestId("timer-calendar-view")).toBeVisible();
    const witness = page.getByTestId("calendar-day-header-rendercount-tue");
    await expect(witness).toHaveText(/^r:\d+$/);
    const baseline = await witness.textContent();

    // Cross multiple minute boundaries + one refetchInterval of the
    // current-entry query (30s). This is the real wall-clock window the
    // user observes while scrolling with devtools open.
    await page.clock.fastForward(125_000); // 2m5s

    // The tolerance is strict: the count may NOT decrease (remount) and
    // must not increase by more than a small handful of minute ticks.
    // A remount flips "r:N" down to "r:1" or similar low value — that is
    // the specific failure mode this spec locks out.
    const after = await witness.textContent();
    expect(after).toMatch(/^r:\d+$/);
    const baselineN = Number((baseline ?? "r:0").slice(2));
    const afterN = Number((after ?? "r:0").slice(2));
    // Never remount (which would make afterN < baselineN because counter
    // resets to 1). And never blow up on each tick (cap at +4 across 2m:
    // 2 minute ticks + maybe 1 refetch).
    expect(afterN).toBeGreaterThanOrEqual(baselineN);
    expect(afterN - baselineN).toBeLessThanOrEqual(4);
  });
});
