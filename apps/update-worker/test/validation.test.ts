import { describe, expect, it } from "vitest";
import { parseQueryParams, queryParamsSchema } from "../src/validation.ts";

describe("queryParamsSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    const r = queryParamsSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("accepts a full payload with all optional fields", () => {
    const r = queryParamsSchema.safeParse({
      instanceId: "8b9a2f0e-1c4d-4b5a-9f8e-9d2a7c3b1a2e",
      version: "0.3.1",
      goVersion: "go1.23.4",
      os: "linux",
      arch: "amd64",
      locale: "en-US",
    });
    expect(r.success).toBe(true);
  });

  it("accepts a 'dev' version string (unreleased builds)", () => {
    const r = queryParamsSchema.safeParse({ version: "dev" });
    expect(r.success).toBe(true);
  });

  it("rejects a non-UUID instanceId", () => {
    const r = queryParamsSchema.safeParse({ instanceId: "not-a-uuid" });
    expect(r.success).toBe(false);
  });

  it("rejects a version string with shell metachars", () => {
    const r = queryParamsSchema.safeParse({ version: "0.1.0; rm -rf /" });
    expect(r.success).toBe(false);
  });

  it("rejects an oversized version string", () => {
    const r = queryParamsSchema.safeParse({ version: a65() });
    expect(r.success).toBe(false);
  });
});

describe("parseQueryParams (URLSearchParams)", () => {
  it("returns empty for a bare URL", () => {
    const q = parseQueryParams(new URLSearchParams());
    expect(q).toEqual({});
  });

  it("parses a well-formed query string", () => {
    const q = parseQueryParams(
      new URLSearchParams({
        version: "0.3.1",
        instanceId: "8b9a2f0e-1c4d-4b5a-9f8e-9d2a7c3b1a2e",
        os: "linux",
      }),
    );
    expect(q).toEqual({
      version: "0.3.1",
      instanceId: "8b9a2f0e-1c4d-4b5a-9f8e-9d2a7c3b1a2e",
      os: "linux",
    });
  });

  it("drops invalid fields silently and keeps valid siblings", () => {
    const q = parseQueryParams(
      new URLSearchParams({
        version: "0.3.1",
        instanceId: "not-a-uuid",
      }),
    );
    expect(q).toEqual({ version: "0.3.1" });
    expect(q.instanceId).toBeUndefined();
  });

  it("ignores unknown params", () => {
    const q = parseQueryParams(new URLSearchParams({ foo: "bar", version: "1.0.0" }));
    expect(q).toEqual({ version: "1.0.0" });
  });
});

function a65(): string {
  return "a".repeat(65);
}
