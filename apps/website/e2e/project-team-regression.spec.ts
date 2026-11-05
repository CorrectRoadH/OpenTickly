import { expect, test } from "@playwright/test";
import {
  createProjectForWorkspace,
  readSessionBootstrap,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";

test.beforeEach(async ({ page }, testInfo) => {
  await registerE2eUser(page, testInfo, {
    email: `team-project-${Date.now()}-${testInfo.workerIndex}@example.com`,
    fullName: "Team Owner",
    password: "test-team-password",
  });
});

async function prepareProject(page: import("@playwright/test").Page) {
  const session = await readSessionBootstrap(page);
  const workspaceId = session.current_workspace_id!;
  const name = "Team project";
  const projectId = await createProjectForWorkspace(page, { workspaceId, name });
  const publicProject = await page.request.put(
    `/api/v9/workspaces/${workspaceId}/projects/${projectId}`,
    {
      data: { is_private: false },
    },
  );
  expect(publicProject.ok()).toBeTruthy();
  expect((await publicProject.json()).is_private).toBe(false);
  const groupId = await page.evaluate(async (workspaceId) => {
    const response = await fetch(`/api/v9/workspaces/${workspaceId}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Engineering" }),
    });
    if (!response.ok) throw new Error(`create group: ${response.status}`);
    return (await response.json()).id as number;
  }, workspaceId);
  await page.goto(`/projects/${workspaceId}/list`);
  await expect(page.getByTestId("projects-page")).toBeVisible();
  await expect(page.getByTestId("projects-list")).toContainText(name);
  await expect(page.getByRole("button", { name: `Team ${name}`, exact: true })).toContainText(
    "Everyone",
  );
  return {
    workspaceId,
    projectId,
    groupId,
    trigger: page.getByRole("button", { name: `Team ${name}`, exact: true }),
  };
}

test("team assignment survives reload and switching back to Everyone", async ({
  page,
}, testInfo) => {
  const { trigger, workspaceId, projectId, groupId } = await prepareProject(page);
  await trigger.click();
  await page.getByRole("option", { name: "Engineering", exact: true }).click();
  await expect(trigger).toContainText("Engineering");
  await page.reload();
  await expect(page.getByTestId("projects-page")).toBeVisible();
  await expect(trigger).toContainText("Engineering");
  const assignments = await page.request.get(
    `/api/v9/workspaces/${workspaceId}/project_groups?project_ids=${projectId}`,
  );
  expect(assignments.ok()).toBeTruthy();
  expect(await assignments.json()).toEqual([
    expect.objectContaining({ pid: projectId, group_id: groupId }),
  ]);
  await page.screenshot({ path: testInfo.outputPath("team-assigned.png") });
  await trigger.click();
  await page.getByRole("option", { name: "Everyone", exact: true }).click();
  await expect(trigger).toContainText("Everyone");
  await page.reload();
  await expect(page.getByTestId("projects-page")).toBeVisible();
  await expect(trigger).toContainText("Everyone");
  const cleared = await page.request.get(
    `/api/v9/workspaces/${workspaceId}/project_groups?project_ids=${projectId}`,
  );
  expect(await cleared.json()).toEqual([]);
});

test("rejected team assignment preserves public visibility", async ({ page }) => {
  const { trigger, workspaceId, projectId } = await prepareProject(page);
  await page.route(`**/workspaces/${workspaceId}/project_groups`, async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ message: "Assignment rejected" }),
      });
    } else await route.continue();
  });
  await trigger.click();
  await page.getByRole("option", { name: "Engineering", exact: true }).click();
  await expect(page.getByText("Assignment rejected")).toBeVisible();
  const project = await page.request.get(`/api/v9/workspaces/${workspaceId}/projects/${projectId}`);
  expect((await project.json()).is_private).toBe(false);
  await page.reload();
  await expect(page.getByTestId("projects-page")).toBeVisible();
  await expect(trigger).toContainText("Everyone");
});

test("failed privacy update removes the newly added team", async ({ page }) => {
  const { trigger, workspaceId, projectId } = await prepareProject(page);
  await page.route(`**/workspaces/${workspaceId}/projects/${projectId}`, async (route) => {
    if (route.request().method() === "PUT") {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ message: "Privacy rejected" }),
      });
    } else await route.continue();
  });
  await trigger.click();
  await page.getByRole("option", { name: "Engineering", exact: true }).click();
  await expect(page.getByText("Privacy rejected")).toBeVisible();
  const groups = await page.request.get(
    `/api/v9/workspaces/${workspaceId}/project_groups?project_ids=${projectId}`,
  );
  expect(await groups.json()).toEqual([]);
  await page.reload();
  await expect(page.getByTestId("projects-page")).toBeVisible();
  await expect(trigger).toContainText("Everyone");
});

test("failed removal of the old team preserves it when switching teams", async ({ page }) => {
  const { trigger, workspaceId, projectId, groupId } = await prepareProject(page);
  await trigger.click();
  await page.getByRole("option", { name: "Engineering", exact: true }).click();
  await expect(trigger).toContainText("Engineering");
  const second = await page.request.post(`/api/v9/workspaces/${workspaceId}/groups`, {
    data: { name: "Support" },
  });
  expect(second.ok()).toBeTruthy();
  await page.reload();
  await expect(page.getByTestId("projects-page")).toBeVisible();
  await expect(trigger).toContainText("Engineering");
  const groupsUrl = `/api/v9/workspaces/${workspaceId}/project_groups?project_ids=${projectId}`;
  const groups = await (await page.request.get(groupsUrl)).json();
  await page.route(`**/workspaces/${workspaceId}/project_groups/${groups[0].id}`, async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ message: "Removal rejected" }),
    });
  });
  await trigger.click();
  await page.getByRole("option", { name: "Support", exact: true }).click();
  await expect(page.getByText("Removal rejected")).toBeVisible();
  expect(await (await page.request.get(groupsUrl)).json()).toEqual([
    expect.objectContaining({ group_id: groupId }),
  ]);
  await page.reload();
  await expect(page.getByTestId("projects-page")).toBeVisible();
  await expect(trigger).toContainText("Engineering");
});

test("team controls stay disabled until the assignment finishes", async ({ page }) => {
  const { trigger, workspaceId } = await prepareProject(page);
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/workspaces/${workspaceId}/project_groups`, async (route) => {
    if (route.request().method() === "POST") await held;
    await route.continue();
  });
  try {
    await trigger.click();
    await page.getByRole("option", { name: "Engineering", exact: true }).click();
    await expect(trigger).toBeDisabled();
  } finally {
    release();
  }
  await expect(trigger).toContainText("Engineering");
  await expect(trigger).toBeEnabled();
});
