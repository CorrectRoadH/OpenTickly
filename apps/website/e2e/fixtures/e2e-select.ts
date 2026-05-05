import { expect, type Page } from "@playwright/test";

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
  const trigger = page.getByTestId(testId);
  await expect(trigger).toBeVisible();
  await trigger.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const option = page.getByRole("option", { name: optionLabel });
  await expect(option).toBeVisible();
  await option.press("Enter");
}
