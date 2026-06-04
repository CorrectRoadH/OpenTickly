import { devices } from "@playwright/test";

export const mobileChromeDevice = {
  ...devices["iPhone 13"],
  defaultBrowserType: "chromium" as const,
};
