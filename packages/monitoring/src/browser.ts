import { httpOperation } from "./http-name.ts";
import { landingMetrics } from "./landing-metrics.ts";
import { installHeaderBoundary } from "./outgoing.ts";
import { safeDsc } from "./dsc.ts";
import { browserTargets, installFetchGuard } from "./propagation.ts";
import { profileManifest, type ProfileManifest } from "./profile.ts";
import { envelopePrivacy } from "./envelope.ts";
import * as Sentry from "@sentry/react";
import { privacyOptions, telemetryConfig } from "./policy.ts";

export function initBrowser(
  component: "landing" | "web",
  input: unknown,
  location: Pick<Location, "hostname" | "origin"> = window.location,
  // Official projects have verified IP scrubbing; an absent DSN still exits above.
  options: {
    profiling?: boolean;
    transport?: Sentry.BrowserOptions["transport"];
    tracesSampleRate?: number;
    profileSessionSampleRate?: number;
  } = {},
) {
  const config = telemetryConfig(input);
  if (!config || Sentry.getClient()) return;
  let manifest: ProfileManifest | undefined;
  const profiling =
    options.profiling !== false && typeof window !== "undefined" && "Profiler" in window;
  const targets = browserTargets(component, location.origin);
  try {
    installHeaderBoundary(globalThis, targets, location.origin, config);
    Sentry.init({
      ...privacyOptions(component, config, profiling),
      transport: options.transport,
      profileLifecycle: "trace",
      profileSessionSampleRate: profiling ? (options.profileSessionSampleRate ?? 0.1) : 0,
      tracesSampleRate: options.tracesSampleRate ?? 0.1,
      parentSpanIsAlwaysRootSpan: false,
      integrations: [
        safeDsc(config),
        ...(component === "landing" ? [landingMetrics()] : []),
        envelopePrivacy(config, component, {
          enabled: profiling,
          manifest: () => manifest,
          origin: location.origin,
        }),
        Sentry.linkedErrorsIntegration(),
        Sentry.globalHandlersIntegration(),
        Sentry.browserSessionIntegration(),
        Sentry.browserApiErrorsIntegration(),
        Sentry.browserTracingIntegration({
          traceXHR: false,
          beforeStartSpan: (options) =>
            component === "landing"
              ? {
                  ...options,
                  name: options.op === "pageload" ? "site.page.load" : "site.navigation",
                }
              : options,
        }),
        ...(profiling ? [Sentry.browserProfilingIntegration()] : []),
      ],
      defaultIntegrations: false,
      tracePropagationTargets: targets,
    });
    Sentry.getClient()?.on("spanStart", (span) => {
      const data = Sentry.spanToJSON(span);
      if (component !== "web" || data.attributes["sentry.op"] !== "http.client") return;
      const method = data.attributes["http.request.method"] ?? data.attributes["http.method"];
      const name = httpOperation(
        typeof method === "string" ? method : "GET",
        data.attributes["url.full"] ?? data.attributes["http.url"],
        location.origin,
      );
      if (name) Sentry.updateSpanName(span, name);
    });
    if (profiling)
      void fetch(new URL("/sentry-profile-assets.json", location.origin), {
        credentials: "omit",
        cache: "no-cache",
        redirect: "error",
      })
        .then((response) => (response.ok ? response.json() : undefined))
        .then((value) => {
          manifest = profileManifest(value, config.release);
        })
        .catch(() => {
          /* Missing manifest redacts all frames, tracing remains enabled. */
        });
  } catch {
    /* Monitoring must never prevent startup. */
  } finally {
    if (Sentry.getClient()) {
      try {
        installFetchGuard(globalThis, targets, location.origin);
      } catch {
        Sentry.getClient()!.getOptions().tracePropagationTargets?.splice(0);
      }
    }
  }
}
// Configuration is embedded in the HTML so the first session request is traced,
// while an unconfigured self-hosted instance starts without a network wait.
export function initDemoTelemetry() {
  try {
    const value = document.getElementById("opentickly-telemetry")?.textContent;
    if (value) initBrowser("web", JSON.parse(value));
  } catch {
    /* Invalid configuration leaves monitoring disabled. */
  }
}
export { ErrorBoundary, captureException } from "@sentry/react";
