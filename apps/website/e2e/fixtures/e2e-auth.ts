import { expect, type Page, type TestInfo } from "@playwright/test";

export type E2eWorkspaceSession = {
  currentWorkspaceId: number;
};

export async function registerE2eUser(
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

  await page.waitForURL(/\/timer(?:\?.*)?$/);
  const currentWorkspaceId = await resolveCurrentWorkspaceId(page);
  await expect(page.getByTestId("app-shell")).toBeVisible();
  await expect(page.getByLabel("Workspace")).toHaveValue(String(currentWorkspaceId));
}

export async function loginE2eUser(
  page: Page,
  testInfo: TestInfo,
  options: {
    email: string;
    password: string;
  },
): Promise<E2eWorkspaceSession> {
  await page.goto(resolveAppUrl(resolveAppBaseUrl(testInfo), "/login"));
  await page.getByLabel("Email").fill(options.email);
  await page.getByLabel("Password").fill(options.password);

  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/timer(?:\?.*)?$/);
  await expect(page.getByTestId("app-shell")).toBeVisible();

  const currentWorkspaceId = await resolveCurrentWorkspaceId(page);

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

async function resolveCurrentWorkspaceId(page: Page): Promise<number> {
  return Number(await page.getByLabel("Workspace").inputValue());
}
