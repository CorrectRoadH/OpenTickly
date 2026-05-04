import { expect, test } from "@playwright/test";

import {
  createProjectForWorkspace,
  createTagForWorkspace,
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";

/**
 * Reproduction: timezone boundary bug causes early-morning entries to
 * disappear from the calendar view.
 *
 * Root cause: the Toggl Track API filters entries by UTC `start` date.
 * When the browser is in a positive-offset timezone (e.g. UTC+8), entries
 * between 00:00–07:59 local time have UTC `start` on the PREVIOUS day.
 * The query's `start_date` (computed from the local week) excludes them.
 *
 * Scenario (Asia/Shanghai, UTC+8, Monday 2026-05-04):
 *   Entry C  08:13 CST (00:13 UTC)  "Task Charlie"  RUNNING
 *   Entry B  08:02 CST (00:02 UTC)  "Task Bravo"
 *   Entry A  07:51 CST (23:51 UTC prev day)  "Task Alpha"  ← API excludes it
 *
 * The API request is `start_date=2026-05-04` (UTC), which filters out
 * Entry A because its UTC start is 2026-05-03T23:51:00Z.
 */
test.describe("Timezone boundary hides early-morning entries", () => {
  test.use({ timezoneId: "Asia/Shanghai" });

  test("entries before 08:00 local time disappear from calendar when week starts on same UTC day", async ({
    page,
  }) => {
    // Freeze clock at 2026-05-04 16:00 CST (08:00 UTC). This is a Monday,
    // so the week range query will be start_date=2026-05-04 (in UTC).
    const fakeNow = Date.UTC(2026, 4, 4, 8, 0, 0);
    await page.clock.install({ time: fakeNow });

    const email = `tz-boundary-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Timezone Boundary User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    const projectId = await createProjectForWorkspace(page, {
      name: "Project",
      workspaceId: session.currentWorkspaceId,
    });
    const tagId = await createTagForWorkspace(page, {
      name: "Tag",
      workspaceId: session.currentWorkspaceId,
    });

    // Entry A: 07:51 CST = 2026-05-03T23:51:00Z (PREVIOUS UTC day)
    const entryAId = await createTimeEntryForWorkspace(page, {
      description: "Task Alpha",
      projectId,
      start: new Date(Date.UTC(2026, 4, 3, 23, 51, 0)).toISOString(),
      stop: new Date(Date.UTC(2026, 4, 4, 0, 2, 0)).toISOString(),
      tagIds: [tagId],
      workspaceId: session.currentWorkspaceId,
    });

    // Entry B: 08:02 CST = 2026-05-04T00:02:00Z (today in UTC)
    const entryBId = await createTimeEntryForWorkspace(page, {
      description: "Task Bravo",
      projectId,
      start: new Date(Date.UTC(2026, 4, 4, 0, 2, 0)).toISOString(),
      stop: new Date(Date.UTC(2026, 4, 4, 0, 13, 0)).toISOString(),
      workspaceId: session.currentWorkspaceId,
    });

    // Entry C: 08:13 CST = 2026-05-04T00:13:00Z, RUNNING (no stop)
    const entryCId = await page.evaluate(
      async (req) => {
        const response = await fetch(`/api/v9/workspaces/${req.workspaceId}/time_entries`, {
          body: JSON.stringify({
            created_with: "playwright-e2e",
            description: req.description,
            duration: -1,
            project_id: req.projectId,
            start: req.start,
            tag_ids: req.tagIds,
            workspace_id: req.workspaceId,
          }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        if (!response.ok) throw new Error(`Create running entry failed with ${response.status}`);
        const payload = await response.json();
        return payload.id ?? 0;
      },
      {
        description: "Task Charlie",
        projectId,
        start: new Date(Date.UTC(2026, 4, 4, 0, 13, 0)).toISOString(),
        tagIds: [tagId],
        workspaceId: session.currentWorkspaceId,
      },
    );

    expect(entryAId).toBeGreaterThan(0);
    expect(entryBId).toBeGreaterThan(0);
    expect(entryCId).toBeGreaterThan(0);

    // Navigate to timer page. Calendar view is the default.
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await expect(page.getByTestId("timer-calendar-view")).toBeVisible();

    // Wait for scroll-to-now to complete.
    await expect(page.getByTestId("timer-calendar-view")).toHaveAttribute(
      "data-scroll-to-now",
      /^(done|skipped)$/,
    );

    // Cards B and C should be in the DOM (their UTC start is within the
    // queried date range). Card A starts on the previous UTC day, so the
    // API query (start_date=2026-05-04 UTC) excludes it.
    const cardB = page.getByTestId(`calendar-entry-${entryBId}`);
    const cardC = page.getByTestId(`calendar-entry-${entryCId}`);
    await expect(cardB).toBeAttached();
    await expect(cardC).toBeAttached();

    // BUG REPRODUCTION: card A should be visible but the API doesn't
    // return it, so it's absent from the DOM.
    const cardA = page.getByTestId(`calendar-entry-${entryAId}`);
    await expect(cardA).toBeAttached();
  });
});
