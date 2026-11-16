import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import * as Sentry from "@sentry/cloudflare";
import { captureUpdateError, monitorWorker, sentryOptions } from "../src/sentry.ts";
import type { WorkerEnv } from "../src/types.ts";

afterEach(async () => {
  await Sentry.close();
  vi.unstubAllGlobals();
});
describe("Worker real SDK request boundary", () => {
  it("keeps a successful request successful when ingestion fails", async () => {
    const pending: Promise<unknown>[] = [];
    const context = {
      waitUntil(value: Promise<unknown>) {
        pending.push(value);
      },
      passThroughOnException() {},
    } as unknown as ExecutionContext;
    const handler = monitorWorker(
      {
        async fetch() {
          captureUpdateError(new Error("synthetic"));
          return new Response("ok");
        },
      },
      (env) => ({
        ...sentryOptions(env, true),
        cacheClient: false,
        transport: (options) => Sentry.createTransport(options, async () => ({ statusCode: 503 })),
      }),
    );
    const response = await handler.fetch(
      new Request("https://update.example/"),
      { GITHUB_REPO: "test/repo" },
      context,
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
    await Promise.all(pending);
  });
  it("does not initialize or send outside production", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const handler = monitorWorker({
      async fetch() {
        return new Response("ok");
      },
    });
    await handler.fetch(
      new Request("https://update.opentoggl.com/"),
      { GITHUB_REPO: "test/repo" },
      { waitUntil() {} } as unknown as ExecutionContext,
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(Sentry.getClient()).toBeUndefined();
  });
  it("filters entire error and streamed span envelopes and does not propagate to external fetch", async () => {
    const envelopes: string[] = [];
    const outgoing: Headers[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input instanceof Request ? input.url : String(input);
        if (!url.startsWith("https://vendor.example/"))
          envelopes.push(
            String(init?.body ?? (input instanceof Request ? await input.text() : "")),
          );
        else
          outgoing.push(
            new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)),
          );
        return new Response("{}", { status: 200 });
      }),
    );
    const pending: Promise<unknown>[] = [];
    const context = {
      waitUntil(value: Promise<unknown>) {
        pending.push(value);
      },
      passThroughOnException() {},
    } as unknown as ExecutionContext;
    const handler = monitorWorker(
      {
        async fetch() {
          await Sentry.startSpan(
            { name: "SENSITIVE", op: "http.client", attributes: { "db.query.text": "SENSITIVE" } },
            async () => {
              Sentry.withScope((scope) => {
                scope.setExtra("nested", { value: "SENSITIVE" });
                scope.setUser({ email: "SENSITIVE" });
                captureUpdateError(new Error("SENSITIVE"));
              });
              await fetch("https://vendor.example/SENSITIVE?q=SENSITIVE");
            },
          );
          return new Response("ok");
        },
      },
      (env) => ({
        ...sentryOptions(env, true),
        cacheClient: false,
        transport: (options) =>
          Sentry.createTransport(options, async (request) => {
            const response = await fetch(options.url, { method: "POST", body: request.body });
            return { statusCode: response.status };
          }),
      }),
    );
    const request = new Request("https://update.opentoggl.com/SENSITIVE?q=SENSITIVE", {
      headers: {
        Cookie: "SENSITIVE",
        Authorization: "SENSITIVE",
        "sentry-trace": "01234567890123456789012345678901-0123456789012345-1",
        baggage: "sentry-transaction=SENSITIVE",
      },
    });
    const env: WorkerEnv = {
      GITHUB_REPO: "test/repo",
      SENTRY_ENVIRONMENT: "production",
      SENTRY_RELEASE: "update@test",
    };
    const response = await handler.fetch(request, env, context);
    await response.text();
    await Promise.all(pending);
    await Sentry.flush(2000);
    expect(envelopes.length).toBeGreaterThan(0);
    expect(envelopes.join("\n")).not.toContain("SENSITIVE");
    expect(envelopes.join("\n")).toContain('"span"');
    expect(envelopes.join("\n")).toContain('"exception"');
    expect(envelopes.join("\n")).toContain('"update"');
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0]?.has("sentry-trace")).toBe(false);
    expect(outgoing[0]?.has("baggage")).toBe(false);
  });
});
