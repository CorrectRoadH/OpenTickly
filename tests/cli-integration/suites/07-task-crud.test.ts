/**
 * Story: As a user, I can manage tasks within a project.
 *
 * Acceptance:
 * - Tasks are created inside a project
 * - Tasks can have estimated seconds
 * - Tasks can be updated (active state, rename)
 * - Tasks can be deleted
 * - Timer can be started with a task association
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { toggl, togglJson } from "../helpers/toggl.ts";
import { provisionUser } from "../helpers/provisioning.ts";
import type { TestUser } from "../helpers/types.ts";

interface Task {
  id: number;
  name: string;
  active: boolean;
  estimated_seconds: number | null;
}

interface TimeEntry {
  id: number;
  description: string;
  task: { id: number; name: string } | null;
}

describe("Story: task CRUD lifecycle", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await provisionUser("task-crud");
    await toggl(["project", "create", "TaskHost"], { user });
  });

  afterAll(async () => {
    await toggl(["project", "delete", "TaskHost"], { user });
  });

  it("creates a task", async () => {
    const result = await toggl(
      ["task", "create", "--project", "TaskHost", "Design review"],
      { user },
    );
    expect(result.exitCode).toBe(0);
  });

  it("creates a task with estimated seconds", async () => {
    const result = await toggl(
      [
        "task",
        "create",
        "--project",
        "TaskHost",
        "Implementation",
        "--estimated-seconds",
        "7200",
      ],
      { user },
    );
    expect(result.exitCode).toBe(0);
  });

  it("lists both tasks", async () => {
    const tasks = await togglJson<Task[]>(["task", "list"], { user });
    const names = tasks.map((t) => t.name);
    expect(names).toContain("Design review");
    expect(names).toContain("Implementation");
  });

  it("updates a task to inactive", async () => {
    const result = await toggl(
      [
        "task",
        "update",
        "--project",
        "TaskHost",
        "Design review",
        "--active",
        "false",
      ],
      { user },
    );
    expect(result.exitCode).toBe(0);
  });

  it("renames a task", async () => {
    const result = await toggl(
      [
        "task",
        "rename",
        "--project",
        "TaskHost",
        "Implementation",
        "Final implementation",
      ],
      { user },
    );
    expect(result.exitCode).toBe(0);

    const tasks = await togglJson<Task[]>(["task", "list"], { user });
    const names = tasks.map((t) => t.name);
    expect(names).toContain("Final implementation");
    expect(names).not.toContain("Implementation");
  });

  it("deletes tasks", async () => {
    const d1 = await toggl(
      ["task", "delete", "--project", "TaskHost", "Design review"],
      { user },
    );
    expect(d1.exitCode).toBe(0);

    const d2 = await toggl(
      ["task", "delete", "--project", "TaskHost", "Final implementation"],
      { user },
    );
    expect(d2.exitCode).toBe(0);
  });

  it("lists tasks as empty", async () => {
    const tasks = await togglJson<Task[]>(["task", "list"], { user });
    expect(tasks).toHaveLength(0);
  });

  it("starts a timer with task association", async () => {
    await toggl(
      ["task", "create", "--project", "TaskHost", "Taskwork"],
      { user },
    );

    const result = await toggl(
      [
        "entry",
        "start",
        "-d",
        "With task",
        "-p",
        "TaskHost",
        "--task",
        "Taskwork",
      ],
      { user },
    );
    expect(result.exitCode).toBe(0);

    const running = await togglJson<TimeEntry>(["entry", "running"], { user });
    expect(running.description).toBe("With task");
    expect(running.task).toBeTruthy();
    expect(running.task!.name).toBe("Taskwork");

    await toggl(["entry", "stop"], { user });
    await toggl(
      ["task", "delete", "--project", "TaskHost", "Taskwork"],
      { user },
    );
  });
});
