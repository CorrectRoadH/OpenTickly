import { expect, type Page, type TestInfo } from "@playwright/test";

export type RuntimeWorkspaceSession = {
  currentWorkspaceId: number;
};

export async function registerRuntimeUser(
  page: Page,
  testInfo: TestInfo,
  options: {
    email: string;
    fullName: string;
    password: string;
  },
): Promise<void> {
  await page.goto(resolveAppUrl(resolveAppBaseUrl(testInfo), "/register"));
  await page.getByLabel("Full name").fill(options.fullName);
  await page.getByLabel("Email").fill(options.email);
  await page.getByLabel("Password").fill(options.password);

  await page.getByRole("button", { name: "Register" }).click();

  await page.waitForURL(/\/workspaces\/\d+$/);
  await expect(page.getByRole("heading", { name: "Time entries" })).toBeVisible();
}

export async function loginRuntimeUser(
  page: Page,
  testInfo: TestInfo,
  options: {
    email: string;
    password: string;
  },
): Promise<RuntimeWorkspaceSession> {
  await page.goto(resolveAppUrl(resolveAppBaseUrl(testInfo), "/login"));
  await page.getByLabel("Email").fill(options.email);
  await page.getByLabel("Password").fill(options.password);

  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/workspaces\/\d+$/);
  await expect(page.getByRole("heading", { name: "Time entries" })).toBeVisible();

  const currentWorkspaceId = extractWorkspaceId(page.url());

  await expect(page.getByLabel("Workspace")).toHaveValue(String(currentWorkspaceId));

  return {
    currentWorkspaceId,
  };
}

function resolveAppBaseUrl(testInfo: TestInfo): string {
  const configuredBaseUrl = testInfo.project.use.baseURL;

  if (typeof configuredBaseUrl === "string" && configuredBaseUrl.length > 0) {
    return configuredBaseUrl;
  }

  return process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
}

function resolveAppUrl(appBaseUrl: string, pathname: string): string {
  return new URL(pathname, appBaseUrl).toString();
}

function extractWorkspaceId(url: string): number {
  const match = url.match(/\/workspaces\/(\d+)$/);

  if (!match) {
    throw new Error(`Expected workspace URL after auth flow, got ${url}`);
  }

  return Number(match[1]);
}
