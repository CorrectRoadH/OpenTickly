import { expect, test, type Locator, type Page } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

/**
 * Manual time-entry creation from the calendar grid: drag across empty
 * slots → draft card + editor → "Add time entry" persists a stopped entry.
 */

async function setupEmptyCalendar(page: Page) {
  const email = `cal-create-${test.info().workerIndex}-${Date.now()}@example.com`;
  const password = "secret-pass";

  await registerE2eUser(page, test.info(), { email, fullName: "Calendar Create User", password });
  await page.context().clearCookies();
  const session = await loginE2eUser(page, test.info(), { email, password });

  await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
  await page.getByRole("radio", { name: "Calendar" }).click();
  await expect(page.getByTestId("timer-calendar-view")).toBeVisible();
  await expect(page.getByTestId("timer-calendar-view")).not.toHaveAttribute(
    "data-scroll-to-now",
    "pending",
  );
  return session;
}

function todayColumn(page: Page): Locator {
  return page.locator(".rbc-time-content .rbc-day-slot.rbc-today");
}

/** Drag inside today's column from one 30-minute slot index to another (inclusive). */
async function dragAcrossSlots(page: Page, fromSlot: number, toSlot: number) {
  const slots = todayColumn(page).locator(".rbc-time-slot");
  const from = slots.nth(fromSlot);
  const to = slots.nth(toSlot);
  await from.evaluate((el) => el.scrollIntoView({ block: "center" }));

  const fromBox = await from.boundingBox();
  if (!fromBox) throw new Error("start slot has no bounding box");
  await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + 2);
  await page.mouse.down();

  const toBox = await to.boundingBox();
  if (!toBox) throw new Error("end slot has no bounding box");
  await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, { steps: 10 });
  await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height - 2, { steps: 2 });
  await page.mouse.up();
}

async function listTimeEntries(page: Page) {
  return page.evaluate(async () => {
    const res = await fetch("/api/v9/me/time_entries", { credentials: "include" });
    return (await res.json()) as Array<{
      description: string | null;
      duration: number;
      start: string;
      stop: string | null;
    }>;
  });
}

test.describe("Calendar: create time entry manually", () => {
  test("dragging across empty slots opens the new-entry editor", async ({ page }) => {
    await setupEmptyCalendar(page);

    // 10:00 → 11:00 (step=30, so slot 20 is 10:00 and slot 21 ends at 11:00)
    await dragAcrossSlots(page, 20, 21);

    const editor = page.getByTestId("time-entry-editor-dialog");
    await expect(editor).toBeVisible();
    await expect(editor.getByRole("button", { name: "Add time entry" })).toBeVisible();
  });

  test("Add time entry persists the dragged range with its description", async ({ page }) => {
    await setupEmptyCalendar(page);
    const description = `cal-create-${Date.now()}`;

    await dragAcrossSlots(page, 20, 21);

    const editor = page.getByTestId("time-entry-editor-dialog");
    await expect(editor).toBeVisible();
    await editor.getByRole("textbox", { name: "Time entry description" }).fill(description);
    await editor.getByRole("button", { name: "Add time entry" }).click();
    await expect(editor).not.toBeVisible();

    await expect
      .poll(async () => (await listTimeEntries(page)).find((e) => e.description === description))
      .toMatchObject({ duration: 3600 });

    const created = (await listTimeEntries(page)).find((e) => e.description === description)!;
    expect(new Date(created.start).getUTCHours()).toBe(10);
    expect(new Date(created.stop!).getUTCHours()).toBe(11);

    // The saved entry renders as a regular (non-draft) card in the calendar.
    await expect(todayColumn(page).getByText(description)).toBeVisible();
  });

  test("a single click on an empty slot creates a 30-minute draft", async ({ page }) => {
    await setupEmptyCalendar(page);

    const slot = todayColumn(page).locator(".rbc-time-slot").nth(28); // 14:00
    await slot.evaluate((el) => el.scrollIntoView({ block: "center" }));
    // RBC's events container overlays the slots, so click by coordinates like a user would.
    const box = (await slot.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    const editor = page.getByTestId("time-entry-editor-dialog");
    await expect(editor).toBeVisible();
    await expect(editor.getByRole("button", { name: "Add time entry" })).toBeVisible();
  });

  test("closing the editor discards the draft without creating an entry", async ({ page }) => {
    await setupEmptyCalendar(page);

    await dragAcrossSlots(page, 20, 21);
    const editor = page.getByTestId("time-entry-editor-dialog");
    await expect(editor).toBeVisible();

    await editor.getByRole("button", { name: "Close editor" }).click();
    await expect(editor).not.toBeVisible();
    await expect(todayColumn(page).locator('[data-testid^="calendar-entry-"]')).toHaveCount(0);
    expect(await listTimeEntries(page)).toHaveLength(0);
  });
});
