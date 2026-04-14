import { expect, test } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

/**
 * Re-render regression: toggling billable on one list entry must not
 * re-render the other list entries.
 *
 * Each `ListEntryRow` renders `useRenderCount()` into a dev-only badge
 * `<span data-testid="list-entry-rendercount-<id>">renders: N</span>`.
 * This test captures the witness entry's count, clicks the target's
 * billable button, waits for the target's aria-label to flip so the
 * optimistic update has landed, then asserts the witness count is
 * unchanged. If unrelated rows re-render on every mutation (because the
 * whole list is driven by a single query and rows aren't memoized with
 * stable entry identity), this test goes red.
 */
test.describe("List entry re-render hygiene", () => {
  test("toggling billable on one list entry does not re-render other list entries", async ({
    page,
  }) => {
    const email = `list-billable-rerender-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "List Billable Rerender User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    const now = new Date();
    const todayUtc = (hour: number, minute: number) =>
      new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0),
      );

    const entryIdA = await createTimeEntryForWorkspace(page, {
      description: "Billable target A",
      start: todayUtc(10, 0).toISOString(),
      stop: todayUtc(11, 0).toISOString(),
      workspaceId: session.currentWorkspaceId,
    });
    const entryIdB = await createTimeEntryForWorkspace(page, {
      description: "Billable witness B",
      start: todayUtc(11, 30).toISOString(),
      stop: todayUtc(12, 30).toISOString(),
      workspaceId: session.currentWorkspaceId,
    });

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Switch to list view.
    await page.getByRole("radio", { name: "List" }).click();
    await expect(page.getByTestId("timer-list-view")).toBeVisible();

    const counterA = page.getByTestId(`list-entry-rendercount-${entryIdA}`);
    const counterB = page.getByTestId(`list-entry-rendercount-${entryIdB}`);
    await expect(counterA).toBeVisible();
    await expect(counterB).toBeVisible();
    await expect(counterB).toHaveText(/^renders: \d+$/);

    const witnessBaseline = await counterB.textContent();
    expect(witnessBaseline).toMatch(/^renders: \d+$/);

    // Locate A's row and its billable button.
    const rowA = page.locator(`[data-testid="time-entry-list-row"][data-entry-id="${entryIdA}"]`);
    await expect(rowA).toBeVisible();

    // Hover so hover-only affordances (like billable when non-billable) reveal.
    await rowA.hover();
    const billableButton = rowA.getByRole("button", { name: "Set as billable" });
    await expect(billableButton).toBeVisible();
    await billableButton.click();

    // Wait for the optimistic update to flip the aria-label so we know the
    // mutation has propagated. The witness's re-render (if any) happens as
    // part of that propagation.
    await expect(rowA.getByRole("button", { name: "Set as non-billable" })).toBeVisible();

    // The witness row must not have re-rendered.
    expect(await counterB.textContent()).toBe(witnessBaseline);
  });
});
