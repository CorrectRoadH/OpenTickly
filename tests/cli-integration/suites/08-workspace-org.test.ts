/**
 * Story: As a user, I can see my workspaces and organizations, create new
 *        workspaces, and rename them.
 *
 * Acceptance:
 * - Default workspace and organization are visible
 * - New workspaces can be created in an organization
 * - Workspaces can be renamed
 * - Organization details can be viewed by ID
 */
import { describe, it, expect, beforeAll } from "vitest";
import { toggl, togglJson } from "../helpers/toggl.ts";
import { provisionUser } from "../helpers/provisioning.ts";
import type { TestUser } from "../helpers/types.ts";

interface Workspace {
  id: number;
  name: string;
}

interface Organization {
  id: number;
  name: string;
}

describe("Story: workspace and organization management", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await provisionUser("ws-org");
  });

  it("lists at least one workspace", async () => {
    const workspaces = await togglJson<Workspace[]>(["workspace", "list"], { user });
    expect(workspaces.length).toBeGreaterThanOrEqual(1);
    expect(workspaces.some((w) => w.id === user.workspaceId)).toBe(true);
  });

  it("lists at least one organization", async () => {
    const orgs = await togglJson<Organization[]>(["org", "list"], { user });
    expect(orgs.length).toBeGreaterThanOrEqual(1);
  });

  it("shows organization details by ID", async () => {
    const org = await togglJson<Organization>(["org", "show", String(user.organizationId)], {
      user,
    });
    expect(org.id).toBe(user.organizationId);
  });

  it("creates a new workspace", async () => {
    const result = await toggl(
      ["workspace", "create", String(user.organizationId), "Side Project"],
      { user },
    );
    expect(result.exitCode).toBe(0);

    const workspaces = await togglJson<Workspace[]>(["workspace", "list"], { user });
    expect(workspaces.some((w) => w.name === "Side Project")).toBe(true);
    expect(workspaces.length).toBeGreaterThanOrEqual(2);
  });

  it("renames a workspace", async () => {
    const result = await toggl(["workspace", "rename", "Side Project", "Main Project"], { user });
    expect(result.exitCode).toBe(0);

    const workspaces = await togglJson<Workspace[]>(["workspace", "list"], { user });
    const names = workspaces.map((w) => w.name);
    expect(names).toContain("Main Project");
    expect(names).not.toContain("Side Project");
  });
});
