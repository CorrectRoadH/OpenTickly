import { expect, test } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

/**
 * The calendar day-header row (RBC's TimeGridHeader → `.rbc-time-header`)
 * must stay pinned at the top of the calendar as the user scrolls the
 * whole page — it must not scroll away with the grid body, and no
 * single scroll position may leave the day numbers outside the viewport
 * or above the timer bar.
 *
 * A previous single-scrollTo assertion was too weak — it only sampled
 * one position, so a partial failure (e.g. header slipping behind the
 * timer bar at large scroll offsets, or RBC transforming the header on
 * some scroll threshold) would not be caught. This spec continuously
 * steps the window through many scroll offsets and asserts at every
 * single step.
 */
test.describe("Calendar day header sticky", () => {
  test("page loads unscrolled", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-04-14T10:00:00Z") });
    const email = `cal-sticky-init-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Calendar Sticky Init",
      password,
    });
    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    const mkIso = (hour: number, minute: number) =>
      new Date(Date.UTC(2026, 3, 14, hour, minute, 0)).toISOString();
    await createTimeEntryForWorkspace(page, {
      description: "Anchor entry",
      start: mkIso(12, 0),
      stop: mkIso(13, 0),
      workspaceId: session.currentWorkspaceId,
    });

    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await expect(page.getByTestId("timer-calendar-view")).toBeVisible();

    // Regression for "一进来就只是这样了": the calendar must not auto-scroll
    // the window on mount. A stale `scrollIntoView` in CalendarView used to
    // shove scrollY to ~1000px, hiding the whole top chrome.
    const initial = await page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>(
        '[data-testid="tracking-timer-page"] > header',
      );
      return {
        barTop: bar ? bar.getBoundingClientRect().top : null,
        scrollY: window.scrollY,
      };
    });
    expect(initial.scrollY).toBe(0);
    expect(initial.barTop).toBe(0);
  });

  test("day header stays pinned at every scroll step, not just one", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-04-14T10:00:00Z") });
    const email = `cal-sticky-loop-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Calendar Sticky Loop",
      password,
    });
    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    const mkIso = (hour: number, minute: number) =>
      new Date(Date.UTC(2026, 3, 14, hour, minute, 0)).toISOString();
    await createTimeEntryForWorkspace(page, {
      description: "Anchor entry",
      start: mkIso(12, 0),
      stop: mkIso(13, 0),
      workspaceId: session.currentWorkspaceId,
    });

    // Short viewport forces meaningful window overflow.
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await expect(page.getByTestId("timer-calendar-view")).toBeVisible();

    // Sanity: CSS contract must still be in place so the failure mode, if
    // any, is "sticky is declared but something breaks it" rather than
    // "sticky was deleted".
    const staticSanity = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>(".rbc-time-header");
      const cs = header ? window.getComputedStyle(header) : null;
      return {
        position: cs?.position ?? null,
        timerHeaderHeightVar: getComputedStyle(document.documentElement).getPropertyValue(
          "--timer-header-height",
        ),
        maxScroll: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      };
    });
    expect(staticSanity.position).toBe("sticky");
    expect(staticSanity.timerHeaderHeightVar.trim()).toMatch(/^\d+(?:\.\d+)?px$/);
    // Need a page that actually overflows the short viewport — otherwise
    // this test can't exercise sticky at all.
    expect(staticSanity.maxScroll).toBeGreaterThan(400);

    // Walk the full scroll range in small-ish steps. At every step the
    // day header must be: (a) pinned flush under the timer bar, not below
    // it, and (b) still intersecting the viewport (bottom > barBottom).
    //
    // A single `scrollTo(0, 800)` assertion wouldn't catch a bug where
    // sticky only breaks past some threshold (e.g. the header unsticks at
    // scrollY > 1500, or RBC applies an internal transform beyond a
    // certain point). Stepping forces the test to witness every position.
    const step = 120;
    const maxScroll = staticSanity.maxScroll;
    const stopsToVisit = [0];
    for (let y = step; y <= maxScroll; y += step) stopsToVisit.push(y);
    stopsToVisit.push(maxScroll); // include the true bottom
    // And walk back up — sticky can fail asymmetrically on reverse scroll.
    for (let y = maxScroll - step; y >= 0; y -= step) stopsToVisit.push(Math.max(0, y));

    const failures: Array<{
      scrollY: number;
      barBottom: number;
      headerTop: number;
      headerBottom: number;
      viewportHeight: number;
      reason: string;
    }> = [];
    // After the page has scrolled past the header's natural page-Y, the
    // header's viewport `top` must be constant — that's what "fixed"
    // means to the user. If RBC or a parent transform makes it drift by
    // even 1px between steps, flag it.
    let pinnedTopOnce: number | null = null;

    for (const target of stopsToVisit) {
      await page.evaluate((y) => window.scrollTo(0, y), target);
      // Wait two rAFs so sticky repositioning has definitely settled
      // before measuring — otherwise we can read a transient pre-paint
      // rect that doesn't reflect what the user sees.
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );

      const snapshot = await page.evaluate(() => {
        const bar = document.querySelector<HTMLElement>(
          '[data-testid="tracking-timer-page"] > header',
        );
        const header = document.querySelector<HTMLElement>(".rbc-time-header");
        const barRect = bar?.getBoundingClientRect();
        const headerRect = header?.getBoundingClientRect();
        return {
          scrollY: window.scrollY,
          viewportHeight: window.innerHeight,
          barBottom: barRect?.bottom ?? null,
          headerTop: headerRect?.top ?? null,
          headerBottom: headerRect?.bottom ?? null,
        };
      });

      if (
        snapshot.barBottom == null ||
        snapshot.headerTop == null ||
        snapshot.headerBottom == null
      ) {
        failures.push({
          scrollY: snapshot.scrollY,
          barBottom: snapshot.barBottom ?? -1,
          headerTop: snapshot.headerTop ?? -1,
          headerBottom: snapshot.headerBottom ?? -1,
          viewportHeight: snapshot.viewportHeight,
          reason: "missing element",
        });
        continue;
      }

      // Invariant 1: header must sit flush under the timer bar. It may
      // not be below bar's bottom (would mean there's a gap and content
      // is showing between bar and header). It may not be *above* the
      // viewport either (scrolled off).
      //   0 <= headerTop <= barBottom + 2px slack (sub-pixel rounding)
      if (snapshot.headerTop < -0.5 || snapshot.headerTop > snapshot.barBottom + 2) {
        failures.push({
          scrollY: snapshot.scrollY,
          barBottom: snapshot.barBottom,
          headerTop: snapshot.headerTop,
          headerBottom: snapshot.headerBottom,
          viewportHeight: snapshot.viewportHeight,
          reason: "headerTop out of pinned range",
        });
      }

      // Invariant 2: header must be visible — its bottom must be below
      // the bar's bottom, and above the viewport bottom.
      if (
        snapshot.headerBottom <= snapshot.barBottom ||
        snapshot.headerBottom > snapshot.viewportHeight
      ) {
        failures.push({
          scrollY: snapshot.scrollY,
          barBottom: snapshot.barBottom,
          headerTop: snapshot.headerTop,
          headerBottom: snapshot.headerBottom,
          viewportHeight: snapshot.viewportHeight,
          reason: "headerBottom not in viewport below bar",
        });
      }

      // Invariant 3 ("fixed-like"): once the page has scrolled past the
      // header's original page-Y, the header's viewport top must be a
      // constant — it must not drift between scroll steps. Drift of >1px
      // is the visible "the header is still scrolling" glitch the user
      // reported ("往下滚还是复现").
      if (snapshot.scrollY > 200) {
        if (pinnedTopOnce === null) {
          pinnedTopOnce = snapshot.headerTop;
        } else if (Math.abs(snapshot.headerTop - pinnedTopOnce) > 1) {
          failures.push({
            scrollY: snapshot.scrollY,
            barBottom: snapshot.barBottom,
            headerTop: snapshot.headerTop,
            headerBottom: snapshot.headerBottom,
            viewportHeight: snapshot.viewportHeight,
            reason: `headerTop drifted from ${pinnedTopOnce} to ${snapshot.headerTop}`,
          });
        }
      }
    }

    // One consolidated failure so the report shows every bad step, not
    // just the first — useful for debugging a sticky regression that
    // only manifests at, say, scroll > 1500.
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
  });

  // Some layout bugs only surface on real wheel-driven scrolling because
  // wheel events go through the input pipeline and (unlike `scrollTo`) can
  // trigger passive `scroll` listeners, ResizeObserver chains, and browser
  // overlay-scrollbar behaviour that programmatic scroll skips.
  test("day header stays pinned under continuous wheel scrolling", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-04-14T10:00:00Z") });
    const email = `cal-sticky-wheel-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Calendar Sticky Wheel",
      password,
    });
    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    const mkIso = (hour: number, minute: number) =>
      new Date(Date.UTC(2026, 3, 14, hour, minute, 0)).toISOString();
    await createTimeEntryForWorkspace(page, {
      description: "Anchor entry",
      start: mkIso(12, 0),
      stop: mkIso(13, 0),
      workspaceId: session.currentWorkspaceId,
    });

    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await expect(page.getByTestId("timer-calendar-view")).toBeVisible();

    // Position the mouse over the calendar body before wheeling.
    const calendarBox = await page.getByTestId("timer-calendar-view").boundingBox();
    expect(calendarBox).not.toBeNull();
    await page.mouse.move(
      calendarBox!.x + calendarBox!.width / 2,
      calendarBox!.y + calendarBox!.height / 2,
    );

    const samples: Array<{ scrollY: number; headerTop: number; barBottom: number }> = [];
    const measure = async () =>
      page.evaluate(() => {
        const bar = document.querySelector<HTMLElement>(
          '[data-testid="tracking-timer-page"] > header',
        );
        const header = document.querySelector<HTMLElement>(".rbc-time-header");
        return {
          scrollY: window.scrollY,
          headerTop: header?.getBoundingClientRect().top ?? NaN,
          barBottom: bar?.getBoundingClientRect().bottom ?? NaN,
        };
      });

    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 200);
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );
      samples.push(await measure());
    }
    // And scroll back up to catch reverse-scroll asymmetry.
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, -200);
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );
      samples.push(await measure());
    }

    // Sanity: the wheel actually moved the window.
    const maxScrollSeen = Math.max(...samples.map((s) => s.scrollY));
    expect(maxScrollSeen).toBeGreaterThan(200);

    // Every sample where the page is scrolled past the bar must have the
    // header pinned flush under it. A single drift > 1px or an overlap
    // with the bar fails the whole test — and the reason array shows
    // every bad step, not just the first.
    const bad = samples
      .filter((s) => s.scrollY > 200)
      .filter(
        (s) =>
          !(
            s.headerTop >= -0.5 &&
            s.headerTop <= s.barBottom + 2 &&
            Math.abs(s.headerTop - s.barBottom) < s.barBottom + 10
          ),
      );
    expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
  });
});
