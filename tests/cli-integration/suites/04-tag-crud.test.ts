/**
 * Story: As a user, I can manage tags through the CLI.
 *
 * Acceptance:
 * - Create, list, rename, and delete tags
 * - Names update correctly after rename
 * - List is empty after all deletions
 */
import { describe, it, expect, beforeAll } from "vitest";
import { toggl, togglJson } from "../helpers/toggl.ts";
import { provisionUser } from "../helpers/provisioning.ts";
import type { TestUser } from "../helpers/types.ts";

interface Tag {
  id: number;
  name: string;
}

describe("Story: tag CRUD lifecycle", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await provisionUser("tag-crud");
  });

  it("creates tags", async () => {
    const r1 = await toggl(["tag", "create", "billable"], { user });
    expect(r1.exitCode).toBe(0);

    const r2 = await toggl(["tag", "create", "internal"], { user });
    expect(r2.exitCode).toBe(0);
  });

  it("lists both tags", async () => {
    const tags = await togglJson<Tag[]>(["tag", "list"], { user });
    const names = tags.map((t) => t.name);
    expect(names).toContain("billable");
    expect(names).toContain("internal");
  });

  it("renames a tag", async () => {
    const result = await toggl(["tag", "rename", "billable", "client-billable"], { user });
    expect(result.exitCode).toBe(0);

    const tags = await togglJson<Tag[]>(["tag", "list"], { user });
    const names = tags.map((t) => t.name);
    expect(names).toContain("client-billable");
    expect(names).not.toContain("billable");
  });

  it("deletes all tags", async () => {
    const d1 = await toggl(["tag", "delete", "client-billable"], { user });
    expect(d1.exitCode).toBe(0);

    const d2 = await toggl(["tag", "delete", "internal"], { user });
    expect(d2.exitCode).toBe(0);
  });

  it("lists tags as empty", async () => {
    const tags = await togglJson<Tag[]>(["tag", "list"], { user });
    expect(tags).toHaveLength(0);
  });
});
