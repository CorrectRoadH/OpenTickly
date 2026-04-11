import { expect, test, type Page } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

/**
 * Toggle a checkbox preference on the profile page and wait for the save round-trip.
 * The label text must match the visible checkbox label exactly.
 */
async function togglePreferenceCheckbox(page: Page, label: string) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/me/preferences") && response.request().method() === "POST",
    { timeout: 15_000 },
  );
  await page.getByLabel(label).click();
  await responsePromise;
}

/** Navigate to the profile page and wait for it to load. */
async function goToProfile(page: Page) {
  await page.goto(new URL("/profile", page.url()).toString());
  await expect(page.getByTestId("profile-page")).toBeVisible();
}

/** Navigate to the timer page and wait for it to load. */
async function goToTimer(page: Page) {
  await page.goto(new URL("/timer", page.url()).toString());
  await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
}

/** Start a running timer entry via API. */
async function startRunningEntry(page: Page, workspaceId: number, description: string) {
  await page.evaluate(
    async (opts) => {
      const response = await fetch(`/api/v9/workspaces/${opts.workspaceId}/time_entries`, {
        body: JSON.stringify({
          created_with: "playwright-e2e",
          description: opts.description,
          duration: -1,
          start: new Date().toISOString(),
          workspace_id: opts.workspaceId,
        }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) throw new Error(`Start entry failed: ${response.status}`);
    },
    { workspaceId, description },
  );
}

// ─── showTimeInTitle ─────────────────────────────────────────────────────────

test.describe("Story: showTimeInTitle controls document.title when timer is running", () => {
  const email = `pref-title-${Date.now()}@example.com`;
  const password = "secret-pass";
  let workspaceId: number;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Pref Title User",
      password,
    });
    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    workspaceId = session.currentWorkspaceId;
    await page.close();
  });

  test("Given showTimeInTitle is ON (default), when a timer runs, then document.title contains the elapsed time", async ({
    page,
  }) => {
    await loginE2eUser(page, test.info(), { email, password });
    await startRunningEntry(page, workspaceId, "title-test");
    // Reload so React Query fetches the running entry
    await page.reload();
    await expect(page.getByTestId("app-shell")).toBeVisible();

    // Wait for the title update interval to kick in
    await expect
      .poll(async () => page.evaluate(() => document.title), { timeout: 10_000 })
      .toMatch(/\d+:\d+:\d+.*OpenToggl/);
  });

  test("Given showTimeInTitle is OFF, when a timer runs, then document.title stays 'OpenToggl'", async ({
    page,
  }) => {
    await loginE2eUser(page, test.info(), { email, password });

    // Turn off the preference
    await goToProfile(page);
    await togglePreferenceCheckbox(page, "Show running time in the title bar");

    // Start a timer and reload so React Query picks it up
    await goToTimer(page);
    await startRunningEntry(page, workspaceId, "title-off-test");
    await page.reload();
    await expect(page.getByTestId("app-shell")).toBeVisible();

    // Verify title stays "OpenToggl" even after timer ticks (showTimeInTitle is off).
    // Poll over 2s to confirm title never changes.
    await expect
      .poll(async () => page.evaluate(() => document.title), {
        intervals: [500],
        timeout: 2000,
      })
      .toBe("OpenToggl");
  });
});

// ─── showAnimations ──────────────────────────────────────────────────────────

test.describe("Story: showAnimations controls CSS animations globally", () => {
  const email = `pref-anim-${Date.now()}@example.com`;
  const password = "secret-pass";

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Pref Anim User",
      password,
    });
    await page.close();
  });

  test("Given showAnimations is ON (default), then html element does NOT have data-reduce-motion", async ({
    page,
  }) => {
    await loginE2eUser(page, test.info(), { email, password });
    const attr = await page.evaluate(() =>
      document.documentElement.getAttribute("data-reduce-motion"),
    );
    expect(attr).toBeNull();
  });

  test("Given showAnimations is OFF, then html element has data-reduce-motion attribute", async ({
    page,
  }) => {
    await loginE2eUser(page, test.info(), { email, password });

    await goToProfile(page);
    await togglePreferenceCheckbox(page, "Show animations");

    // Navigate away and check that the attribute is set globally
    await goToTimer(page);
    const attr = await page.evaluate(() =>
      document.documentElement.getAttribute("data-reduce-motion"),
    );
    expect(attr).not.toBeNull();
  });
});

// ─── isGoalsViewShown ────────────────────────────────────────────────────────

test.describe("Story: isGoalsViewShown controls goals section in sidebar", () => {
  test("Given isGoalsViewShown is ON (default), when sidebar is open, then goals section is visible", async ({
    page,
  }) => {
    const email = `pref-goals-on-${Date.now()}@example.com`;
    const password = "secret-pass";
    await registerE2eUser(page, test.info(), { email, fullName: "Pref Goals On", password });
    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    // Open the sidebar
    await page.getByRole("button", { name: "Toggle goals and favorites" }).click();
    const sidebar = page.getByTestId("goals-favorites-sidebar");
    await expect(sidebar).toBeVisible();

    // Goals section should be present (match the summary title, not "No goals yet")
    await expect(sidebar.locator("summary").filter({ hasText: "Goals" })).toBeVisible();
  });

  test("Given isGoalsViewShown is OFF, when sidebar is open, then goals section is hidden", async ({
    page,
  }) => {
    const email = `pref-goals-off-${Date.now()}@example.com`;
    const password = "secret-pass";
    await registerE2eUser(page, test.info(), { email, fullName: "Pref Goals Off", password });
    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    // Turn off the preference
    await goToProfile(page);
    await togglePreferenceCheckbox(page, "Show goals view");

    // Go to timer page and open sidebar
    await goToTimer(page);
    await page.getByRole("button", { name: "Toggle goals and favorites" }).click();
    const sidebar = page.getByTestId("goals-favorites-sidebar");
    await expect(sidebar).toBeVisible();

    // Goals section should NOT be present (but favorites should still be)
    await expect(sidebar.locator("summary").filter({ hasText: "Goals" })).not.toBeVisible();
    await expect(sidebar.locator("summary").filter({ hasText: "Favorites" })).toBeVisible();
  });
});
