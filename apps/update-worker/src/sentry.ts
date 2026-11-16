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
    integrations: [envelopePrivacy(config)],
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
  const wrapped = Sentry.withSentry(optionsForEnv, { ...handler });
  return {
    ...handler,
    fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
      if (!optionsForEnv(env)) return handler.fetch(request, env, ctx);
      return wrapped.fetch(request, env, ctx);
    },
  };
}
