import { envelopePrivacy } from "./envelope.ts";
import * as Sentry from "@sentry/react";
import { privacyOptions, telemetryConfig } from "./policy.ts";

export function initBrowser(
  component: "landing" | "web",
  input: unknown,
  location: Pick<Location, "hostname" | "origin"> = window.location,
) {
  const config = telemetryConfig(input);
  if (!config || Sentry.getClient()) return;
  try {
    Sentry.init({
      ...privacyOptions(component, config),
      tracesSampleRate: 0.1,
      integrations: [
        envelopePrivacy(config),
        Sentry.globalHandlersIntegration(),
        Sentry.browserApiErrorsIntegration(),
        Sentry.browserTracingIntegration(),
      ],
      defaultIntegrations: false,
      tracePropagationTargets: [
        new RegExp(
          `^${location.origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/(?:web/v1|api/v9|reports/api/v3|insights/api/v1|import/v1|admin/v1)(?:/|$)`,
        ),
      ],
    });
  } catch {
    /* Monitoring must never prevent startup. */
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
