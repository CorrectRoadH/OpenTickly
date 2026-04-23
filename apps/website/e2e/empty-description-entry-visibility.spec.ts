import { expect, test } from "@playwright/test";

import {
  createProjectForWorkspace,
  createTagForWorkspace,
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";

/**
 * Reproduction: two time entries with a project + tag but no description.
 *
 * Symptom reported by user: two adjacent 30-minute entries (01:00–01:30,
 * 01:30–02:00 UTC) that share the same project and tag and carry no
 * description are "invisible" on the web UI — the user can see them in
 * the CLI (via `toggl`) but not in the timer page.
 *
 * Suspected cause: `collapseSimilarEntries` in overview-data.ts keys rows
 * by `description + project_id + tag_ids`. Two empty-description entries
 * with matching project + tags collide on that key and collapse into a
 * single representative row in the list view. The individual
 * `data-entry-id` for the non-representative entry never appears in the
 * DOM unless the user discovers the count badge and expands the group.
 *
 * Calendar view does not collapse — both cards should be individually
 * addressable there.
 *
 * This spec asserts the expected user-facing invariant: each created
 * entry must be independently visible (by `data-entry-id` in list view,
 * by `calendar-entry-<id>` testid in calendar view). If the list-view
 * assertion fails, we have reproduced the bug.
 */
test.describe("Empty-description time entry visibility", () => {
  test("two entries with tag + project + empty description are each visible on the timer page", async ({
    page,
  }) => {
    // Freeze clock well after the seeded entries (01:00–02:00 UTC) so the
    // calendar's scroll-to-now target is far below them. This deterministically
    // exercises the "entries above 'now' must stay in viewport" fix —
    // otherwise whether the bug reproduces depends on the CI wall clock.
    const now = new Date();
    const todayUtc = (hour: number, minute: number) =>
      new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0),
      );
    await page.clock.install({ time: todayUtc(16, 0) });

    const email = `empty-desc-visibility-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Empty Description Visibility User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    const projectId = await createProjectForWorkspace(page, {
      name: "休息",
      workspaceId: session.currentWorkspaceId,
    });
    const tagId = await createTagForWorkspace(page, {
      name: "3 象限",
      workspaceId: session.currentWorkspaceId,
    });

    const firstEntryId = await createTimeEntryForWorkspace(page, {
      description: "",
      projectId,
      start: todayUtc(1, 0).toISOString(),
      stop: todayUtc(1, 30).toISOString(),
      tagIds: [tagId],
      workspaceId: session.currentWorkspaceId,
    });
    const secondEntryId = await createTimeEntryForWorkspace(page, {
      description: "",
      projectId,
      start: todayUtc(1, 30).toISOString(),
      stop: todayUtc(2, 0).toISOString(),
      tagIds: [tagId],
      workspaceId: session.currentWorkspaceId,
    });

    expect(firstEntryId).toBeGreaterThan(0);
    expect(secondEntryId).toBeGreaterThan(0);
    expect(firstEntryId).not.toBe(secondEntryId);

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // --- Calendar view ---
    // The cards exist in the DOM (toBeVisible passes), but the timeline
    // scrolls to a fixed anchor (typically "now" or working hours) — so
    // an entry at 01:00 UTC is rendered above the scroll viewport and
    // the user literally does not see it without scrolling up. Assert
    // both DOM visibility AND in-viewport to catch this.
    await page.getByTestId("view-tab-calendar").click();
    await expect(page.getByTestId("timer-calendar-view")).toBeVisible();

    const firstCalendarCard = page.getByTestId(`calendar-entry-${firstEntryId}`);
    const secondCalendarCard = page.getByTestId(`calendar-entry-${secondEntryId}`);

    await expect(firstCalendarCard).toBeVisible();
    await expect(secondCalendarCard).toBeVisible();

    await expect(firstCalendarCard).toBeInViewport();
    await expect(secondCalendarCard).toBeInViewport();

    // --- List view: reproduces the bug ---
    await page.getByTestId("view-tab-list").click();
    await expect(page.getByTestId("timer-list-view")).toBeVisible();

    const firstRow = page.locator(
      `[data-testid="time-entry-list-row"][data-entry-id="${firstEntryId}"]`,
    );
    const secondRow = page.locator(
      `[data-testid="time-entry-list-row"][data-entry-id="${secondEntryId}"]`,
    );

    // `collapseSimilarEntries` in overview-data.ts keys rows by
    // description + project_id + tag_ids. Two empty-description entries
    // that share project + tags collide on that key and merge into a
    // single representative row. The non-representative `data-entry-id`
    // never appears in the DOM — that is the user's "看不到" report.
    await expect(firstRow).toBeVisible();
    await expect(secondRow).toBeVisible();
  });
});
