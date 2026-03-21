import { expect, test, type Page, type TestInfo } from "@playwright/test";

type RuntimeSessionPayload = {
  current_workspace_id: number;
  workspaces: Array<{
    id: number;
    name: string;
  }>;
};

test("real runtime: login reaches project page and pin updates project state without API stubs", async ({
  page,
}) => {
  const email = `project-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
  const password = "secret-pass";
  const projectName = `Runtime Project ${Date.now()}`;
  const appBaseUrl = resolveAppBaseUrl(test.info());

  await registerUser(page, appBaseUrl, email, password);

  await page.context().clearCookies();
  const loginSession = await loginUser(page, appBaseUrl, email, password);
  const workspaceId = loginSession.current_workspace_id;

  const projectsListResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/web/v1/projects?workspace_id=${workspaceId}&status=all`) &&
      response.request().method() === "GET",
  );

  await page.getByRole("link", { name: "Projects" }).click();

  const projectsListResponse = await projectsListResponsePromise;
  const projectsListBody = await projectsListResponse.text();

  expect(
    projectsListResponse.status(),
    `Expected GET /web/v1/projects to return 200, got ${projectsListResponse.status()} with body: ${projectsListBody}`,
  ).toBe(200);

  await expect(page).toHaveURL(
    new RegExp(`/workspaces/${workspaceId}/projects(?:\\?status=all)?$`),
  );
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();

  await page.getByLabel("Project name").fill(projectName);

  const createProjectResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/web/v1/projects") && response.request().method() === "POST",
  );

  await page.getByRole("button", { name: "Save project" }).click();

  const createProjectResponse = await createProjectResponsePromise;
  const createProjectBody = await createProjectResponse.text();

  expect(
    createProjectResponse.status(),
    `Expected POST /web/v1/projects to return 201, got ${createProjectResponse.status()} with body: ${createProjectBody}`,
  ).toBe(201);

  await expect(page.getByText("Project created")).toBeVisible();

  const createdProjectRow = page.getByLabel(`Project ${projectName}`);

  await expect(createdProjectRow).toBeVisible();
  await expect(createdProjectRow.getByText("Project · Active")).toBeVisible();
  await expect(
    createdProjectRow.getByRole("button", { name: `Pin project ${projectName}` }),
  ).toBeVisible();

  const pinProjectResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/pin") &&
      response.url().includes("/web/v1/projects/") &&
      response.request().method() === "POST",
  );

  await createdProjectRow.getByRole("button", { name: `Pin project ${projectName}` }).click();

  const pinProjectResponse = await pinProjectResponsePromise;
  const pinProjectBody = await pinProjectResponse.text();

  expect(
    pinProjectResponse.status(),
    `Expected POST /web/v1/projects/:project_id/pin to return 200, got ${pinProjectResponse.status()} with body: ${pinProjectBody}`,
  ).toBe(200);

  await expect(page.getByText(`Pinned project ${projectName}`)).toBeVisible();
  await expect(createdProjectRow.getByText("Pinned")).toBeVisible();
  await expect(
    createdProjectRow.getByRole("button", { name: `Unpin project ${projectName}` }),
  ).toBeVisible();
});

async function registerUser(page: Page, appBaseUrl: string, email: string, password: string) {
  await page.goto(resolveAppUrl(appBaseUrl, "/register"));
  await page.getByLabel("Full name").fill("Project Runtime User");
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
