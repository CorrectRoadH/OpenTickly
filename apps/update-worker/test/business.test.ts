import { afterEach, expect, it, vi } from "vite-plus/test";
import * as Sentry from "@sentry/cloudflare";
type Envelope = Parameters<NonNullable<ReturnType<typeof Sentry.getClient>>["sendEnvelope"]>[0];
type SerializedStreamedSpanContainer = Extract<
  Envelope[1][number][1],
  { items: { is_segment: boolean }[] }
>;
import actualWorker from "../src/index.ts";
import { monitorWorker, sentryOptions } from "../src/sentry.ts";
afterEach(async () => {
  await Sentry.close();
  Sentry.getCurrentScope().setClient(undefined);
  vi.unstubAllGlobals();
});
it("traces real update business stages, preserves the original Request, and settles analytics failures after response", async () => {
  const envelopes: Envelope[] = [];
  const upstream: Headers[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: unknown, options?: RequestInit) => {
      upstream.push(new Headers(options?.headers));
      return new Response("[]", { headers: { "Content-Type": "application/json" } });
    }),
  );
  const pending: Promise<unknown>[] = [];
  const wrapped = monitorWorker(actualWorker, (env) => ({
    ...sentryOptions(env, true),
    cacheClient: false,
    transport: () => ({
      send: async (envelope) => {
        envelopes.push(envelope);
        return { statusCode: 200 };
      },
      flush: async () => true,
    }),
  }));
  const response = await wrapped.fetch(
    new Request(
      "https://update.example/?version=1.0.0&instanceId=11111111-1111-4111-8111-111111111111",
      {
        headers: {
          "sentry-trace": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-1",
          baggage: "sentry-transaction=SENSITIVE",
        },
      },
    ),
    {
      GITHUB_REPO: "test/repo",
      UPDATE_REQUESTS: {
        writeDataPoint() {
          throw new Error("external test failure");
        },
      },
    } as never,
    {
      waitUntil(promise: Promise<unknown>) {
        pending.push(promise);
      },
      passThroughOnException() {},
    } as unknown as ExecutionContext,
  );
  expect(response.status).toBe(200);
  await response.text();
  await Promise.all(pending);
  await Sentry.flush(2000);
  const spans = envelopes.flatMap((e) =>
    e[1].flatMap((i) =>
      i[0].type === "span" ? (i[1] as SerializedStreamedSpanContainer).items : [],
    ),
  );
  expect(spans.map((s) => s.name)).toEqual(
    expect.arrayContaining([
      "update.request",
      "update.upstream.fetch",
      "update.response",
      "update.analytics",
    ]),
  );
  expect(spans.find((s) => s.name === "update.analytics")?.attributes.outcome?.value).toBe("error");
  const metricItems = envelopes.flatMap((e) =>
    e[1].flatMap((i) =>
      i[0].type === "trace_metric" ? (i[1] as { items: { name: string }[] }).items : [],
    ),
  );
  expect(metricItems.filter((i) => i.name === "app.operation.count")).toHaveLength(1);
  expect(metricItems.filter((i) => i.name === "app.operation.duration")).toHaveLength(1);
  expect(spans.every((s) => s.trace_id === "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe(true);
  expect(upstream.every((h) => !h.has("sentry-trace") && !h.has("baggage"))).toBe(true);
  expect(JSON.stringify(envelopes)).not.toContain("SENSITIVE");
});
