/**
 * Story: User A's data is invisible to User B. Each user's workspace is
 *        completely isolated.
 *
 * Acceptance:
 * - User A creates projects, clients, tags, and time entries
 * - User B cannot see any of User A's data
 * - User A can still see their own data
 * - User B's data is invisible to User A
 */
import { describe, it, expect, beforeAll } from "vitest";
import { toggl, togglJson } from "../helpers/toggl.ts";
import { provisionUser } from "../helpers/provisioning.ts";
import type { TestUser } from "../helpers/types.ts";

interface Named {
  name: string;
}

interface TimeEntry {
  description: string;
}

describe("Story: cross-user data isolation", () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    userA = await provisionUser("isolation-a");
    userB = await provisionUser("isolation-b");

    // User A creates data
    await toggl(["project", "create", "Secret Alpha"], { user: userA });
    await toggl(["client", "create", "Confidential Client"], { user: userA });
    await toggl(["tag", "create", "private-tag"], { user: userA });
    await toggl(
      ["entry", "start", "-d", "Classified Work"],
      { user: userA },
    );
    await toggl(["entry", "stop"], { user: userA });
  });

  describe("User B cannot see User A's data", () => {
    it("User B's project list does not contain User A's project", async () => {
      const projects = await togglJson<Named[]>(["project", "list"], {
        user: userB,
      });
      expect(projects.every((p) => p.name !== "Secret Alpha")).toBe(true);
    });

    it("User B's client list does not contain User A's client", async () => {
      const clients = await togglJson<Named[]>(["client", "list"], {
        user: userB,
      });
      expect(clients.every((c) => c.name !== "Confidential Client")).toBe(true);
    });

    it("User B's tag list does not contain User A's tag", async () => {
      const tags = await togglJson<Named[]>(["tag", "list"], { user: userB });
      expect(tags.every((t) => t.name !== "private-tag")).toBe(true);
    });

    it("User B's entry list does not contain User A's entry", async () => {
      const entries = await togglJson<TimeEntry[]>(
        ["entry", "list", "--since", "2026-03-01", "-n", "100"],
        { user: userB },
      );
      expect(
        entries.every((e) => e.description !== "Classified Work"),
      ).toBe(true);
    });
  });

  describe("User A can still see own data", () => {
    it("User A sees their project", async () => {
      const projects = await togglJson<Named[]>(["project", "list"], {
        user: userA,
      });
      expect(projects.some((p) => p.name === "Secret Alpha")).toBe(true);
    });

    it("User A sees their entry", async () => {
      const entries = await togglJson<TimeEntry[]>(
        ["entry", "list", "--since", "2026-03-01", "-n", "100"],
        { user: userA },
      );
      expect(
        entries.some((e) => e.description === "Classified Work"),
      ).toBe(true);
    });
  });

  describe("Reverse isolation: User A cannot see User B's data", () => {
    beforeAll(async () => {
      await toggl(["project", "create", "Open Beta"], { user: userB });
      await toggl(
        ["entry", "start", "-d", "Public Work"],
        { user: userB },
      );
      await toggl(["entry", "stop"], { user: userB });
    });

    it("User A cannot see User B's project", async () => {
      const projects = await togglJson<Named[]>(["project", "list"], {
        user: userA,
      });
      expect(projects.every((p) => p.name !== "Open Beta")).toBe(true);
    });

    it("User A cannot see User B's entry", async () => {
      const entries = await togglJson<TimeEntry[]>(
        ["entry", "list", "--since", "2026-03-01", "-n", "100"],
        { user: userA },
      );
      expect(
        entries.every((e) => e.description !== "Public Work"),
      ).toBe(true);
    });

    it("User B can see their own data", async () => {
      const projects = await togglJson<Named[]>(["project", "list"], {
        user: userB,
      });
      expect(projects.some((p) => p.name === "Open Beta")).toBe(true);

      const entries = await togglJson<TimeEntry[]>(
        ["entry", "list", "--since", "2026-03-01", "-n", "100"],
        { user: userB },
      );
      expect(
        entries.some((e) => e.description === "Public Work"),
      ).toBe(true);
    });
  });
});
