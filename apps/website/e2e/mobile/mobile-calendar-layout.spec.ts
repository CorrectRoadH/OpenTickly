import { devices, expect, test } from "@playwright/test";

import {
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "../fixtures/e2e-auth.ts";

// Register/login with default locale, then test calendar under zh-CN.
test.use({ ...devices["iPhone 13"], timezoneId: "UTC" });

/**
 * Mobile calendar: time entry layout under CJK locales.
 *
 * Regression test for b022ca67 — resolveMinutesSinceMidnight used i18n.language
 * with Intl.DateTimeFormat, but CJK locales append unit suffixes (e.g. "14时"),
 * causing Number() to return NaN and all entries to collapse to top:0.
 */

/**
 * Switch the app's i18n language on the page. Requires the dev-mode
 * `window.__i18n` global exposed by `src/app/i18n.ts`.
 */
async function switchPageLanguage(page: import("@playwright/test").Page, lang: string) {
  await page.evaluate(async (lng) => {
    const i18n = (window as any).__i18n;
    if (i18n?.changeLanguage) {
      await i18n.changeLanguage(lng);
    }
  }, lang);
  // Wait for React to re-render with the new language.
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
}

test.describe("Mobile calendar: entry positioning (CJK locale)", () => {
  test("entry at 14:00 renders at correct vertical position under zh locale", async ({ page }) => {
    const email = `m-layout-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Mobile Layout User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    const todayStr = new Date().toISOString().slice(0, 10);
    const description = `layout-test-${Date.now()}`;

    await createTimeEntryForWorkspace(page, {
      description,
      start: `${todayStr}T14:00:00.000Z`,
      stop: `${todayStr}T15:00:00.000Z`,
      workspaceId: session.currentWorkspaceId,
    });

    await page.goto(new URL("/m/calendar", page.url()).toString());

    const timeline = page.locator(".overflow-y-auto").first();
    const entry = timeline.getByRole("button", { name: description });
    await expect(entry).toBeVisible({ timeout: 10_000 });

    // Switch to Chinese — this is the locale that triggered the bug.
    await switchPageLanguage(page, "zh");

    // Re-locate entry (text may now be Chinese fallback, use same desc since it's user data).
    await expect(entry).toBeVisible();

    // 14:00 at 60px/hour = 840px. The bug produced NaN → browser rendered at 0.
    const top = await entry.evaluate((el) => parseFloat((el as HTMLElement).style.top));
    expect(top).toBeGreaterThan(820);
    expect(top).toBeLessThan(860);
  });

  test("two non-overlapping entries each get full width under zh locale", async ({ page }) => {
    const email = `m-seq-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Mobile Seq User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    const todayStr = new Date().toISOString().slice(0, 10);
    const descA = `seq-a-${Date.now()}`;
    const descB = `seq-b-${Date.now()}`;

    await createTimeEntryForWorkspace(page, {
      description: descA,
      start: `${todayStr}T10:00:00.000Z`,
      stop: `${todayStr}T11:00:00.000Z`,
      workspaceId: session.currentWorkspaceId,
    });
    await createTimeEntryForWorkspace(page, {
      description: descB,
      start: `${todayStr}T11:00:00.000Z`,
      stop: `${todayStr}T12:00:00.000Z`,
      workspaceId: session.currentWorkspaceId,
    });

    await page.goto(new URL("/m/calendar", page.url()).toString());

    const timeline = page.locator(".overflow-y-auto").first();
    const entryA = timeline.getByRole("button", { name: descA });
    const entryB = timeline.getByRole("button", { name: descB });
    await expect(entryA).toBeVisible({ timeout: 10_000 });
    await expect(entryB).toBeVisible({ timeout: 10_000 });

    // Switch to Chinese locale.
    await switchPageLanguage(page, "zh");
    await expect(entryA).toBeVisible();

    // Non-overlapping entries should each get ~100% width.
    const widthA = await entryA.evaluate((el) => parseFloat((el as HTMLElement).style.width));
    const widthB = await entryB.evaluate((el) => parseFloat((el as HTMLElement).style.width));
    expect(widthA).toBeGreaterThan(80);
    expect(widthB).toBeGreaterThan(80);

    // Entries should be at different vertical positions (not both at top:0).
    const topA = await entryA.evaluate((el) => parseFloat((el as HTMLElement).style.top));
    const topB = await entryB.evaluate((el) => parseFloat((el as HTMLElement).style.top));
    expect(Math.abs(topA - topB)).toBeGreaterThan(40);
  });
});
