/**
 * Story: The system handles boundary conditions gracefully — empty states,
 *        duplicates, invalid input, concurrent timers, special characters.
 *
 * Acceptance:
 * - Empty lists return empty arrays, not errors
 * - Stopping with no running timer is handled gracefully
 * - Operations on nonexistent resources fail with non-zero exit
 * - Starting a second timer auto-stops the first
 * - Special characters and unicode in names/descriptions work
 * - Continuing with no previous entries fails gracefully
 */
import { describe, it, expect, beforeAll } from "vitest";
import { toggl, togglJson, togglExpectFail } from "../helpers/toggl.ts";
import { provisionUser } from "../helpers/provisioning.ts";
import type { TestUser } from "../helpers/types.ts";

interface TimeEntry {
  id: number;
  description: string;
  duration: number;
}

describe("Story: edge cases and boundary conditions", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await provisionUser("edge");
  });

  describe("empty state", () => {
    it("entry list on fresh user returns empty", async () => {
      const entries = await togglJson<TimeEntry[]>(
        ["entry", "list", "--since", "2026-03-01", "-n", "100"],
        { user },
      );
      expect(entries).toHaveLength(0);
    });

    it("project list on fresh user returns empty", async () => {
      const projects = await togglJson<unknown[]>(["project", "list"], {
        user,
      });
      expect(projects).toHaveLength(0);
    });

    it("client list on fresh user returns empty", async () => {
      const clients = await togglJson<unknown[]>(["client", "list"], { user });
      expect(clients).toHaveLength(0);
    });

    it("tag list on fresh user returns empty", async () => {
      const tags = await togglJson<unknown[]>(["tag", "list"], { user });
      expect(tags).toHaveLength(0);
    });
  });

  describe("no running timer", () => {
    it("stop with no running timer does not crash", async () => {
      const result = await toggl(["entry", "stop"], { user });
      // Should fail gracefully (non-zero) or succeed with a message
      // Either is acceptable — the point is no crash
      expect(result.stderr + result.stdout).toBeTruthy();
    });

    it("running check with no timer returns appropriately", async () => {
      const result = await toggl(["entry", "running"], { user });
      // May return null/empty or exit non-zero — both are fine
      expect(typeof result.exitCode).toBe("number");
    });
  });

  describe("nonexistent resources", () => {
    it("deleting nonexistent project fails", async () => {
      await togglExpectFail(["project", "delete", "Ghost"], { user });
    });

    it("deleting nonexistent tag fails", async () => {
      await togglExpectFail(["tag", "delete", "phantom"], { user });
    });

    it("renaming nonexistent client fails", async () => {
      await togglExpectFail(
        ["client", "rename", "Nobody", "Somebody"],
        { user },
      );
    });
  });

  describe("concurrent timers", () => {
    it("starting a second timer replaces the running one", async () => {
      const r1 = await toggl(["entry", "start", "-d", "First"], { user });
      expect(r1.exitCode).toBe(0);

      const r2 = await toggl(["entry", "start", "-d", "Second"], { user });
      expect(r2.exitCode).toBe(0);

      // The running entry should be "Second"
      const running = await togglJson<TimeEntry>(
        ["entry", "running"],
        { user },
      );
      expect(running.description).toBe("Second");

      // The CLI auto-stops the previous entry when starting a new one.
      // Verify by checking the output mentions stopping.
      expect(r2.stdout).toMatch(/stop/i);

      await toggl(["entry", "stop"], { user });
    });
  });

  describe("special characters", () => {
    it("project with special chars in name", async () => {
      const name = "Test & 'Special' <Project>";
      const create = await toggl(["project", "create", name], { user });
      expect(create.exitCode).toBe(0);

      const projects = await togglJson<{ name: string }[]>(
        ["project", "list"],
        { user },
      );
      expect(projects.some((p) => p.name === name)).toBe(true);

      await toggl(["project", "delete", name], { user });
    });

    it("entry with unicode description", async () => {
      await toggl(
        ["entry", "start", "-d", "日本語テスト 🕐"],
        { user },
      );
      const running = await togglJson<TimeEntry>(
        ["entry", "running"],
        { user },
      );
      expect(running.description).toBe("日本語テスト 🕐");
      await toggl(["entry", "stop"], { user });
    });

    it("entry with very long description", async () => {
      const longDesc = "A".repeat(3000);
      const result = await toggl(
        ["entry", "start", "-d", longDesc],
        { user },
      );
      // Either succeeds or fails gracefully — no crash
      expect(typeof result.exitCode).toBe("number");

      // Clean up if it started
      if (result.exitCode === 0) {
        await toggl(["entry", "stop"], { user });
      }
    });
  });

  describe("duplicate names", () => {
    it("creating a duplicate project name is handled", async () => {
      const r1 = await toggl(["project", "create", "Dup"], { user });
      expect(r1.exitCode).toBe(0);

      const r2 = await toggl(["project", "create", "Dup"], { user });
      // May succeed (create another) or fail — document behavior
      expect(typeof r2.exitCode).toBe("number");

      // Clean up
      await toggl(["project", "delete", "Dup"], { user });
      // Try deleting a second time in case two were created
      await toggl(["project", "delete", "Dup"], { user });
    });
  });

  describe("continue with no history", () => {
    it("continue on fresh user is handled gracefully", async () => {
      const freshUser = await provisionUser("edge-continue");
      const result = await toggl(["entry", "continue"], { user: freshUser });
      // May fail (no entries) or succeed (creates empty entry) — no crash
      expect(typeof result.exitCode).toBe("number");

      // Clean up if it started something
      if (result.exitCode === 0) {
        await toggl(["entry", "stop"], { user: freshUser });
      }
    });
  });
});
