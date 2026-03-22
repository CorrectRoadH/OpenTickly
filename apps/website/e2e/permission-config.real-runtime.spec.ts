import { expect, test, type Page, type TestInfo } from "@playwright/test";

type RuntimeSessionPayload = {
  current_workspace_id: number;
  workspaces: Array<{
    id: number;
    name: string;
  }>;
};

test("real runtime: admin updates workspace permission policy and reload keeps the saved toggles", async ({
  page,
}) => {
  const email = `permission-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
  const password = "secret-pass";
  const appBaseUrl = resolveAppBaseUrl(test.info());

  await registerUser(page, appBaseUrl, email, password);

  await page.context().clearCookies();
  const loginSession = await loginUser(page, appBaseUrl, email, password);
  const workspaceId = loginSession.current_workspace_id;
  const permissionPath = `/workspaces/${workspaceId}/permissions`;

  const initialPermissionsResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/web/v1/workspaces/${workspaceId}/permissions`) &&
      response.request().method() === "GET",
  );

  await page.goto(resolveAppUrl(appBaseUrl, permissionPath));

  const initialPermissionsResponse = await initialPermissionsResponsePromise;
  const initialPermissionsBody = await initialPermissionsResponse.text();

  expect(
    initialPermissionsResponse.status(),
    `Expected GET /web/v1/workspaces/${workspaceId}/permissions to return 200, got ${initialPermissionsResponse.status()} with body: ${initialPermissionsBody}`,
  ).toBe(200);

  await expect(page.getByRole("heading", { name: "Permission configuration" })).toBeVisible();

  const createProjectsToggle = page.getByLabel("Only admins may create projects");
  const createTagsToggle = page.getByLabel("Only admins may create tags");
  const teamDashboardToggle = page.getByLabel("Only admins see team dashboard");
  const publicProjectDataToggle = page.getByLabel("Limit public project data");

  await expect(createProjectsToggle).not.toBeChecked();
  await expect(createTagsToggle).not.toBeChecked();
  await expect(teamDashboardToggle).not.toBeChecked();
  await expect(publicProjectDataToggle).not.toBeChecked();

  await createProjectsToggle.check();
  await createTagsToggle.check();
  await teamDashboardToggle.check();
  await publicProjectDataToggle.check();

  const savePermissionsResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/web/v1/workspaces/${workspaceId}/permissions`) &&
      response.request().method() === "PATCH",
  );

  await page.getByRole("button", { name: "Save permissions" }).click();

  const savePermissionsResponse = await savePermissionsResponsePromise;
  const savePermissionsBody = await savePermissionsResponse.json();

  expect(
    savePermissionsResponse.status(),
    `Expected PATCH /web/v1/workspaces/${workspaceId}/permissions to return 200, got ${savePermissionsResponse.status()} with body: ${JSON.stringify(savePermissionsBody)}`,
  ).toBe(200);
  expect(savePermissionsBody).toMatchObject({
    limit_public_project_data: true,
    only_admins_may_create_projects: true,
    only_admins_may_create_tags: true,
    only_admins_see_team_dashboard: true,
  });

  await expect(page.getByText("Permissions saved")).toBeVisible();

  const reloadedPermissionsResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/web/v1/workspaces/${workspaceId}/permissions`) &&
      response.request().method() === "GET",
  );

  await page.reload();
  await reloadedPermissionsResponsePromise;

  await expect(createProjectsToggle).toBeChecked();
  await expect(createTagsToggle).toBeChecked();
  await expect(teamDashboardToggle).toBeChecked();
  await expect(publicProjectDataToggle).toBeChecked();
});

async function registerUser(page: Page, appBaseUrl: string, email: string, password: string) {
  await page.goto(resolveAppUrl(appBaseUrl, "/register"));
  await page.getByLabel("Full name").fill("Permission Runtime User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  const registerResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/web/v1/auth/register") && response.request().method() === "POST",
  );

  await page.getByRole("button", { name: "Register" }).click();

  const registerResponse = await registerResponsePromise;
  const registerBody = await registerResponse.text();

  expect(
    registerResponse.status(),
    `Expected POST /web/v1/auth/register to return 201, got ${registerResponse.status()} with body: ${registerBody}`,
  ).toBe(201);

  await expect(page.getByRole("heading", { name: "Workspace Overview" })).toBeVisible();
}

async function loginUser(
  page: Page,
  appBaseUrl: string,
  email: string,
  password: string,
): Promise<RuntimeSessionPayload> {
  await page.goto(resolveAppUrl(appBaseUrl, "/login"));
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/web/v1/auth/login") && response.request().method() === "POST",
  );

  await page.getByRole("button", { name: "Log in" }).click();

  const loginResponse = await loginResponsePromise;
  const loginBody = await loginResponse.text();

  expect(
    loginResponse.status(),
    `Expected POST /web/v1/auth/login to return 200, got ${loginResponse.status()} with body: ${loginBody}`,
  ).toBe(200);

  const loginSession = parseRuntimeSession(loginBody, "/web/v1/auth/login");
  const currentWorkspace = loginSession.workspaces.find(
    (workspace) => workspace.id === loginSession.current_workspace_id,
  );

  expect(
    currentWorkspace,
    `Expected login session payload to include current workspace ${loginSession.current_workspace_id}; body: ${loginBody}`,
  ).toBeDefined();

  const sessionResponse = await page.waitForResponse(
    (response) =>
      response.url().includes("/web/v1/session") && response.request().method() === "GET",
  );
  const sessionBody = await sessionResponse.text();

  expect(
    sessionResponse.status(),
    `Expected GET /web/v1/session to return 200, got ${sessionResponse.status()} with body: ${sessionBody}`,
  ).toBe(200);

  await expect(page).toHaveURL(new RegExp(`/workspaces/${loginSession.current_workspace_id}$`));
  await expect(page.getByRole("heading", { name: "Workspace Overview" })).toBeVisible();
  await expect(page.getByRole("main").getByText(currentWorkspace!.name)).toBeVisible();

  return loginSession;
}

function parseRuntimeSession(body: string, source: string): RuntimeSessionPayload {
  const payload = JSON.parse(body) as Partial<RuntimeSessionPayload>;

  if (typeof payload.current_workspace_id !== "number" || !Array.isArray(payload.workspaces)) {
    throw new Error(`Expected ${source} to return a session payload with workspace data: ${body}`);
  }

  return {
    current_workspace_id: payload.current_workspace_id,
    workspaces: payload.workspaces.map((workspace) => ({
      id: Number(workspace.id),
      name: String(workspace.name),
    })),
  };
}

function resolveAppBaseUrl(testInfo: TestInfo): string {
  const configuredBaseUrl = testInfo.project.use.baseURL;

  if (typeof configuredBaseUrl === "string" && configuredBaseUrl.length > 0) {
    return configuredBaseUrl;
  }

  return process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";
}

function resolveAppUrl(appBaseUrl: string, pathname: string): string {
  return new URL(pathname, appBaseUrl).toString();
}
