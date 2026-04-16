import { describe, expect, it } from "vitest";
import { buildManifest } from "../src/manifest.ts";

describe("buildManifest", () => {
  it("returns the newest changelog entry as latest when LATEST_TAG is 'latest'", () => {
    const m = buildManifest({ latestTag: "latest" });
    expect(m.latestTag).toBe("0.1.0");
    expect(m.latestVersion).toBe("0.1.0");
    expect(m.releasedAt).toBe("2026-04-16");
    expect(m.changelogUrl).toContain("CHANGELOG.md");
  });

  it("respects an explicit pinned LATEST_TAG", () => {
    const m = buildManifest({ latestTag: "1.2.3-rc.1" });
    expect(m.latestTag).toBe("1.2.3-rc.1");
    expect(m.latestVersion).toBe("1.2.3-rc.1");
  });

  it("strips leading v from explicit tag", () => {
    const m = buildManifest({ latestTag: "v1.2.3" });
    expect(m.latestTag).toBe("v1.2.3");
    expect(m.latestVersion).toBe("1.2.3");
  });

  it("marks updateAvailable true when client lags", () => {
    const m = buildManifest({ latestTag: "0.2.0", clientVersion: "0.1.0" });
    expect(m.updateAvailable).toBe(true);
  });

  it("marks updateAvailable false when client matches (regardless of v prefix)", () => {
    const m = buildManifest({ latestTag: "0.2.0", clientVersion: "v0.2.0" });
    expect(m.updateAvailable).toBe(false);
  });

  it("omits expired announcements", () => {
    const past = new Date("2030-01-01");
    const m = buildManifest({ latestTag: "latest", now: past });
    // welcome announcement expires 2026-07-16 — well before 2030.
    expect(m.announcements.find((a) => a.id === "welcome-2026-04")).toBeUndefined();
  });

  it("includes non-expired announcements", () => {
    const now = new Date("2026-04-20");
    const m = buildManifest({ latestTag: "latest", now });
    expect(m.announcements.some((a) => a.id === "welcome-2026-04")).toBe(true);
  });
});
