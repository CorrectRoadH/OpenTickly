import { afterEach, expect, it } from "vite-plus/test";
import * as Sentry from "@sentry/react";
import type { Envelope } from "@sentry/core";
import { envelopePrivacy } from "./envelope.ts";
import { privacyOptions } from "./policy.ts";
const config = {
  dsn: "https://public@example.com/1",
  release: "web@test",
  environment: "production",
};
afterEach(async () => {
  await Sentry.close();
  Sentry.getCurrentScope().setClient(undefined);
  Sentry.getIsolationScope().setAttributes({});
  Sentry.getGlobalScope().setAttributes({});
});
it("cleans actual SDK log/trace_metric typed wire including post-hook scope merges and direct transport bypass", async () => {
  const sent: Envelope[] = [];
  Sentry.init({
    ...privacyOptions("web", config),
    defaultIntegrations: false,
    integrations: [envelopePrivacy(config)],
    transport: () => ({
      send: async (envelope) => {
        sent.push(envelope);
        return { statusCode: 200 };
      },
      flush: async () => true,
    }),
  });
  Sentry.getGlobalScope().setAttribute("global.secret", "SENSITIVE");
  Sentry.getIsolationScope().setAttribute("isolation.secret", "SENSITIVE");
  Sentry.withScope((scope) => {
    scope.setAttribute("current.secret", "SENSITIVE");
    Sentry.logger.error("operation.failed", {
      operation: "report.load",
      outcome: "error",
      secret: "SENSITIVE",
    });
    Sentry.metrics.count("app.operation.count", 1, {
      attributes: { operation: "report.load", outcome: "error", secret: "SENSITIVE" },
    });
    Sentry.metrics.distribution("app.operation.duration", 12, {
      unit: "millisecond",
      attributes: { operation: "report.load" },
    });
    Sentry.logger.error("SENSITIVE");
    Sentry.metrics.count("SENSITIVE", 1);
  });
  await Sentry.flush(2000);
  expect(sent.flatMap((e) => e[1].map((i) => i[0].type))).toEqual(
    expect.arrayContaining(["log", "trace_metric"]),
  );
  expect(JSON.stringify(sent)).not.toContain("SENSITIVE");
  await Sentry.getClient()
    ?.getTransport()
    ?.send([
      { secret: "SENSITIVE" },
      [
        [
          { type: "log", item_count: 99 },
          {
            version: 2,
            items: [
              {
                timestamp: 1,
                level: "error",
                body: "operation.failed",
                attributes: { secret: { type: "string", value: "SENSITIVE" } },
              },
            ],
          },
        ],
      ],
    ] as unknown as Envelope);
  expect(JSON.stringify(sent)).not.toContain("SENSITIVE");
  const logs = sent.flatMap((e) => e[1].filter((i) => i[0].type === "log"));
  expect(logs.length).toBeGreaterThan(0);
  for (const [header, body] of logs) {
    expect(header.content_type).toBe("application/vnd.sentry.items.log+json");
    expect((body as { version: number }).version).toBe(2);
  }
});

it("records each top-level operation once even without sampled spans", async () => {
  const sent: Envelope[] = [];
  Sentry.init({
    ...privacyOptions("web", config),
    tracesSampleRate: 0,
    defaultIntegrations: false,
    integrations: [envelopePrivacy(config)],
    transport: () => ({
      send: async (envelope) => {
        sent.push(envelope);
        return { statusCode: 200 };
      },
      flush: async () => true,
    }),
  });
  const { traceOperation, markOperationFailure } = await import("./operations.ts");
  await traceOperation("report.load", async () => traceOperation("project.list", async () => 7));
  await traceOperation("report.load", async () => {
    markOperationFailure();
  });
  await expect(
    traceOperation("auth.login", async () => {
      throw Object.assign(new Error("SENSITIVE"), { status: 401 });
    }),
  ).rejects.toThrow();
  await expect(
    traceOperation("timer.stop", async () => {
      throw new DOMException("SENSITIVE", "AbortError");
    }),
  ).rejects.toThrow();
  await Sentry.flush(2000);
  const items = sent.flatMap((e) =>
    e[1].flatMap((i) =>
      i[0].type === "trace_metric"
        ? (i[1] as import("@sentry/core").SerializedMetricContainer).items
        : [],
    ),
  );
  const counters = items.filter((i) => i.name === "app.operation.count");
  expect(counters).toHaveLength(4);
  expect(counters.map((i) => i.attributes?.outcome?.value)).toEqual([
    "success",
    "error",
    "rejected",
    "cancelled",
  ]);
  expect(items.filter((i) => i.name === "app.operation.duration")).toHaveLength(4);
  expect(sent.flatMap((e) => e[1].filter((i) => i[0].type === "span"))).toHaveLength(0);
  expect(JSON.stringify(sent)).not.toContain("SENSITIVE");
});

it("retains known SDK client reports and rejects unknown entries, Cron and Replay", async () => {
  const sent: Envelope[] = [];
  Sentry.init({
    ...privacyOptions("web", config),
    defaultIntegrations: false,
    integrations: [envelopePrivacy(config)],
    transport: () => ({
      send: async (envelope) => {
        sent.push(envelope);
        return { statusCode: 200 };
      },
      flush: async () => false,
    }),
  });
  await Sentry.getClient()
    ?.getTransport()
    ?.send([
      {},
      [
        [
          { type: "client_report" },
          {
            timestamp: 1,
            secret: "SENSITIVE",
            discarded_events: [
              { reason: "before_send", category: "trace_metric", quantity: 2, secret: "SENSITIVE" },
              { reason: "SENSITIVE", category: "log_item", quantity: 1 },
              { reason: "before_send", category: "SENSITIVE", quantity: 1 },
            ],
          },
        ],
        [{ type: "check_in" }, { secret: "SENSITIVE" }],
        [{ type: "replay_event" }, { secret: "SENSITIVE" }],
      ],
    ] as unknown as Envelope);
  expect(sent[0]?.[1]).toHaveLength(1);
  expect(JSON.stringify(sent)).not.toContain("SENSITIVE");
  expect(await Sentry.getClient()?.getTransport()?.flush(7)).toBe(false);
});
