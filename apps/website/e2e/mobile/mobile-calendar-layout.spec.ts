import { devices, expect, test } from "@playwright/test";

import {
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "../fixtures/e2e-auth.ts";

test.use({ ...devices["iPhone 13"], timezoneId: "UTC" });

/**
 * Mobile calendar: time entry layout correctness.
 *
 * Verifies entries render at the correct vertical position and width in the
 * mobile day timeline. Covers the regression where CJK locale suffixes
 * (e.g. "14时") caused NaN positions, collapsing all entries to top:0.
 */
test.describe("Mobile calendar: entry layout", () => {
  test("entry at 14:00 renders at the correct vertical position", async ({ page }) => {
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

    // 14:00 at 60px/hour = 840px. Allow ±20px tolerance.
    const top = await entry.evaluate((el) => parseFloat((el as HTMLElement).style.top));
    expect(top).toBeGreaterThan(820);
    expect(top).toBeLessThan(860);
  });

  test("two non-overlapping entries each get full width", async ({ page }) => {
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
