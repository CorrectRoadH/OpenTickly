import * as Sentry from "@sentry/react";
import { initBrowser } from "./browser.ts";
import { traceOperation } from "./operations.ts";
import { createClient } from "../../../apps/website/src/shared/api/generated/web/client/index.ts";
import { traceApiClient } from "../../../apps/website/src/shared/api/trace-client.ts";
import type { Envelope } from "@sentry/core";

const envelopes: Envelope[] = [];
initBrowser(
  "web",
  {
    dsn: "https://public@example.invalid/1",
    environment: "production",
    release: "web@" + "a".repeat(40),
  },
  window.location,
  {
    profiling: false,
    tracesSampleRate: 1,
    transport: () => ({
      send: async (envelope) => {
        envelopes.push(envelope);
        return { statusCode: 200 };
      },
      flush: async () => true,
    }),
  },
);
const completionOrder: string[] = [];
const client = createClient({ baseUrl: location.origin });
traceApiClient(client);
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
const a = gate(),
  b = gate(),
  authA = gate(),
  authB = gate(),
  finishA = gate();
let aRequest = false,
  bDone = false,
  allDone = false,
  pageloadEnded = false,
  aAuth = false,
  bAuth = false;
Sentry.getClient()?.on("spanEnd", (span) => {
  if (Sentry.spanToJSON(span).attributes["sentry.op"] === "pageload") pageloadEnded = true;
});
Object.assign(window, {
  concurrent: {
    envelopes,
    completionOrder,
    start() {
      const first = traceOperation("project.list", async (context) => {
        await a.promise;
        await context.run(() =>
          client.get({
            url: "/api/v9/workspaces/1/projects",
            security: [{ scheme: "bearer", type: "http" }],
            auth: async () => {
              aAuth = true;
              await authA.promise;
              return "fixture";
            },
          }),
        );
        aRequest = true;
        await finishA.promise;
        return "A";
      });
      const second = traceOperation("client.list", async (context) => {
        await b.promise;
        await context.run(() =>
          client.get({
            url: "/api/v9/workspaces/1/clients",
            security: [{ scheme: "bearer", type: "http" }],
            auth: async () => {
              bAuth = true;
              await authB.promise;
              return "fixture";
            },
          }),
        );
        bDone = true;
        return "B";
      });
      void first.then(() => {
        completionOrder.push("A");
      });
      void second.then(() => {
        completionOrder.push("B");
      });
      void Promise.all([first, second]).then(() => {
        allDone = true;
      });
    },
    unowned: () =>
      Promise.resolve()
        .then(() => fetch("/api/v9/me/time_entries"))
        .then((r) => r.text()),
    a: () => a.release(),
    b: () => b.release(),
    authA: () => authA.release(),
    authB: () => authB.release(),
    finishA: () => finishA.release(),
    get aAuth() {
      return aAuth;
    },
    get bAuth() {
      return bAuth;
    },
    get aRequest() {
      return aRequest;
    },
    get bDone() {
      return bDone;
    },
    get allDone() {
      return allDone;
    },
    get pageloadEnded() {
      return pageloadEnded;
    },
    activeOp() {
      const span = Sentry.getActiveSpan();
      return span ? Sentry.spanToJSON(span).attributes["sentry.op"] : undefined;
    },
    flush: () => Sentry.flush(2000),
  },
});
document.body.innerHTML = '<main data-testid="concurrent-trace">Ready</main>';
