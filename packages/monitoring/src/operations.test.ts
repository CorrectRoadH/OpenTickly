import { afterEach, expect, it } from "vite-plus/test";
import * as Sentry from "@sentry/react";
import type { Envelope, SerializedStreamedSpanContainer } from "@sentry/core";
import { traceOperation } from "./operations.ts";
import { envelopePrivacy } from "./envelope.ts";
import { privacyOptions } from "./policy.ts";
afterEach(async () => {
  await Sentry.close();
  Sentry.getCurrentScope().setClient(undefined);
});
it("retains registered names and settles original results, errors and cancellation through SDK transport", async () => {
  const envelopes: Envelope[] = [];
  const config = {
    dsn: "https://public@example.com/1",
    environment: "production",
    release: "web@test",
  };
  Sentry.init({
    ...privacyOptions("web", config),
    tracesSampleRate: 1,
    defaultIntegrations: false,
    integrations: [envelopePrivacy(config)],
    transport: () => ({
      send: async (envelope) => {
        envelopes.push(envelope);
        return { statusCode: 200 };
      },
      flush: async () => true,
    }),
  });
  const error = new Error("SENSITIVE");
  const cancel = new DOMException("SENSITIVE", "AbortError");
  expect(await traceOperation("timer.start", async () => 7)).toBe(7);
  await expect(
    traceOperation("timer.stop", async () => {
      throw error;
    }),
  ).rejects.toBe(error);
  await expect(
    traceOperation("report.export", async () => {
      throw cancel;
    }),
  ).rejects.toBe(cancel);
  await Sentry.flush(2000);
  const spans = envelopes.flatMap((e) =>
    e[1].flatMap((i) =>
      i[0].type === "span" ? (i[1] as SerializedStreamedSpanContainer).items : [],
    ),
  );
  expect(spans.map((s) => s.name)).toEqual(["timer.start", "timer.stop", "report.export"]);
  expect(spans.map((s) => s.attributes.outcome?.value)).toEqual(["success", "error", "cancelled"]);
  expect(JSON.stringify(envelopes)).not.toContain("SENSITIVE");
});
