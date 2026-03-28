/**
 * Story: As a user, I can create, list, rename, and delete projects.
 *
 * Acceptance:
 * - Created projects appear in the list
 * - Renamed projects reflect the new name
 * - Deleted projects disappear from the list
 * - Custom color can be set on creation
 */
import { describe, it, expect, beforeAll } from "vitest";
import { toggl, togglJson } from "../helpers/toggl.ts";
import { provisionUser } from "../helpers/provisioning.ts";
import type { TestUser } from "../helpers/types.ts";

interface Project {
  id: number;
  name: string;
  color: string;
}

describe("Story: project CRUD lifecycle", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await provisionUser("project-crud");
  });

  it("creates a project", async () => {
    const result = await toggl(["project", "create", "Alpha"], { user });
    expect(result.exitCode).toBe(0);
  });

  it("lists projects and finds the created one", async () => {
    const projects = await togglJson<Project[]>(["project", "list"], { user });
    expect(projects.some((p) => p.name === "Alpha")).toBe(true);
  });

  it("creates a project with custom color", async () => {
    const result = await toggl(["project", "create", "Beta", "--color", "#ff0000"], { user });
    expect(result.exitCode).toBe(0);

    const projects = await togglJson<Project[]>(["project", "list"], { user });
    expect(projects.some((p) => p.name === "Beta")).toBe(true);
  });

  it("lists both projects", async () => {
    const projects = await togglJson<Project[]>(["project", "list"], { user });
    const names = projects.map((p) => p.name);
    expect(names).toContain("Alpha");
    expect(names).toContain("Beta");
  });

  it("renames a project", async () => {
    const result = await toggl(["project", "rename", "Alpha", "Gamma"], { user });
    expect(result.exitCode).toBe(0);

    const projects = await togglJson<Project[]>(["project", "list"], { user });
    const names = projects.map((p) => p.name);
    expect(names).toContain("Gamma");
    expect(names).not.toContain("Alpha");
    expect(names).toContain("Beta");
  });

  it("deletes projects", async () => {
    const del1 = await toggl(["project", "delete", "Gamma"], { user });
    expect(del1.exitCode).toBe(0);

    const del2 = await toggl(["project", "delete", "Beta"], { user });
    expect(del2.exitCode).toBe(0);
  });

  it("lists projects as empty after deletion", async () => {
    const projects = await togglJson<Project[]>(["project", "list"], { user });
    expect(projects).toHaveLength(0);
  });
});
