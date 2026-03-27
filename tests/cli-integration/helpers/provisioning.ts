import type { TestUser } from "./types.ts";

const baseUrl = () =>
  process.env.OPENTOGGL_CLI_TEST_BASE ?? "http://127.0.0.1:8080";

export async function provisionUser(label: string): Promise<TestUser> {
  const email = `cli-test-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.local`;
  const password = "TestPassword123!";
  const fullName = `CLI Test ${label}`;

  const registerRes = await fetch(`${baseUrl()}/web/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, fullname: fullName }),
  });
  if (!registerRes.ok) {
    throw new Error(
      `Register failed: ${registerRes.status} ${await registerRes.text()}`,
    );
  }
  const bootstrap = (await registerRes.json()) as {
    current_organization_id?: number;
    current_workspace_id?: number;
  };

  const auth = Buffer.from(`${email}:${password}`).toString("base64");
  const meRes = await fetch(`${baseUrl()}/api/v9/me`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!meRes.ok) {
    throw new Error(`GET /me failed: ${meRes.status}`);
  }
  const me = (await meRes.json()) as {
    api_token: string;
    default_workspace_id: number;
    id: number;
  };

  return {
    email,
    password,
    apiToken: me.api_token,
    workspaceId: bootstrap.current_workspace_id ?? me.default_workspace_id,
    organizationId: bootstrap.current_organization_id ?? 0,
    userId: me.id,
  };
}

/**
 * Create a second workspace for a user via HTTP API.
 * Useful for setup in beforeAll without depending on CLI correctness.
 */
export async function createWorkspaceViaAPI(
  user: TestUser,
  name: string,
): Promise<number> {
  const auth = Buffer.from(`${user.apiToken}:api_token`).toString("base64");
  const res = await fetch(
    `${baseUrl()}/api/v9/organizations/${user.organizationId}/workspaces`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({ name }),
    },
  );
  if (!res.ok) {
    throw new Error(
      `Create workspace failed: ${res.status} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { id: number };
  return body.id;
}

/**
 * Create a time entry in a specific workspace via HTTP API.
 * Useful for multi-workspace tests where the CLI may not target the desired workspace.
 */
export async function createTimeEntryViaAPI(
  user: TestUser,
  workspaceId: number,
  opts: {
    description: string;
    start: string;
    stop: string;
    projectId?: number;
  },
): Promise<number> {
  const auth = Buffer.from(`${user.apiToken}:api_token`).toString("base64");
  const res = await fetch(
    `${baseUrl()}/api/v9/workspaces/${workspaceId}/time_entries`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        created_with: "cli-integration-test",
        description: opts.description,
        duration: Math.round(
          (Date.parse(opts.stop) - Date.parse(opts.start)) / 1000,
        ),
        start: opts.start,
        stop: opts.stop,
        workspace_id: workspaceId,
        project_id: opts.projectId,
      }),
    },
  );
  if (!res.ok) {
    throw new Error(
      `Create time entry failed: ${res.status} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { id: number };
  return body.id;
}

/**
 * Create a project in a specific workspace via HTTP API.
 */
export async function createProjectViaAPI(
  user: TestUser,
  workspaceId: number,
  name: string,
): Promise<number> {
  const auth = Buffer.from(`${user.apiToken}:api_token`).toString("base64");
  const res = await fetch(
    `${baseUrl()}/api/v9/workspaces/${workspaceId}/projects`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({ name }),
    },
  );
  if (!res.ok) {
    throw new Error(
      `Create project failed: ${res.status} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { id: number };
  return body.id;
}
