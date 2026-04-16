import { describe, expect, it, vi } from "vitest";
import worker from "../src/index.ts";
import type { WorkerEnv } from "../src/types.ts";

function makeEnv(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    ANALYTICS: { writeDataPoint: vi.fn() } as unknown as AnalyticsEngineDataset,
    LATEST_TAG: "latest",
    CHECK_RATE_LIMIT_PER_MIN: "30",
    ...overrides,
  };
}

describe("worker.fetch", () => {
  it("returns manifest on GET /v1/manifest", async () => {
    const res = await worker.fetch(new Request("https://check.test/v1/manifest"), makeEnv());
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      latestTag: "0.1.0",
      latestVersion: "0.1.0",
      updateAvailable: false,
    });
    expect(Array.isArray(body.announcements)).toBe(true);
  });

  it("accepts valid /v1/check payload and records analytics", async () => {
    const env = makeEnv();
    const res = await worker.fetch(
      new Request("https://check.test/v1/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId: "8b9a2f0e-1c4d-4b5a-9f8e-9d2a7c3b1a2e",
          version: "0.1.0",
          goVersion: "go1.23.4",
          os: "linux",
          arch: "amd64",
        }),
      }),
      env,
    );
    expect(res.status).toBe(200);
    expect(env.ANALYTICS.writeDataPoint).toHaveBeenCalledTimes(1);
    const body = (await res.json()) as { updateAvailable: boolean };
    expect(body.updateAvailable).toBe(false);
  });

  it("reports updateAvailable when client version lags", async () => {
    const res = await worker.fetch(
      new Request("https://check.test/v1/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId: "8b9a2f0e-1c4d-4b5a-9f8e-9d2a7c3b1a2e",
          version: "0.0.9",
        }),
      }),
      makeEnv({ LATEST_TAG: "0.1.0" }),
    );
    const body = (await res.json()) as { updateAvailable: boolean; latestVersion: string };
    expect(body.updateAvailable).toBe(true);
    expect(body.latestVersion).toBe("0.1.0");
  });

  it("rejects malformed payloads with 400", async () => {
    const res = await worker.fetch(
      new Request("https://check.test/v1/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: "0.1.0" }), // missing instanceId
      }),
      makeEnv(),
    );
    expect(res.status).toBe(400);
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await worker.fetch(
      new Request("https://check.test/v1/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }),
      makeEnv(),
    );
    expect(res.status).toBe(400);
  });

  it("handles CORS preflight", async () => {
    const res = await worker.fetch(
      new Request("https://check.test/v1/check", { method: "OPTIONS" }),
      makeEnv(),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns 404 for unknown routes", async () => {
    const res = await worker.fetch(
      new Request("https://check.test/nope", { method: "GET" }),
      makeEnv(),
    );
    expect(res.status).toBe(404);
  });
});
