import { describe, expect, it } from "vitest";
import { checkRequestSchema } from "../src/validation.ts";

describe("checkRequestSchema", () => {
  const validBase = {
    instanceId: "8b9a2f0e-1c4d-4b5a-9f8e-9d2a7c3b1a2e",
    version: "0.3.1",
  };

  it("accepts a minimal valid payload", () => {
    const r = checkRequestSchema.safeParse(validBase);
    expect(r.success).toBe(true);
  });

  it("accepts a full payload with all optional fields", () => {
    const r = checkRequestSchema.safeParse({
      ...validBase,
      goVersion: "go1.23.4",
      os: "linux",
      arch: "amd64",
      locale: "en-US",
    });
    expect(r.success).toBe(true);
  });

  it("accepts a 'dev' version string (unreleased builds)", () => {
    const r = checkRequestSchema.safeParse({ ...validBase, version: "dev" });
    expect(r.success).toBe(true);
  });

  it("rejects a non-UUID instanceId", () => {
    const r = checkRequestSchema.safeParse({ ...validBase, instanceId: "not-a-uuid" });
    expect(r.success).toBe(false);
  });

  it("rejects a version string with shell metachars", () => {
    const r = checkRequestSchema.safeParse({ ...validBase, version: "0.1.0; rm -rf /" });
    expect(r.success).toBe(false);
  });

  it("rejects an oversized version string", () => {
    const r = checkRequestSchema.safeParse({ ...validBase, version: "a".repeat(65) });
    expect(r.success).toBe(false);
  });
});
