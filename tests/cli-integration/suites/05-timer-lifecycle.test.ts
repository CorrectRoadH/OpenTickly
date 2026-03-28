/**
 * Story: As a user, I can track time with start, check running, stop, list,
 *        continue, show, and create entries with projects and billable flag.
 *
 * Acceptance:
 * - Start creates a running entry
 * - Running shows the current timer
 * - Stop ends the timer
 * - List returns completed entries
 * - Continue resumes the last entry
 * - Show retrieves a specific entry by ID
 * - Entries can be associated with projects and billable flag
 * - Entries with explicit start/end times are created as stopped
 *
 * Note: CLI JSON output uses `project` as an object { id, name, ... } | null,
 *       and `task` as an object | null (not plain strings/IDs).
 *       Tags on time entries are currently not persisted by the backend
 *       when passed by name at creation time.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { toggl, togglJson } from "../helpers/toggl.ts";
import { provisionUser } from "../helpers/provisioning.ts";
import type { TestUser } from "../helpers/types.ts";

interface TimeEntry {
  id: number;
  description: string;
  duration: number;
  project: { id: number; name: string } | null;
  tags: string[];
  billable: boolean;
  running: boolean;
}

describe("Story: timer lifecycle", () => {
  let user: TestUser;
  let firstEntryId: number;

  beforeAll(async () => {
    user = await provisionUser("timer");
  });

  it("starts a timer", async () => {
    const result = await toggl(["entry", "start", "-d", "Deep work"], { user });
    expect(result.exitCode).toBe(0);
  });

  it("shows the running entry", async () => {
    const running = await togglJson<TimeEntry>(["entry", "running"], { user });
    expect(running.description).toBe("Deep work");
    expect(running.running ?? true).toBe(true);
    expect(running.duration).toBeLessThan(0);
  });

  it("stops the timer", async () => {
    const stopped = await togglJson<TimeEntry>(["entry", "stop"], { user });
    expect(stopped.description).toBe("Deep work");
    expect(stopped.duration).toBeGreaterThanOrEqual(0);
    // `running` field may not exist in all CLI versions; duration >= 0 means stopped
    expect(stopped.running ?? false).toBe(false);
    firstEntryId = stopped.id;
  });

  it("lists entries and finds the stopped one", async () => {
    const entries = await togglJson<TimeEntry[]>(["entry", "list"], { user });
    expect(entries.some((e) => e.description === "Deep work")).toBe(true);
  });

  it("continues the last entry", async () => {
    const continued = await togglJson<TimeEntry>(["entry", "continue"], { user });
    expect(continued.description).toBe("Deep work");
    expect(continued.running ?? true).toBe(true);
  });

  it("running entry matches the continued one", async () => {
    const running = await togglJson<TimeEntry>(["entry", "running"], { user });
    expect(running.description).toBe("Deep work");
  });

  it("stops the continued entry", async () => {
    const result = await toggl(["entry", "stop"], { user });
    expect(result.exitCode).toBe(0);
  });

  it("now has 2 Deep work entries", async () => {
    const entries = await togglJson<TimeEntry[]>(["entry", "list"], { user });
    const deepWorkEntries = entries.filter((e) => e.description === "Deep work");
    expect(deepWorkEntries.length).toBeGreaterThanOrEqual(2);
  });

  it("shows a specific entry by ID", async () => {
    const entry = await togglJson<TimeEntry>(["entry", "show", String(firstEntryId)], { user });
    expect(entry.id).toBe(firstEntryId);
    expect(entry.description).toBe("Deep work");
  });

  it("creates an entry with explicit start/end times (already stopped)", async () => {
    const entry = await togglJson<TimeEntry>(
      [
        "entry",
        "start",
        "-d",
        "Meeting",
        "--start",
        "2026-03-27T09:00:00Z",
        "--end",
        "2026-03-27T10:00:00Z",
      ],
      { user },
    );
    expect(entry.description).toBe("Meeting");
    expect(entry.duration).toBeGreaterThan(0);
    expect(entry.running ?? false).toBe(false);
  });

  describe("entries with associations", () => {
    beforeAll(async () => {
      await toggl(["project", "create", "Focus"], { user });
    });

    it("starts entry with project", async () => {
      const result = await toggl(["entry", "start", "-d", "Project work", "-p", "Focus"], { user });
      expect(result.exitCode).toBe(0);

      const running = await togglJson<TimeEntry>(["entry", "running"], { user });
      expect(running.description).toBe("Project work");
      expect(running.project).toBeTruthy();
      expect(running.project!.name).toBe("Focus");

      await toggl(["entry", "stop"], { user });
    });

    it("starts entry with billable flag", async () => {
      const result = await toggl(["entry", "start", "-d", "Billable work", "--billable"], { user });
      expect(result.exitCode).toBe(0);

      const running = await togglJson<TimeEntry>(["entry", "running"], { user });
      expect(running.description).toBe("Billable work");
      expect(running.billable).toBe(true);

      await toggl(["entry", "stop"], { user });
    });
  });
});
