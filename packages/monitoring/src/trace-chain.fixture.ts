import * as Sentry from "@sentry/react";
import { traceOperation } from "./operations.ts";
let pageloadEnded = false;
Sentry.getClient()?.on("spanEnd", (span) => {
  if (Sentry.spanToJSON(span).attributes["sentry.op"] === "pageload") pageloadEnded = true;
});
async function read() {
  const config = (await fetch("/fixture/config").then((r) => r.json())) as {
    path: string;
    authorization: string;
  };
  return traceOperation("project.list", async () => {
    const response = await fetch(config.path, { headers: { Authorization: config.authorization } });
    if (!response.ok) throw new Error("fixture read failed");
    await response.json();
  });
}
const first = read();
Object.assign(window, {
  chain: {
    configured: Boolean(Sentry.getClient()),
    get pageloadEnded() {
      return pageloadEnded;
    },
    async concurrent() {
      await Promise.all([read(), read()]);
    },
    async unsampled() {
      await Sentry.continueTrace(
        { sentryTrace: "cccccccccccccccccccccccccccccccc-bbbbbbbbbbbbbbbb-0", baggage: undefined },
        read,
      );
    },
    async flush() {
      await Sentry.flush(2000);
    },
  },
});
void first.then(() => {
  document.body.innerHTML = '<main data-testid="trace-chain">Ready</main>';
});
