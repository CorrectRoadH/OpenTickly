/**
 * Story: A single user with multiple workspaces sees data scoped to the
 *        correct workspace. Projects and entries created in workspace A
 *        are distinct from workspace B.
 *
 * Acceptance:
 * - User's default workspace contains data created via CLI
 * - Data created via API in a second workspace is separate
 * - The CLI's project/entry list reflects the user's home workspace scope
 */
import { describe, it, expect, beforeAll } from "vitest";
import { toggl, togglJson } from "../helpers/toggl.ts";
import {
  provisionUser,
  createWorkspaceViaAPI,
  createTimeEntryViaAPI,
  createProjectViaAPI,
} from "../helpers/provisioning.ts";
import type { TestUser } from "../helpers/types.ts";

interface Project {
  id: number;
  name: string;
}

interface TimeEntry {
  id: number;
  description: string;
  workspace_id: number;
}

describe("Story: single user, multi-workspace data scoping", () => {
  let user: TestUser;
  let workspaceBId: number;

  beforeAll(async () => {
    user = await provisionUser("multi-ws");
    workspaceBId = await createWorkspaceViaAPI(user, "WS-B");

    // Create data in the default workspace (WS-A) via CLI
    await toggl(["project", "create", "WS-A Project"], { user });
    // Use explicit times to ensure a non-zero-duration entry
    await toggl(
      [
        "entry",
        "start",
        "-d",
        "WS-A Work",
        "--start",
        "2026-03-27T08:00:00Z",
        "--end",
        "2026-03-27T09:00:00Z",
      ],
      { user },
    );

    // Create data in WS-B via API (CLI targets user's home workspace)
    await createProjectViaAPI(user, workspaceBId, "WS-B Project");
    await createTimeEntryViaAPI(user, workspaceBId, {
      description: "WS-B Work",
      start: "2026-03-27T10:00:00Z",
      stop: "2026-03-27T11:00:00Z",
    });
  });

  it("CLI project list shows WS-A projects (user's home workspace)", async () => {
    const projects = await togglJson<Project[]>(["project", "list"], { user });
    const names = projects.map((p) => p.name);
    expect(names).toContain("WS-A Project");
  });

  it("CLI entry list includes WS-A entries", async () => {
    const entries = await togglJson<TimeEntry[]>(
      ["entry", "list"],
      { user },
    );
    // The CLI's entry list returns entries from all workspaces via /me/time_entries.
    // WS-A entries should be present.
    expect(entries.some((e) => e.description === "WS-A Work")).toBe(true);
  });

  it("WS-A project list does not contain WS-B project", async () => {
    const projects = await togglJson<Project[]>(["project", "list"], { user });
    const names = projects.map((p) => p.name);
    expect(names).not.toContain("WS-B Project");
  });

  it("user has two workspaces visible", async () => {
    const workspaces = await togglJson<{ id: number; name: string }[]>(
      ["workspace", "list"],
      { user },
    );
    expect(workspaces.length).toBeGreaterThanOrEqual(2);
    expect(workspaces.some((w) => w.id === workspaceBId)).toBe(true);
  });
});
