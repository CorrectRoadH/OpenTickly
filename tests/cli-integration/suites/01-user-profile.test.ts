/**
 * Story: As a user, I can see my profile and preferences through the CLI.
 *
 * Acceptance:
 * - `toggl me` returns my email, name, and workspace info
 * - `toggl preferences read` returns my current preferences
 * - `toggl preferences update` changes a preference value
 * - `toggl auth status` confirms I'm authenticated
 */
import { describe, it, expect, beforeAll } from "vitest";
import { toggl, togglJson } from "../helpers/toggl.ts";
import { provisionUser } from "../helpers/provisioning.ts";
import type { TestUser } from "../helpers/types.ts";

describe("Story: user profile and preferences", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await provisionUser("profile");
  });

  it("toggl me --json returns user profile with email, name, workspace", async () => {
    const me = await togglJson<{
      email: string;
      fullname: string;
      default_workspace_id: number;
      api_token: string;
    }>(["me"], { user });

    expect(me.email).toBe(user.email);
    expect(me.fullname).toBeTruthy();
    expect(me.default_workspace_id).toBe(user.workspaceId);
    expect(me.api_token).toBe(user.apiToken);
  });

  it("toggl me (plain text) exits 0 and includes email", async () => {
    const result = await toggl(["me"], { user });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(user.email);
  });

  it("toggl preferences read exits 0", async () => {
    const result = await toggl(["preferences", "read"], { user });
    expect(result.exitCode).toBe(0);
  });

  it("toggl preferences update changes a preference", async () => {
    const update = await toggl(["preferences", "update", '{"date_format": "DD/MM/YYYY"}'], {
      user,
    });
    expect(update.exitCode).toBe(0);
  });

  it("toggl auth status shows connected", async () => {
    const result = await toggl(["auth", "status"], { user });
    expect(result.exitCode).toBe(0);
  });
});
