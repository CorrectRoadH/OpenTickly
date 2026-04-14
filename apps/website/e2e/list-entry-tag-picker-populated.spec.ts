import { expect, test } from "@playwright/test";

import {
  createTagForWorkspace,
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";

/**
 * Reproduces a reported bug from manual testing:
 *   "Clicking the tag icon on a list row opens the picker but the
 *    tag options are empty / not selectable."
 *
 * The existing `list-entry-tag-picker.spec.ts` creates only 1 tag + 1
 * entry and passes cleanly. This spec seeds a realistic workspace (7
 * tags, multiple entries) so that (a) tag data takes longer to load
 * than the initial render of the list, and (b) the list has enough
 * rows that grouping / ordering quirks become relevant.
 *
 * The test clicks the tag icon on a row that has no tags yet, and
 * asserts every seeded tag is actually selectable inside the picker
 * dropdown. If the picker opens with zero tag options (as observed in
 * the live browser), this test fails.
 */
test.describe("List entry tag picker (populated workspace)", () => {
  test("clicking the tag icon shows every workspace tag in the picker", async ({ page }) => {
    const email = `list-tag-picker-pop-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "List Tag Picker Populated User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    // Seven tags to match a real workspace. Seeded via API so they're
    // present before the page first renders.
    const tagNames = ["1 象限", "2 象限", "3 象限", "4 象限", "专心", "没专心", "阅读"].map(
      (base) => `${base}-${Date.now()}`,
    );
    for (const name of tagNames) {
      await createTagForWorkspace(page, { name, workspaceId });
    }

    // A handful of stopped entries today so the list has real content.
    const now = new Date();
    const todayUtc = (hour: number, minute: number) =>
      new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0),
      );
    const descriptions = ["Morning focus", "Midday admin", "Afternoon reading"];
    const entryIds: number[] = [];
    for (let i = 0; i < descriptions.length; i++) {
      const id = await createTimeEntryForWorkspace(page, {
        description: descriptions[i]!,
        start: todayUtc(9 + i, 0).toISOString(),
        stop: todayUtc(9 + i, 30).toISOString(),
        workspaceId,
      });
      entryIds.push(id);
    }

    // Slow the tags fetch so it resolves AFTER the list has done its
    // first render — this is the race the user hit in the real browser.
    // The list renders with tags=[], then the tags query resolves and
    // propagates new tags down. If anything along the way (memoization,
    // stale snapshot, etc.) blocks the second pass, the tag picker
    // stays stuck on an empty options list.
    await page.route(
      (url) =>
        url.pathname.startsWith("/api/v9/workspaces/") &&
        url.pathname.endsWith("/tags") &&
        // Don't slow down the seeding POSTs above — only the initial GET.
        // The fetches above have already resolved before this route is
        // installed, but we guard anyway in case of retries.
        true,
      async (route) => {
        if (route.request().method() !== "GET") {
          await route.continue();
          return;
        }
        await new Promise((r) => setTimeout(r, 800));
        await route.continue();
      },
    );

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await page.getByRole("radio", { name: "List" }).click();
    await expect(page.getByTestId("timer-list-view")).toBeVisible();

    // Target the first entry's row and click its (no-tags) tag button.
    const targetRow = page.locator(
      `[data-testid="time-entry-list-row"][data-entry-id="${entryIds[0]}"]`,
    );
    await expect(targetRow).toBeVisible();
    const tagButton = targetRow.getByRole("button", { name: "Select tags" });
    await expect(tagButton).toBeVisible();
    await tagButton.click();

    // Picker must open and contain one clickable option per seeded tag.
    const picker = page.getByTestId("bulk-edit-tag-picker");
    await expect(picker).toBeVisible();
    for (const name of tagNames) {
      await expect(picker.getByRole("button", { name, exact: true })).toBeVisible();
    }

    // Guard against the "dropdown technically mounted, but a parent has
    // `overflow: hidden` that clips it so the user can't see it" bug.
    // Playwright's built-in visibility check is bounding-box based and
    // happily passes clipped content. We instead assert that the picker's
    // rendered rect actually lies inside the viewport AND that no
    // intermediate ancestor is clipping it away.
    const pickerGeometry = await picker.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      let clipped = false;
      let clipperTag = "";
      let node: HTMLElement | null = el.parentElement;
      while (node && node !== document.body) {
        const overflow = window.getComputedStyle(node).overflow;
        if (overflow === "hidden" || overflow === "clip") {
          const parentRect = node.getBoundingClientRect();
          if (rect.top >= parentRect.bottom || rect.bottom <= parentRect.top) {
            clipped = true;
            clipperTag = `${node.tagName.toLowerCase()}.${node.className}`;
            break;
          }
        }
        node = node.parentElement;
      }
      return {
        top: rect.top,
        bottom: rect.bottom,
        viewportHeight: window.innerHeight,
        clipped,
        clipperTag,
      };
    });
    expect(
      pickerGeometry.clipped,
      `Tag picker dropdown is clipped by ancestor with overflow:hidden ` +
        `(${pickerGeometry.clipperTag}). Real users see nothing after clicking ` +
        `the tag icon even though the DOM node is mounted.`,
    ).toBe(false);
    expect(pickerGeometry.bottom).toBeGreaterThan(pickerGeometry.top);
    expect(pickerGeometry.top).toBeLessThan(pickerGeometry.viewportHeight);

    // Actually toggle one of the tags on — this is where users report the
    // feature is broken. Clicking the option must both (a) flip the row's
    // button from the icon to the tag name and (b) persist to the server,
    // i.e. still be there after a full page reload.
    const pickedTag = tagNames[0]!;
    await picker.getByRole("button", { name: pickedTag, exact: true }).click();
    await expect(tagButton).toContainText(pickedTag);

    await page.reload();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await page.getByRole("radio", { name: "List" }).click();
    await expect(page.getByTestId("timer-list-view")).toBeVisible();

    const reloadedRow = page.locator(
      `[data-testid="time-entry-list-row"][data-entry-id="${entryIds[0]}"]`,
    );
    await expect(reloadedRow).toBeVisible();
    const reloadedTagButton = reloadedRow.getByRole("button", { name: "Select tags" });
    await expect(reloadedTagButton).toContainText(pickedTag);
  });
});
