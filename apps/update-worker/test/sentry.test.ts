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
          captureUpdateError(new Error("synthetic"), 200);
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
  it("reports 5xx and thrown errors with request status, and skips rejects and client aborts", async () => {
    const errors: unknown[] = [];
    const pending: Promise<unknown>[] = [];
    const context = {
      waitUntil(value: Promise<unknown>) {
        pending.push(value);
      },
      passThroughOnException() {},
    } as unknown as ExecutionContext;
    const handler = monitorWorker(
      {
        async fetch(request) {
          const result = new URL(request.url).searchParams.get("result");
          if (result === "throw") throw new TypeError("report parse failed");
          return new Response(null, { status: Number(result) });
        },
      },
      (env) => ({
        ...sentryOptions(env, true),
        cacheClient: false,
        transport: () => ({
          async send(envelope) {
            for (const [header, payload] of envelope[1]) {
              if (header.type === "event") errors.push(payload);
            }
            return { statusCode: 200 };
          },
          async flush() {
            return true;
          },
        }),
      }),
    );
    const env = { GITHUB_REPO: "test/repo" };
    const request = (result: string, signal?: AbortSignal) =>
      new Request(`https://update.example/?result=${result}`, { signal });
    await expect(handler.fetch(request("422"), env, context)).resolves.toMatchObject({
      status: 422,
    });
    await expect(handler.fetch(request("503"), env, context)).resolves.toMatchObject({
      status: 503,
    });
    await expect(handler.fetch(request("throw"), env, context)).rejects.toThrow(
      "report parse failed",
    );
    const controller = new AbortController();
    controller.abort();
    await expect(
      handler.fetch(request("throw", controller.signal), env, context),
    ).rejects.toThrow();
    await Promise.all(pending);
    expect(errors).toHaveLength(2);
    const tags = (status: string) => ({
      route: "/",
      "http.method": "GET",
      "http.status_code": status,
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tags: expect.objectContaining(tags("503")),
          exception: { values: [expect.objectContaining({ value: "HTTP 503" })] },
        }),
        expect.objectContaining({
          tags: expect.objectContaining(tags("500")),
          exception: {
            values: [
              expect.objectContaining({
                type: "TypeError",
                value: "report parse failed",
                mechanism: expect.objectContaining({ handled: false }),
              }),
            ],
          },
        }),
      ]),
    );
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
            init?.body
              ? await new Response(init.body).text()
              : input instanceof Request
                ? await input.text()
                : "",
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
                scope.setExtra("nested", { token: "SENSITIVE", report: "report.tsv" });
                scope.setUser({ email: "SENSITIVE" });
                const error = new Error("load report.tsv: Bearer SENSITIVE");
                error.name = "UpstreamReportError";
                captureUpdateError(error, 200);
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
    const request = new Request("https://update.opentoggl.com/?q=quarterly&token=SENSITIVE", {
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
    const wire = envelopes.join("\n");
    expect(wire).toContain('"type":"UpstreamReportError"');
    expect(wire).toContain("load report.tsv: Bearer [Filtered]");
    expect(wire).toContain('"route":"/"');
    expect(wire).toContain('"http.method":"GET"');
    expect(wire).toContain('"http.status_code":"200"');
    expect(wire).toContain("q=quarterly&token=[Filtered]");
    expect(envelopes.join("\n")).toContain('"update"');
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0]?.has("sentry-trace")).toBe(false);
    expect(outgoing[0]?.has("baggage")).toBe(false);
  });
});
