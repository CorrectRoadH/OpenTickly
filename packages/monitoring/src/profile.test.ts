import { describe, expect, it } from "vite-plus/test";
import { sanitizeProfile, type ProfileManifest } from "./profile.ts";
const config = {
  dsn: "https://public@example.com/1",
  release: "web@test",
  environment: "production",
};
const manifest: ProfileManifest = {
  release: config.release,
  assets: { "/assets/app.js": ["run"] },
};
function profile() {
  return {
    version: "2",
    platform: "javascript",
    profiler_id: "a".repeat(32),
    chunk_id: "b".repeat(32),
    secret: "SENSITIVE",
    profile: {
      samples: [{ stack_id: 0, thread_id: "0", timestamp: 1794800000.1, secret: "SENSITIVE" }],
      stacks: [[0, 1, 2]],
      frames: [
        {
          function: "run",
          abs_path: "https://example.com/assets/app.js?SENSITIVE",
          lineno: 1,
          colno: 2,
        },
        { function: "SENSITIVE", abs_path: "https://example.com/assets/app.js" },
        { function: "run", abs_path: "https://example.com/assets/SENSITIVE.js" },
      ],
      thread_metadata: { "0": { name: "SENSITIVE" } },
      queue_metadata: { secret: "SENSITIVE" },
    },
  };
}
describe("profile v2 privacy", () => {
  it("keeps indices and only artifact/AST double matches", () => {
    const result = sanitizeProfile(profile(), config, manifest, "https://example.com");
    expect(JSON.stringify(result)).not.toContain("SENSITIVE");
    expect(result?.profile.frames).toEqual([
      { function: "run", abs_path: "https://example.com/assets/app.js", lineno: 1, colno: 2 },
      { function: "redacted" },
      { function: "redacted" },
    ]);
    expect(result?.profile.stacks).toEqual([[0, 1, 2]]);
    expect(result?.profile.samples[0]?.timestamp).toBe(1794800000.1);
    expect(
      sanitizeProfile(profile(), config, undefined)?.profile.frames.every(
        (f) => f.function === "redacted",
      ),
    ).toBe(true);
    expect(
      sanitizeProfile(profile(), config, { ...manifest, release: "wrong" })?.profile.frames.every(
        (f) => f.function === "redacted",
      ),
    ).toBe(true);
  });
  it("rejects invalid IDs, versions, indices and unregistered thread IDs", () => {
    for (const change of [
      { version: 2 },
      { profiler_id: "0".repeat(32) },
      { profile: { ...profile().profile, stacks: [[3]] } },
      {
        profile: {
          ...profile().profile,
          samples: [{ stack_id: 0.5, thread_id: "1", timestamp: 1 }],
        },
      },
    ])
      expect(sanitizeProfile({ ...profile(), ...change }, config, manifest)).toBeUndefined();
  });
});
