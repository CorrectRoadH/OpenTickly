import { sanitizeEvent } from "./error-event.ts";
import { cleanLog, cleanMetric } from "./format.ts";
import type { ErrorEvent, StreamedSpanJSON } from "@sentry/core";
import { operationName } from "./operations.ts";
import { validId } from "./profile.ts";

export { sanitizeEvent } from "./error-event.ts";

export interface TelemetryConfig {
  dsn: string;
  environment: string;
  release: string;
}
export function safeLabel(value: unknown): string {
  return typeof value === "string" && value.length <= 200 && !/[\x00-\x1f\x7f]/.test(value)
    ? value
    : "";
}
export function telemetryConfig(value: unknown): TelemetryConfig | undefined {
  if (!value || typeof value !== "object") return;
  const { dsn, environment, release } = value as Partial<TelemetryConfig>;
  try {
    const url = new URL(dsn ?? "");
    if (
      url.protocol !== "https:" ||
      !url.username ||
      url.password ||
      !/^\/[0-9]+$/.test(url.pathname) ||
      url.search ||
      url.hash
    )
      return;
    return {
      dsn: url.href,
      environment: safeLabel(environment) || "production",
      release: safeLabel(release),
    };
  } catch {
    return;
  }
}
export const dataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  mcp: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
  frameContextLines: 0,
} as const;

const operations = new Set([
  "pageload",
  "navigation",
  "http.client",
  "http.server",
  "http.request",
  "ui.action",
  "task",
  "cache.get",
]);
const origins = new Set([
  "manual",
  "auto.http.browser",
  "auto.pageload.browser",
  "auto.navigation.browser",
  "auto.http.cloudflare",
]);
export function sanitizeSpan(
  span: StreamedSpanJSON,
  component: string,
  config: TelemetryConfig,
  profiling = false,
): StreamedSpanJSON {
  const op = operations.has(String(span.attributes["sentry.op"]))
    ? String(span.attributes["sentry.op"])
    : "http.request";
  const name = operationName(span.name) ? span.name : op;
  const attributes: StreamedSpanJSON["attributes"] = {
    component,
    "sentry.op": op,
    "sentry.segment.name": name,
    "sentry.release": config.release,
    "sentry.environment": config.environment,
  };
  const origin = span.attributes["sentry.origin"];
  if (typeof origin === "string" && origins.has(origin)) attributes["sentry.origin"] = origin;
  const segment = span.attributes["sentry.segment.id"];
  if (typeof segment === "string" && /^[a-f0-9]{16}$/.test(segment))
    attributes["sentry.segment.id"] = segment;
  for (const key of [
    "sentry.sample_rate",
    "http.response.status_code",
    "http.status_code",
    "sentry.measurement.lcp",
    "sentry.measurement.fcp",
    "sentry.measurement.cls",
    "sentry.measurement.inp",
  ]) {
    const value = span.attributes[key];
    if (typeof value === "number" && Number.isFinite(value)) attributes[key] = value;
  }
  const outcome = span.attributes.outcome;
  if (
    outcome === "success" ||
    outcome === "error" ||
    outcome === "rejected" ||
    outcome === "cancelled"
  )
    attributes.outcome = outcome;
  if (
    profiling &&
    validId(span.attributes["sentry.profiler_id"]) &&
    (span.attributes["thread.id"] === 0 || span.attributes["thread.id"] === "0")
  ) {
    const threadId = Number(span.attributes["thread.id"]);
    attributes["sentry.profiler_id"] = span.attributes["sentry.profiler_id"];
    attributes["thread.id"] = threadId;
    attributes["sentry.thread.id"] = String(threadId);
  }
  return {
    trace_id: span.trace_id,
    span_id: span.span_id,
    parent_span_id: span.parent_span_id,
    name,
    start_timestamp: span.start_timestamp,
    end_timestamp: span.end_timestamp,
    status: span.status,
    is_segment: span.is_segment,
    attributes,
  };
}
export function privacyOptions(component: string, config: TelemetryConfig, profiling = false) {
  return {
    ...config,
    dataCollection: { ...dataCollection, httpBodies: [] },
    sendDefaultPii: false,
    sendClientReports: true,
    traceLifecycle: "stream" as const,
    beforeSendLog: (log: import("@sentry/core").Log) => cleanLog(log, component, config),
    beforeSendMetric: (metric: import("@sentry/core").Metric) =>
      cleanMetric(metric, component, config),
    beforeSend: (event: ErrorEvent) => sanitizeEvent(event, component, config),
    beforeSendSpan: (span: StreamedSpanJSON) => sanitizeSpan(span, component, config, profiling),
  };
}
