import { afterEach, expect, it } from "vite-plus/test";
import * as Sentry from "@sentry/react";
import type { Envelope } from "@sentry/core";
import { envelopePrivacy } from "./envelope.ts";
const config = {
  dsn: "https://public@example.com/1",
  release: "web@test",
  environment: "production",
};
afterEach(async () => {
  await Sentry.close();
  Sentry.getCurrentScope().setClient(undefined);
});
it("revalidates typed SDK wire payloads even when client hooks are bypassed", async () => {
  const sent: Envelope[] = [];
  Sentry.init({
    ...config,
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
  const envelope = [
    { trace: { trace_id: "a".repeat(32), transaction: "SENSITIVE", user: "SENSITIVE" } },
    [
      [
        { type: "span", secret: "SENSITIVE" },
        {
          version: 2,
          secret: "SENSITIVE",
          items: [
            {
              trace_id: "a".repeat(32),
              span_id: "b".repeat(16),
              name: "SENSITIVE",
              start_timestamp: 1,
              end_timestamp: 2,
              status: "ok",
              is_segment: true,
              secret: "SENSITIVE",
              attributes: {
                "sentry.op": { type: "string", value: "http.client" },
                nested: { type: "string", value: "SENSITIVE" },
                "sentry.profiler_id": { type: "string", value: "c".repeat(32) },
                "thread.id": { type: "string", value: "0" },
              },
            },
          ],
        },
      ],
      ...[
        "log",
        "metric",
        "session",
        "replay_event",
        "check_in",
        "profile",
        "profile_chunk",
        "unknown",
      ].map((type) => [{ type }, { secret: "SENSITIVE" }]),
    ],
  ] as unknown as Envelope;
  await Sentry.getClient()?.sendEnvelope(envelope);
  expect(sent).toHaveLength(1);
  expect(sent[0]?.[1].map((item) => item[0].type)).toEqual(["span"]);
  expect(JSON.stringify(sent)).not.toContain("SENSITIVE");
  expect(JSON.stringify(sent)).not.toContain("sentry.profiler_id");
});
