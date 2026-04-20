import { devices, expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "../fixtures/e2e-auth.ts";

/**
 * Mobile calendar: current-time indicator line position under CJK locales.
 *
 * Regression test for a NaN bug in `MobileCalendarDayTimeline.tsx` —
 * `nowMinutes` is computed by calling `Intl.DateTimeFormat(i18n.language, ...)`
 * with `hour: "2-digit"` and `minute: "2-digit"` on two separate `.format()`
 * passes. Under zh the formatted hour comes back as `"14时"`, so
 * `Number("14时") === NaN`. The indicator's `top` style is `NaN * 60`, and
 * the browser discards the invalid CSS value — React mounts the line at
 * offset 0 instead of the "now" row.
 *
 * Same class of bug previously fixed for entry layout in calendar-layout.ts
 * (b022ca67). The current-time indicator was overlooked there.
 */

test.use({ ...devices["iPhone 13"], timezoneId: "UTC" });

test.describe("Mobile calendar: current-time indicator position", () => {
  test("indicator is at the correct hour row under zh locale", async ({ page }) => {
    // Freeze at 14:30 UTC so the expected top is deterministic:
    //   14h30 × 60 px/hour = 870 px.
    await page.clock.install({ time: new Date("2026-04-14T14:30:00Z") });

    // Register + login in en so the auth UI strings match — we only need
    // the component under test (/m/calendar) to render under zh.
    const email = `m-now-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Mobile Now User",
      password,
    });
    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    // Land on /m/timer first so a mobile shell is mounted, then flip the
    // language in the SPA and SPA-navigate to /m/calendar. Doing a full
    // `page.goto("/m/calendar")` would reload the bundle and re-run
    // i18n init, resetting the language to the browser's default.
    await page.goto(new URL("/m/timer", page.url()).toString());
    await page.waitForLoadState("networkidle");

    await page.evaluate(async () => {
      const i18n = (
        window as unknown as { __i18n?: { changeLanguage?: (l: string) => Promise<void> } }
      ).__i18n;
      if (!i18n?.changeLanguage) throw new Error("__i18n not exposed — need DEV build");
      await i18n.changeLanguage("zh");
    });
    await page.waitForTimeout(200);

    // Navigate to /m/calendar via SPA (history.pushState).
    await page.evaluate(() => history.pushState({}, "", "/m/calendar"));
    await page.evaluate(() => window.dispatchEvent(new PopStateEvent("popstate")));

    const timeline = page.locator(".overflow-y-auto").first();
    await expect(timeline).toBeVisible({ timeout: 10_000 });

    // Sanity — the component must have mounted with zh as the active language.
    const lang = await page.evaluate(
      () => (window as unknown as { __i18n?: { language?: string } }).__i18n?.language,
    );
    expect(lang).toBe("zh");

    const indicator = timeline.locator(".pointer-events-none.border-t-2").first();
    await expect(indicator).toBeVisible();

    const top = await indicator.evaluate((el) => parseFloat((el as HTMLElement).style.top));
    expect(top).toBeGreaterThan(860);
    expect(top).toBeLessThan(880);
  });
});
