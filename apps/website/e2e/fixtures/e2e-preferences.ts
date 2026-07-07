import type { Page } from "@playwright/test";

import { selectDropdownOption } from "./e2e-select.ts";

/**
 * Runs a preference-mutating action and waits for the autosave round-trip.
 * Autosave debounces at 900ms, then POSTs /me/preferences — 5s covers the
 * debounce plus network margin while still failing fast when the save breaks.
 */
async function waitForPreferenceSave(page: Page, action: () => Promise<void>): Promise<void> {
  // Start listening before the action to avoid race conditions
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/me/preferences") && response.request().method() === "POST",
    { timeout: 5_000 },
  );
  await action();
  await responsePromise;
}

/**
 * Toggle a checkbox preference on the profile page and wait for the save round-trip.
 * The label text must match the visible checkbox label exactly.
 */
export async function togglePreferenceCheckbox(page: Page, label: string): Promise<void> {
  await waitForPreferenceSave(page, () => page.getByLabel(label).click());
}

/** Change a select preference via its dropdown and wait for the save round-trip. */
export async function changePreferenceSelect(
  page: Page,
  testId: string,
  optionLabel: string,
): Promise<void> {
  await waitForPreferenceSave(page, () => selectDropdownOption(page, testId, optionLabel));
}
