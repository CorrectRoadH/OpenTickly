import actual from "../src/index.ts";
import { captureUpdateError, monitorWorker, sentryOptions } from "../src/sentry.ts";

function throwManifestError() {
  throw new TypeError("Could not read the update manifest", {
    cause: new SyntaxError("Malformed release: Bearer SENSITIVE"),
  });
}

export default monitorWorker(
  {
    async fetch(request, env, ctx) {
      const path = new URL(request.url).pathname;
      if (path === "/fixture/failure") return new Response("failed", { status: 503 });
      if (path === "/fixture/error-chain") {
        try {
          throwManifestError();
        } catch (error) {
          captureUpdateError(error, 200);
        }
        return new Response("fallback");
      }
      return actual.fetch(request, env, ctx);
    },
  },
  (env) => ({
    ...sentryOptions(env, true),
    cacheClient: false,
    tracesSampleRate: 1,
    dsn: "https://public@example.invalid/1",
  }),
);
