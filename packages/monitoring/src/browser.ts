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
      integrations: [
        safeDsc(config),
        ...(component === "landing" ? [landingMetrics()] : []),
        envelopePrivacy(config, component, {
          enabled: profiling,
          manifest: () => manifest,
          origin: location.origin,
        }),
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
let requested = false;
export async function initDemoTelemetry() {
  if (requested) return;
  requested = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetch("/web/v1/telemetry/config", {
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
    });
    if (response.ok) {
      const value: unknown = await response.json();
      if (value && typeof value === "object" && "sentry" in value) initBrowser("web", value.sentry);
    }
  } catch {
    /* Configuration failure leaves monitoring disabled. */
  } finally {
    clearTimeout(timeout);
  }
}
export { ErrorBoundary, captureException } from "@sentry/react";
