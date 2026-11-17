// @vitest-environment node
import { expect, it } from "vite-plus/test";
import * as Sentry from "@sentry/react";
import type { Envelope, SerializedStreamedSpan } from "@sentry/core";
import { envelopePrivacy } from "./envelope.ts";
import { privacyOptions } from "./policy.ts";
it("derives the legacy string only from an actual SDK span's valid profile/main-thread pair", async () => {
  const config = {
    dsn: "https://public@example.invalid/1",
    release: "web@test",
    environment: "production",
  };
  const profiler = "a".repeat(32),
    secret = "SENSITIVE_LEGACY_THREAD";
  const sent: Envelope[] = [];
  const client = Sentry.init({
    ...privacyOptions("web", config, true),
    defaultIntegrations: false,
    tracesSampleRate: 1,
    integrations: [envelopePrivacy(config, "web", { enabled: true })],
    transport: () => ({
      send: async (e) => {
        sent.push(e);
        return {};
      },
      flush: async () => true,
    }),
  })!;
  const spans = () =>
    sent.flatMap((e) =>
      e[1].flatMap((i) =>
        i[0].type === "span" && i[1] && typeof i[1] === "object" && "items" in i[1]
          ? (i[1].items as SerializedStreamedSpan[])
          : [],
      ),
    );
  try {
    Sentry.startSpan(
      {
        name: "http.client",
        op: "http.client",
        attributes: {
          "sentry.profiler_id": profiler,
          "thread.id": "0",
          "sentry.thread.id": secret,
        },
      },
      () => {},
    );
    await client.flush(2000);
    const first = spans()[0]!;
    expect(first).toBeTruthy();
    expect(first.attributes["thread.id"]).toEqual({ type: "integer", value: 0 });
    expect(first.attributes["sentry.thread.id"]).toEqual({ type: "string", value: "0" });
    const cases = [
      [profiler, 0, true],
      [profiler, "0", false],
      [undefined, 0, false],
      ["0".repeat(32), 0, false],
      ["bad", 0, false],
      [profiler, undefined, false],
      [profiler, -1, false],
      [profiler, 0.5, false],
      [profiler, Number.MAX_SAFE_INTEGER + 1, false],
      [profiler, "1", false],
      [profiler, 1, false],
    ] as const;
    for (const [id, thread, valid] of cases) {
      const attributes = {
        "sentry.thread.id": { type: "string", value: secret },
        ...(id === undefined ? {} : { "sentry.profiler_id": { type: "string", value: id } }),
        ...(thread === undefined
          ? {}
          : {
              "thread.id": {
                type: typeof thread === "number" ? "integer" : "string",
                value: thread,
              },
            }),
      };
      await client.sendEnvelope([
        {},
        [[{ type: "span" }, { version: 2, items: [{ ...first, attributes }] }]],
      ] as unknown as Envelope);
      const last = spans().at(-1)!;
      expect(last.attributes["thread.id"]).toEqual(
        valid ? { type: "integer", value: 0 } : undefined,
      );
      expect(last.attributes["sentry.thread.id"]).toEqual(
        valid ? { type: "string", value: "0" } : undefined,
      );
      expect(last.attributes["sentry.profiler_id"]?.value).toBe(valid ? profiler : undefined);
    }
    expect(JSON.stringify(sent)).not.toContain(secret);
  } finally {
    await client.close(2000);
    Sentry.getCurrentScope().setClient(undefined);
  }
});
