import actual from "../src/index.ts";
import { monitorWorker, sentryOptions } from "../src/sentry.ts";
export default monitorWorker(
  {
    fetch(request, env, ctx) {
      if (new URL(request.url).pathname === "/fixture/failure")
        return Promise.resolve(new Response("failed", { status: 503 }));
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
