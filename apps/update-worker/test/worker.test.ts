import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index.ts";
import type { GithubRelease } from "../src/github.ts";
import type { WorkerEnv } from "../src/types.ts";

function makeEnv(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    UPDATE_REQUESTS: { writeDataPoint: vi.fn() } as unknown as AnalyticsEngineDataset,
    GITHUB_REPO: "CorrectRoadH/opentoggl",
    ...overrides,
  };
}

function makeCtx(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext;
}

function githubRelease(overrides: Partial<GithubRelease> = {}): GithubRelease {
  return {
    tag_name: "v0.1.0",
    name: "OpenToggl 0.1.0",
    html_url: "https://github.com/CorrectRoadH/opentoggl/releases/tag/v0.1.0",
    published_at: "2026-04-16T00:00:00Z",
    body: "Initial public release.",
    draft: false,
    prerelease: false,
    ...overrides,
  };
}

function mockReleases(releases: GithubRelease[]): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(releases), { status: 200 })),
  );
}

function mockGithubFailure(status = 503): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("upstream down", { status })),
  );
}

beforeEach(() => {
  mockReleases([githubRelease()]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("worker.fetch", () => {
  it("returns manifest on GET / with no params", async () => {
    const res = await worker.fetch(new Request("https://update.test/"), makeEnv(), makeCtx());
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      latestTag: "v0.1.0",
      latestVersion: "0.1.0",
      updateAvailable: false, // no client version → never "true"
    });
    expect(body).not.toHaveProperty("releases"); // historical list intentionally omitted
    expect(Array.isArray(body.announcements)).toBe(true);
  });

  it("reports updateAvailable=false when client matches latest", async () => {
    const res = await worker.fetch(
      new Request("https://update.test/?version=0.1.0"),
      makeEnv(),
      makeCtx(),
    );
    const body = (await res.json()) as { updateAvailable: boolean; latestVersion: string };
    expect(body.updateAvailable).toBe(false);
    expect(body.latestVersion).toBe("0.1.0");
  });

  it("reports updateAvailable=true when client version lags", async () => {
    mockReleases([githubRelease({ tag_name: "v0.2.0" })]);
    const res = await worker.fetch(
      new Request("https://update.test/?version=0.1.0"),
      makeEnv(),
      makeCtx(),
    );
    const body = (await res.json()) as { updateAvailable: boolean; latestVersion: string };
    expect(body.updateAvailable).toBe(true);
    expect(body.latestVersion).toBe("0.2.0");
  });

  it("strips leading v when comparing client version against tag", async () => {
    const res = await worker.fetch(
      new Request("https://update.test/?version=v0.1.0"),
      makeEnv(),
      makeCtx(),
    );
    const body = (await res.json()) as { updateAvailable: boolean };
    expect(body.updateAvailable).toBe(false);
  });

  it("writes analytics when instanceId + version are present", async () => {
    const env = makeEnv();
    await worker.fetch(
      new Request(
        "https://update.test/?version=0.1.0&instanceId=8b9a2f0e-1c4d-4b5a-9f8e-9d2a7c3b1a2e&os=linux",
      ),
      env,
      makeCtx(),
    );
    expect(env.UPDATE_REQUESTS?.writeDataPoint).toHaveBeenCalledTimes(1);
  });

  it("does not write analytics when instanceId is missing", async () => {
    const env = makeEnv();
    await worker.fetch(new Request("https://update.test/?version=0.1.0"), env, makeCtx());
    expect(env.UPDATE_REQUESTS?.writeDataPoint).not.toHaveBeenCalled();
  });

  it("degrades gracefully when GitHub is down (still serves announcements)", async () => {
    mockGithubFailure();
    const res = await worker.fetch(new Request("https://update.test/"), makeEnv(), makeCtx());
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.latestVersion).toBe("");
    expect(body.latestTag).toBe("");
    expect(body.updateAvailable).toBe(false);
    expect(Array.isArray(body.announcements)).toBe(true);
  });

  it("skips draft releases when picking latest", async () => {
    mockReleases([
      githubRelease({ tag_name: "v0.3.0-draft", draft: true }),
      githubRelease({ tag_name: "v0.2.0" }),
    ]);
    const res = await worker.fetch(new Request("https://update.test/"), makeEnv(), makeCtx());
    const body = (await res.json()) as { latestTag: string };
    expect(body.latestTag).toBe("v0.2.0");
  });

  it("handles CORS preflight", async () => {
    const res = await worker.fetch(
      new Request("https://update.test/", { method: "OPTIONS" }),
      makeEnv(),
      makeCtx(),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns 404 for non-root paths", async () => {
    const res = await worker.fetch(
      new Request("https://update.test/healthz"),
      makeEnv(),
      makeCtx(),
    );
    expect(res.status).toBe(404);
  });

  it("returns 405 for non-GET methods", async () => {
    const res = await worker.fetch(
      new Request("https://update.test/", { method: "POST" }),
      makeEnv(),
      makeCtx(),
    );
    expect(res.status).toBe(405);
  });
});
