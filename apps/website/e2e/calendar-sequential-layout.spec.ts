import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

/**
 * Register a fresh user, create time entries via API, and navigate to calendar view.
 */
async function setupCalendarWithEntries(
  page: import("@playwright/test").Page,
  testInfo: import("@playwright/test").TestInfo,
  entriesToCreate: Array<{
    description: string;
    startHour: number;
    startMin: number;
    endHour: number;
    endMin: number;
  }>,
) {
  const email = `cal-layout-${test.info().workerIndex}-${Date.now()}@example.com`;
  const password = "secret-pass";

  await registerE2eUser(page, testInfo, {
    email,
    fullName: "Calendar Layout User",
    password,
  });

  await page.context().clearCookies();
  const session = await loginE2eUser(page, testInfo, { email, password });

  const now = new Date();

  for (const entry of entriesToCreate) {
    const start = new Date(now);
    start.setHours(entry.startHour, entry.startMin, 0, 0);
    const stop = new Date(now);
    stop.setHours(entry.endHour, entry.endMin, 0, 0);

    await createTimeEntryForWorkspace(page, {
      description: entry.description,
      start: start.toISOString(),
      stop: stop.toISOString(),
      workspaceId: session.currentWorkspaceId,
    });
  }

  await page.reload();
  await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
  await page.getByRole("radio", { name: "Calendar" }).click();

  return session;
}

/**
 * Get the width percentage of a calendar entry's .rbc-event wrapper
 * relative to its parent container.
 */
async function getEventWidthPercent(locator: Locator): Promise<number> {
  return locator.evaluate((el) => {
    const rbcEvent = el.closest(".rbc-event") as HTMLElement | null;
    if (!rbcEvent) return 0;
    // react-big-calendar uses calc() expressions like "calc(100% + 0px)"
    const w = parseFloat(rbcEvent.style.width);
    if (!Number.isNaN(w)) return w;
    // Fallback: measure computed width relative to parent
    const parent = rbcEvent.parentElement;
    if (!parent) return 0;
    return (rbcEvent.getBoundingClientRect().width / parent.getBoundingClientRect().width) * 100;
  });
}

test.describe("Calendar layout: sequential vs parallel entries", () => {
  test("Sequential (non-overlapping) entries are NOT displayed side-by-side", async ({ page }) => {
    const descA = `seq-a-${Date.now()}`;
    const descB = `seq-b-${Date.now()}`;

    // Two short sequential entries: A ends exactly when B starts
    await setupCalendarWithEntries(page, test.info(), [
      { description: descA, startHour: 10, startMin: 0, endHour: 10, endMin: 14 },
      { description: descB, startHour: 10, startMin: 14, endHour: 10, endMin: 28 },
    ]);

    const entryA = page.locator(`[data-testid^="calendar-entry-"]`).filter({ hasText: descA });
    const entryB = page.locator(`[data-testid^="calendar-entry-"]`).filter({ hasText: descB });

    await expect(entryA).toBeVisible({ timeout: 10_000 });
    await expect(entryB).toBeVisible({ timeout: 10_000 });

    // Sequential entries should each occupy full column width
    const widthA = await getEventWidthPercent(entryA);
    const widthB = await getEventWidthPercent(entryB);

    expect(widthA).toBeGreaterThan(80);
    expect(widthB).toBeGreaterThan(80);
  });

  test("Overlapping entries ARE displayed side-by-side", async ({ page }) => {
    const descA = `par-a-${Date.now()}`;
    const descB = `par-b-${Date.now()}`;

    // Two entries that genuinely overlap
    await setupCalendarWithEntries(page, test.info(), [
      { description: descA, startHour: 14, startMin: 0, endHour: 14, endMin: 30 },
      { description: descB, startHour: 14, startMin: 15, endHour: 14, endMin: 45 },
    ]);

    const entryA = page.locator(`[data-testid^="calendar-entry-"]`).filter({ hasText: descA });
    const entryB = page.locator(`[data-testid^="calendar-entry-"]`).filter({ hasText: descB });

    await expect(entryA).toBeVisible({ timeout: 10_000 });
    await expect(entryB).toBeVisible({ timeout: 10_000 });

    // Overlapping entries should be narrower (roughly 50% each)
    const widthA = await getEventWidthPercent(entryA);
    const widthB = await getEventWidthPercent(entryB);

    expect(widthA).toBeLessThan(70);
    expect(widthB).toBeLessThan(70);
  });
});
