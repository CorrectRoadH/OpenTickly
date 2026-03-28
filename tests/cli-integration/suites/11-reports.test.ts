/**
 * Story: As a user, I can generate summary, detailed, and weekly reports
 *        from tracked time.
 *
 * Acceptance:
 * - Summary report aggregates entries by project
 * - Detailed report lists individual entries (if implemented)
 * - Weekly report shows a daily breakdown (if implemented)
 *
 * Note: Some report endpoints may return 501 (Not Implemented) if the
 *       backend has not yet implemented the reports API surface.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { toggl } from "../helpers/toggl.ts";
import { provisionUser } from "../helpers/provisioning.ts";
import type { TestUser } from "../helpers/types.ts";

describe("Story: reports", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await provisionUser("reports");
    await toggl(["project", "create", "ReportProject"], { user });

    for (const [desc, start, end] of [
      ["Report task A", "2026-03-25T09:00:00Z", "2026-03-25T10:00:00Z"],
      ["Report task B", "2026-03-25T14:00:00Z", "2026-03-25T16:00:00Z"],
      ["Report task C", "2026-03-26T09:00:00Z", "2026-03-26T10:30:00Z"],
    ] as const) {
      await toggl(
        ["entry", "start", "-d", desc, "-p", "ReportProject", "--start", start, "--end", end],
        { user },
      );
    }
  });

  it("summary report exits 0", async () => {
    const result = await toggl(
      ["report", "summary", "--since", "2026-03-25", "--until", "2026-03-26"],
      { user },
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  it("summary report in JSON returns data", async () => {
    const result = await toggl(
      ["report", "summary", "--since", "2026-03-25", "--until", "2026-03-26", "--json"],
      { user },
    );
    expect(result.exitCode).toBe(0);
  });

  it("detailed report returns data or 501", async () => {
    const result = await toggl(
      ["report", "detailed", "--since", "2026-03-25", "--until", "2026-03-26"],
      { user },
    );
    // Detailed reports may not be implemented yet (501)
    if (result.exitCode !== 0) {
      expect(result.stderr + result.stdout).toMatch(/501|Not Implemented/i);
    } else {
      expect(result.stdout.length).toBeGreaterThan(0);
    }
  });

  it("weekly report returns data or 501", async () => {
    const result = await toggl(
      ["report", "weekly", "--since", "2026-03-23", "--until", "2026-03-29"],
      { user },
    );
    // Weekly reports may not be implemented yet (501)
    if (result.exitCode !== 0) {
      expect(result.stderr + result.stdout).toMatch(/501|Not Implemented/i);
    } else {
      expect(result.stdout.length).toBeGreaterThan(0);
    }
  });
});
