import type { SerializedLog } from "@sentry/core";
import { operationName } from "./operations.ts";
import type { TelemetryConfig } from "./policy.ts";
import { validId } from "./profile.ts";
export const object = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
export const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
export const outcomes = new Set(["success", "error", "cancelled", "rejected"]);
export const schedulers = new Set([
  "dream",
  "shared_pages",
  "media_cleanup",
  "audit_cleanup",
  "update_check",
]);
export function cleanAttributes(
  value: unknown,
  component: string,
  config: TelemetryConfig,
  typed = false,
): Record<string, string | number> {
  const raw = object(value) ?? {};
  const attributes = typed
    ? Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, object(value)?.value]))
    : raw;
  const clean: Record<string, string | number> = {
    component,
    "sentry.release": config.release,
    "sentry.environment": config.environment,
    "sentry.sdk.name":
      component === "update" ? "sentry.javascript.cloudflare" : "sentry.javascript.react",
    "sentry.sdk.version": "11.13.0",
  };
  if (operationName(attributes.operation)) clean.operation = attributes.operation;
  if (typeof attributes.outcome === "string" && outcomes.has(attributes.outcome))
    clean.outcome = attributes.outcome;
  if (typeof attributes.scheduler === "string" && schedulers.has(attributes.scheduler))
    clean.scheduler = attributes.scheduler;
  for (const key of ["http.response.status_code", "duration_ms"])
    if (
      finite(attributes[key]) &&
      (key !== "http.response.status_code" ||
        (Number.isInteger(attributes[key]) && attributes[key] >= 100 && attributes[key] <= 599))
    )
      clean[key] = attributes[key];
  if (validId(attributes["sentry.trace.parent_span_id"], 16))
    clean["sentry.trace.parent_span_id"] = attributes["sentry.trace.parent_span_id"];
  return clean;
}
export function typedAttributes(
  value: Record<string, string | number>,
): NonNullable<SerializedLog["attributes"]> {
  return Object.fromEntries(
    Object.entries(value).map(([key, value]) => [
      key,
      typeof value === "string"
        ? { type: "string" as const, value }
        : { type: Number.isInteger(value) ? ("integer" as const) : ("double" as const), value },
    ]),
  );
}
export const messages = {
  "operation.failed": "error",
  "operation.degraded": "warn",
  "service.started": "info",
  "service.stopped": "info",
} as const;
export function logLevel(message: unknown) {
  return typeof message === "string" && Object.hasOwn(messages, message)
    ? messages[message as keyof typeof messages]
    : undefined;
}
