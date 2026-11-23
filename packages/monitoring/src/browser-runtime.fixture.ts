import * as Sentry from "@sentry/react";
import { initBrowser } from "./browser.ts";
import { traceOperation } from "./operations.ts";
import type { Envelope, ErrorEvent } from "@sentry/core";
const envelopes: Envelope[] = [];
const raw: Envelope[] = [];
const wireEvents: ErrorEvent[] = [];
const capturedMetrics: { name: string }[] = [];
const config = {
  dsn: "https://public@example.invalid/1",
  release: "web@" + "a".repeat(40),
  environment: "production",
};
const originalFetch = globalThis.fetch;
if (location.search.includes("guard-failure")) {
  let current = globalThis.fetch;
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    get: () => current,
    set: (value: typeof fetch) => {
      if (value.name === "guard") throw new Error("host rejected wrapper");
      current = value;
    },
  });
}
initBrowser(
  location.search.includes("landing") ? "landing" : "web",
  location.search.includes("disabled") ? {} : config,
  window.location,
  {
    tracesSampleRate: location.search.includes("unsampled") ? 0 : 1,
    profileSessionSampleRate: 1,
    transport: (options) => {
      const transport = Sentry.createTransport(options, async ({ body }) => {
        const text = typeof body === "string" ? body : new TextDecoder().decode(body);
        const [, header, payload] = text.split("\n");
        if (header && payload && JSON.parse(header).type === "event") {
          wireEvents.push(JSON.parse(payload));
        }
        return { statusCode: 200 };
      });
      return {
        ...transport,
        send(envelope) {
          envelopes.push(envelope);
          return transport.send(envelope);
        },
      };
    },
  },
);
Sentry.getClient()?.on("afterCaptureMetric", (metric) => {
  capturedMetrics.push({ name: metric.name });
});
Sentry.getClient()?.on("beforeEnvelope", (envelope) => {
  if (envelope[1].some((i) => i[0].type === "profile_chunk")) raw.push(envelope);
});
const firstRequest = location.search.includes("landing")
  ? Promise.resolve()
  : traceOperation("report.load", () => fetch("/api/v9/me/time_entries"));
class ReportLoadError extends Error {
  override name = "ReportLoadError";
}
function throwReportLoadError() {
  throw new ReportLoadError("Could not load report.tsv: Bearer SENSITIVE", {
    cause: new SyntaxError("Invalid report metadata: Bearer SENSITIVE"),
  });
}
const runtime = {
  envelopes,
  wireEvents,
  capturedMetrics,
  raw,
  ready: true,
  fetchUnchanged: originalFetch === globalThis.fetch,
  async xhr() {
    return new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.onloadend = () => resolve();
      xhr.open("GET", "/web/v1/data");
      xhr.send();
    });
  },
  async request(path: string, redirect: RequestRedirect = "follow", baggage?: string) {
    return Sentry.startNewTrace(() =>
      traceOperation("report.load", async () => {
        const request = new Request(new URL(path, location.origin), {
          redirect,
          headers: baggage ? { baggage } : undefined,
        });
        try {
          const response = await fetch(request);
          await response.text();
          return response.type;
        } catch (error) {
          return error instanceof Error ? error.name : "error";
        }
      }),
    );
  },
  async profile() {
    return Sentry.startNewTrace(() =>
      traceOperation("report.export", async () => {
        function staticWork() {
          let value = 0;
          const end = performance.now() + 300;
          while (performance.now() < end) value += Math.sqrt(value + 2);
          return value;
        }
        staticWork();
        const label = ["SENSITIVE", "DYNAMIC", "SYMBOL"].join("_");
        // oxlint-disable-next-line typescript/no-implied-eval -- Exercise hostile dynamic profile code in an isolated browser.
        const work = new Function(
          `return function ${label}() { const end = performance.now()+120; while(performance.now()<end) Math.sqrt(Math.random()); };\n//# sourceURL=` +
            location.origin +
            "/runtime.js",
        )();
        work();
      }),
    );
  },
  async parent(sampled: "0" | "1", trace: string) {
    await Sentry.continueTrace(
      { sentryTrace: `${trace}-bbbbbbbbbbbbbbbb-${sampled}`, baggage: undefined },
      () =>
        traceOperation("timer.start", async () => {
          await fetch("/web/v1/data");
        }),
    );
  },
  session(handled: boolean) {
    try {
      throwReportLoadError();
    } catch (error) {
      Sentry.captureException(error, { mechanism: { type: "generic", handled } });
    }
  },
  reportDrop() {
    Sentry.logger.error("SENSITIVE");
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  },
  async flush() {
    await Sentry.flush(2000);
  },
};
Object.assign(window, { runtime });
void firstRequest.finally(() => {
  document.body.innerHTML = '<main data-testid="telemetry-runtime">Ready</main>';
});
