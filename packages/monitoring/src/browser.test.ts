import type { Envelope, SerializedStreamedSpanContainer } from "@sentry/core";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { envelopePrivacy } from "./envelope.ts";
import * as Sentry from "@sentry/react";
import { initBrowser } from "./browser.ts";
import { privacyOptions } from "./policy.ts";

const config = {
  dsn: "https://public@example.com/1",
  environment: "production",
  release: "web@test",
};
afterEach(async () => {
  await Sentry.close();
  Sentry.getCurrentScope().setClient(undefined);
  vi.unstubAllGlobals();
});
describe("browser SDK", () => {
  it("sends v2 spans with DSC for a sampled parent without baggage", async () => {
    const envelopes: Envelope[] = [];
    Sentry.init({
      ...privacyOptions("web", config),
      defaultIntegrations: false,
      tracesSampleRate: 1,
      integrations: [envelopePrivacy(config)],
      transport: () => ({
        send: async (envelope) => {
          envelopes.push(envelope);
          return { statusCode: 200 };
        },
        flush: async () => true,
      }),
    });
    const traceId = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    Sentry.continueTrace({ sentryTrace: `${traceId}-bbbbbbbbbbbbbbbb-1`, baggage: undefined }, () =>
      Sentry.startSpan({ name: "navigation", op: "navigation" }, () => {
        Sentry.startSpan({ name: "child", op: "http.client" }, () => {});
      }),
    );
    await Sentry.flush(2000);
    const spans = [];
    for (const [header, entries] of envelopes) {
      for (const [item, body] of entries) {
        if (item.type !== "span") continue;
        const payload = body as SerializedStreamedSpanContainer;
        expect(item).toEqual({
          type: "span",
          content_type: "application/vnd.sentry.items.span.v2+json",
          item_count: payload.items.length,
        });
        expect(header.trace).toMatchObject({ trace_id: traceId, public_key: "public" });
        expect(payload.items.every((span) => span.trace_id === traceId)).toBe(true);
        spans.push(...payload.items);
      }
    }
    expect(spans).toHaveLength(2);
  });
  it("does not create a client without DSN", () => {
    initBrowser(
      "web",
      {},
      { hostname: "selfhosted.example", origin: "https://selfhosted.example" },
    );
    expect(Sentry.getClient()).toBeUndefined();
  });
  it("initializes only once and propagates only to same-site APIs", () => {
    initBrowser("web", config, {
      hostname: "selfhosted.example",
      origin: "https://selfhosted.example",
    });
    const client = Sentry.getClient();
    initBrowser("web", config, {
      hostname: "selfhosted.example",
      origin: "https://selfhosted.example",
    });
    expect(Sentry.getClient()).toBe(client);
    const targets = client?.getOptions().tracePropagationTargets as RegExp[];
    expect(targets.some((target) => target.test("https://selfhosted.example/web/v1/session"))).toBe(
      true,
    );
    for (const url of [
      "https://vendor.example/web/v1/session",
      "https://track.opentoggl.com.evil/web/v1/session",
      "https://track.opentoggl.com/file",
    ])
      expect(targets.some((target) => target.test(url))).toBe(false);
  });
  it("sends real SDK errors and root/child stream spans through the privacy boundary", async () => {
    const envelopes: Envelope[] = [];
    Sentry.init({
      ...privacyOptions("web", config),
      defaultIntegrations: false,
      integrations: [envelopePrivacy(config)],
      tracesSampleRate: 1,
      transport: () => ({
        send: async (envelope) => {
          envelopes.push(envelope);
          return { statusCode: 200 };
        },
        flush: async () => true,
      }),
    });
    await Sentry.startNewTrace(() =>
      Sentry.startSpan(
        { name: "SENSITIVE", op: "http.request", attributes: { "db.query.text": "SENSITIVE" } },
        async () => {
          await Sentry.startSpan(
            {
              name: "SENSITIVE",
              op: "http.client",
              attributes: { "url.full": "https://example.com?q=SENSITIVE" },
            },
            async () => {
              Sentry.withScope((scope) => {
                scope.setUser({ email: "SENSITIVE" });
                scope.setExtra("nested", { token: "SENSITIVE" });
                const error = new Error("SENSITIVE");
                error.stack =
                  "Error: SENSITIVE\n    at run (https://example.com/app.js?key=SENSITIVE:1:2)";
                vi.stubGlobal("_sentryDebugIds", {
                  [error.stack]: "12345678-1234-1234-1234-123456789abc",
                });
                Sentry.captureException(error, {
                  mechanism: {
                    type: "auto.browser.global_handlers.onerror",
                    handled: false,
                    is_exception_group: true,
                    data: { secret: "SENSITIVE" },
                  },
                });
              });
            },
          );
        },
      ),
    );
    await Sentry.flush(2000);
    const payload = JSON.stringify(envelopes);
    expect(payload).not.toContain("SENSITIVE");
    expect(payload).toContain('"exception"');
    expect(payload).toContain('"handled":false');
    expect(payload).toContain('"is_exception_group":true');
    expect(payload).toContain('"debug_id":"12345678-1234-1234-1234-123456789abc"');
    expect(payload).toContain('"code_file":"https://example.com/app.js"');
    expect(payload).toContain('"span"');
    expect(payload).toContain('"component"');
    const spans = envelopes.flatMap((envelope) =>
      envelope[1].flatMap((item) =>
        item[0].type === "span" ? (item[1] as SerializedStreamedSpanContainer).items : [],
      ),
    );
    expect(spans).toHaveLength(2);
    expect(spans.every((span) => span.attributes.component?.value === "web")).toBe(true);
    expect(spans[0].trace_id).toBe(spans[1].trace_id);
  });
});
