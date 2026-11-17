import { traceOperation } from "@opentickly/monitoring/operations";
import { officialSentryDsn } from "./sentry-dsn.ts";
import { envelopePrivacy } from "@opentickly/monitoring/envelope";
import * as Sentry from "@sentry/cloudflare";
import { privacyOptions, telemetryConfig } from "@opentickly/monitoring/policy";
import type { WorkerEnv } from "./types.ts";

export function sentryOptions(
  env: WorkerEnv,
  production = typeof __SENTRY_UPDATE_PRODUCTION__ !== "undefined" && __SENTRY_UPDATE_PRODUCTION__,
) {
  if (!production) return;
  const config = telemetryConfig({
    dsn: officialSentryDsn,
    environment: env.SENTRY_ENVIRONMENT,
    release:
      typeof __SENTRY_UPDATE_RELEASE__ === "undefined"
        ? env.SENTRY_RELEASE
        : __SENTRY_UPDATE_RELEASE__,
  });
  if (!config) return undefined;
  return {
    ...privacyOptions("update", config),
    tracesSampleRate: 0.01,
    tracePropagationTargets: [],
    integrations: [envelopePrivacy(config, "update"), Sentry.spanStreamingIntegration()],
    defaultIntegrations: false as const,
  };
}
export function captureUpdateError(error: unknown) {
  Sentry.captureException(error);
}
declare const __SENTRY_UPDATE_RELEASE__: string;
declare const __SENTRY_UPDATE_PRODUCTION__: boolean;
type FetchHandler = {
  fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response>;
};
export function monitorWorker(
  handler: FetchHandler,
  optionsForEnv: (env: WorkerEnv) => Sentry.CloudflareOptions | undefined = sentryOptions,
): FetchHandler {
  const originalRequests = new WeakMap<Request, Request>();
  const instrumented = {
    ...handler,
    fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
      return traceOperation("update.request", () =>
        handler.fetch(originalRequests.get(request) ?? request, env, ctx),
      );
    },
  };
  const wrapped = Sentry.withSentry(optionsForEnv, instrumented);
  return {
    ...handler,
    fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
      if (!optionsForEnv(env)) return handler.fetch(request, env, ctx);
      const headers = new Headers(request.headers);
      const trace = headers.get("sentry-trace") ?? "";
      const match = trace.match(/^([a-f0-9]{32})-([a-f0-9]{16})-([01])$/);
      if (!match || /^0+$/.test(match[1]!) || /^0+$/.test(match[2]!))
        headers.delete("sentry-trace");
      headers.delete("baggage");
      // Only the SDK sees this metadata carrier; business receives the original body/signal.
      const carrier = new Request(request.url, {
        method: request.method,
        headers,
        signal: request.signal,
      });
      originalRequests.set(carrier, request);
      return wrapped.fetch(carrier, env, ctx).finally(() => originalRequests.delete(carrier));
    },
  };
}
