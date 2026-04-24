import type { Page } from "@playwright/test";

/**
 * Select an option from a custom SelectDropdown component (button + listbox).
 *
 * Works with the @opentickly/web-ui SelectDropdown which renders:
 *   <button data-testid="..." aria-haspopup="listbox"> (trigger)
 *   <div role="listbox"> → <button role="option"> (options)
 *
 * @param page - Playwright Page (options may be portalled to body)
 * @param testId - data-testid of the trigger button
 * @param optionLabel - visible label text of the option to select
 */
export async function selectDropdownOption(
  page: Page,
  testId: string,
  optionLabel: string,
): Promise<void> {
  await page.getByTestId(testId).click();
  await page.getByRole("option", { name: optionLabel }).click();
}
