import { expect, test } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

/**
 * The calendar day-header row (RBC's TimeGridHeader → `.rbc-time-header`)
 * must sit FLUSH under the timer bar at every scroll position — no gap
 * below it, no overlap behind it.
 *
 * The "flush" requirement is symmetric. The previous assertion rejected
 * only one side of the asymmetry — it caught `headerTop > barBottom`
 * (gap), but allowed `headerTop < barBottom` (bar covering the top of
 * the header) as long as `headerTop > -0.5`. The visible "half-hidden
 * header" regression sits squarely in that gap: `--timer-header-height`
 * is set once from `el.offsetHeight` in WorkspaceTimerPage's header ref
 * callback, but that ref only fires when WTP itself re-renders. When
 * the ProjectFilterStrip renders later (after the time-entry query
 * resolves — only the strip's subtree re-renders, not WTP), the bar
 * grows by ~34px but `--timer-header-height` stays at its smaller,
 * stale value, so `.rbc-time-header` sticks 34px above the bar's
 * actual bottom. The old drift check saw zero drift (the value is
 * consistently wrong, not changing), so it passed too.
 */
test.describe("Calendar day header sticky", () => {
  test("page opens scrolled to now, with the sticky header still pinned", async ({ page }) => {
    // Freeze at 10:00 local so "now" lands mid-day and forces a non-zero
    // auto-scroll. At 00:00 we'd get target < 0 and skip the scroll,
    // which wouldn't exercise the regression path.
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

    // The calendar auto-scrolls the window so the current-time indicator
    // sits just below the sticky header. This spec locks in the
    // reconciliation of two once-in-tension properties:
    //   - `barTop === 0` — the `sticky top-0` header is still pinned
    //     (8062128b's intent: user never loses the timer composer /
    //      range picker / view tabs).
    //   - the current-time indicator is within the viewport — we
    //     actually scroll to now (reverting the earlier "do nothing" stub
    //     that left the user staring at midnight).
    // scrollY > 0 is expected here; the old "scrollY === 0" invariant
    // was too strict — it conflated "window unscrolled" with "header
    // pinned", and the latter is what actually matters.
    const state = await page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>(
        '[data-testid="tracking-timer-page"] > header',
      );
      const indicator = document.querySelector<HTMLElement>(".rbc-current-time-indicator");
      return {
        barTop: bar ? bar.getBoundingClientRect().top : null,
        indicatorTop: indicator ? indicator.getBoundingClientRect().top : null,
        scrollY: window.scrollY,
        viewportHeight: window.innerHeight,
      };
    });
    expect(state.barTop).toBe(0);
    expect(state.scrollY).toBeGreaterThan(0);
    expect(state.indicatorTop).not.toBeNull();
    if (state.indicatorTop !== null && state.viewportHeight !== null) {
      // Indicator visible in viewport (below the header, above the fold).
      expect(state.indicatorTop).toBeGreaterThan(0);
      expect(state.indicatorTop).toBeLessThan(state.viewportHeight);
    }
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
    // The ProjectFilterStrip renders only after the time-entry query
    // resolves and specifically grows the timer bar. Its presence is the
    // scenario under which the stale --timer-header-height regression
    // appears, so we explicitly wait for it before measuring.
    await expect(page.getByTestId("project-filter-strip")).toBeVisible();

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
      offset: number;
      reason: string;
    }> = [];
    const offsetsByStep: number[] = [];

    // Allow up to 2px of sub-pixel slack for rounding. Anything more is
    // a visible misalignment the user can see.
    const FLUSH_SLACK = 2;

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
          offset: 0,
          reason: "missing element",
        });
        continue;
      }

      // Invariant: the day header must sit FLUSH under the timer bar.
      // `offset = headerTop - barBottom`:
      //   offset < -FLUSH_SLACK → bar is covering the top of the header
      //     (the "half-hidden header" regression — `--timer-header-height`
      //     is stale / smaller than the bar's actual rendered height, so
      //     `.rbc-time-header` sticks above `barBottom`).
      //   offset >  FLUSH_SLACK → visible gap between the bar and the
      //     header (calendar grid peeks through).
      // Only `|offset| ≤ FLUSH_SLACK` is acceptable.
      const offset = snapshot.headerTop - snapshot.barBottom;
      offsetsByStep.push(offset);
      if (Math.abs(offset) > FLUSH_SLACK) {
        failures.push({
          scrollY: snapshot.scrollY,
          barBottom: snapshot.barBottom,
          headerTop: snapshot.headerTop,
          headerBottom: snapshot.headerBottom,
          viewportHeight: snapshot.viewportHeight,
          offset,
          reason:
            offset < 0
              ? `bar covers header by ${(-offset).toFixed(1)}px`
              : `gap between bar and header: ${offset.toFixed(1)}px`,
        });
      }

      // The header must still live inside the viewport (its bottom must
      // not fall below the viewport). Its top sits just under the bar
      // by the flush invariant above, so we don't need a separate
      // "above the bar" check here.
      if (snapshot.headerBottom > snapshot.viewportHeight) {
        failures.push({
          scrollY: snapshot.scrollY,
          barBottom: snapshot.barBottom,
          headerTop: snapshot.headerTop,
          headerBottom: snapshot.headerBottom,
          viewportHeight: snapshot.viewportHeight,
          offset,
          reason: "headerBottom below viewport",
        });
      }
    }

    // One consolidated failure so the report shows every bad step, not
    // just the first — useful for debugging a sticky regression that
    // only manifests at, say, scroll > 1500.
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);

    // Seam-jump guard: the gap between the bar and the day-header must
    // not vary across scroll positions. A sibling wrapper with its own
    // `border-top` (same color as the bar's `border-bottom`) would be
    // hidden by the day-header when sticky is active but exposed in
    // natural flow at scrollY=0 — visibly changing the seam from 1px
    // to 2px. FLUSH_SLACK alone can't catch this (it tolerates up to
    // 2px), so we separately assert consistency.
    const offsets = offsetsByStep;
    expect(offsets.length, "no snapshots captured").toBeGreaterThan(0);
    const minOffset = Math.min(...offsets);
    const maxOffset = Math.max(...offsets);
    expect(
      maxOffset - minOffset,
      `offset varied across scroll steps: min=${minOffset.toFixed(2)}, max=${maxOffset.toFixed(2)}. ` +
        `The seam between the timer bar and the day header changed between scroll positions, ` +
        `which is the visible "gap jumps from 1px to 2px at scroll top" regression.`,
    ).toBeLessThanOrEqual(0.5);
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
    // Wait for the project filter strip — its post-mount appearance is
    // what grows the timer bar past the value that was captured into
    // `--timer-header-height`, so measuring before it shows up would
    // miss the regression.
    await expect(page.getByTestId("project-filter-strip")).toBeVisible();

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
    // header pinned FLUSH under the bar — |headerTop - barBottom| ≤ 2.
    // The flush check is symmetric: it rejects both a gap below the bar
    // AND a bar-over-header overlap (the "half-hidden header" regression).
    const FLUSH_SLACK = 2;
    const bad = samples
      .filter((s) => s.scrollY > 200)
      .map((s) => ({ ...s, offset: s.headerTop - s.barBottom }))
      .filter((s) => Math.abs(s.offset) > FLUSH_SLACK);
    expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
  });
});
