import { expect, test } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

/**
 * Re-render regression: typing inside the time-entry editor must never
 * re-render sibling calendar entries.
 *
 * Each `CalendarEventCard` renders `useRenderCount()` into a visible
 * `<span data-testid="calendar-entry-rendercount-<id>">renders: N</span>`
 * (dev-only). This test captures the witness entry's count before typing,
 * opens the editor on a different entry, types into its description
 * field, and asserts the witness count text is unchanged.
 *
 * If a future change lifts transient dialog state (description / project /
 * tags) into a parent that also owns the calendar event list, this test
 * goes red — exactly the regression CLAUDE.md's "Rerender Hygiene"
 * section exists to prevent.
 */
test.describe("Calendar time entry re-render hygiene", () => {
  test("typing in the editor for one entry does not re-render the other calendar entries", async ({
    page,
  }) => {
    const email = `cal-rerender-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Calendar Rerender User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    // Two stopped entries today: A is the edit target, B is the witness
    // whose render count must not change while A's editor is being typed in.
    const now = new Date();
    const todayUtc = (hour: number, minute: number) =>
      new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0),
      );

    const entryIdA = await createTimeEntryForWorkspace(page, {
      description: "Rerender target A",
      start: todayUtc(10, 0).toISOString(),
      stop: todayUtc(11, 0).toISOString(),
      workspaceId: session.currentWorkspaceId,
    });
    const entryIdB = await createTimeEntryForWorkspace(page, {
      description: "Rerender witness B",
      start: todayUtc(11, 30).toISOString(),
      stop: todayUtc(12, 30).toISOString(),
      workspaceId: session.currentWorkspaceId,
    });

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await expect(page.getByTestId("timer-calendar-view")).toBeVisible();

    const counterA = page.getByTestId(`calendar-entry-rendercount-${entryIdA}`);
    const counterB = page.getByTestId(`calendar-entry-rendercount-${entryIdB}`);
    await expect(counterA).toBeVisible();
    await expect(counterB).toBeVisible();
    await expect(counterB).toHaveText(/^renders: \d+$/);

    // Baseline captured BEFORE any interaction — so the assertion covers
    // the full "open the editor + type" window. Opening the editor must
    // not re-render sibling entries, and neither must each keystroke.
    const witnessBaseline = await counterB.textContent();
    expect(witnessBaseline).toMatch(/^renders: \d+$/);

    // Open the editor for entry A via the inner card testid so the click
    // goes through the real onClick production users fire.
    await page.getByTestId(`calendar-entry-${entryIdA}`).click();
    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    const descriptionField = dialog.getByLabel("Time entry description");
    await descriptionField.click();
    await expect(descriptionField).toBeFocused();

    // 12 real keystrokes into A's description. If any of them propagate
    // state into a parent that the calendar entry list also subscribes
    // to, B's render count will jump.
    await descriptionField.pressSequentially("hello world!", { delay: 20 });

    // The witness must not have re-rendered between baseline and now —
    // neither on dialog open, focus, nor any keystroke.
    expect(await counterB.textContent()).toBe(witnessBaseline);
  });
});
