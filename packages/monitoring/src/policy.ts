import type { ErrorEvent, StreamedSpanJSON } from "@sentry/core";

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

function filename(value: string | undefined): string | undefined {
  if (!value) return;
  try {
    const url = new URL(value);
    return url.origin === "null" ? url.pathname : `${url.origin}${url.pathname}`;
  } catch {
    return value.split(/[?#]/)[0];
  }
}
const mechanisms = new Set([
  "generic",
  "onerror",
  "onunhandledrejection",
  "instrument",
  "auto.http.cloudflare",
  "auto.function.react.error_boundary",
  "auto.function.react.error_handler",
  "auto.browser.global_handlers.onerror",
  "auto.browser.global_handlers.onunhandledrejection",
  "auto.browser.browserapierrors.addEventListener",
  "auto.browser.browserapierrors.handleEvent",
  "auto.browser.browserapierrors.requestAnimationFrame",
  "auto.browser.browserapierrors.setTimeout",
  "auto.browser.browserapierrors.setInterval",
]);
const errorTypes = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "URIError",
  "EvalError",
]);
export function sanitizeEvent(
  event: ErrorEvent,
  component: string,
  config: TelemetryConfig,
): ErrorEvent {
  const trace = event.contexts?.trace;
  return {
    type: event.type,
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    level: event.level,
    release: config.release,
    environment: config.environment,
    tags: { component },
    exception: {
      values: event.exception?.values?.map((value) => ({
        type: errorTypes.has(value.type ?? "") ? value.type : "Error",
        value: "Application error",
        mechanism: value.mechanism
          ? {
              type: mechanisms.has(value.mechanism.type) ? value.mechanism.type : "generic",
              handled: value.mechanism.handled,
              is_exception_group: value.mechanism.is_exception_group,
              exception_id: Number.isInteger(value.mechanism.exception_id)
                ? value.mechanism.exception_id
                : undefined,
              parent_id: Number.isInteger(value.mechanism.parent_id)
                ? value.mechanism.parent_id
                : undefined,
            }
          : undefined,
        stacktrace: {
          frames: value.stacktrace?.frames?.map((frame) => ({
            filename: filename(frame.filename),
            function: frame.function,
            module: frame.module,
            lineno: frame.lineno,
            colno: frame.colno,
            in_app: frame.in_app,
            debug_id: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
              frame.debug_id ?? "",
            )
              ? frame.debug_id
              : undefined,
          })),
        },
      })),
    },
    debug_meta: {
      images: event.debug_meta?.images?.flatMap((image) =>
        image.type === "sourcemap" &&
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(image.debug_id)
          ? [
              {
                type: "sourcemap" as const,
                debug_id: image.debug_id,
                code_file: filename(image.code_file) ?? "",
              },
            ]
          : [],
      ),
    },
    contexts: trace
      ? {
          trace: {
            trace_id: trace.trace_id,
            span_id: trace.span_id,
            parent_span_id: trace.parent_span_id,
            op: "http.request",
          },
        }
      : undefined,
  };
}
const operations = new Set([
  "pageload",
  "navigation",
  "http.client",
  "http.server",
  "http.request",
  "ui.action",
  "task",
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
): StreamedSpanJSON {
  const op = operations.has(String(span.attributes["sentry.op"]))
    ? String(span.attributes["sentry.op"])
    : "http.request";
  const attributes: StreamedSpanJSON["attributes"] = {
    component,
    "sentry.op": op,
    "sentry.segment.name": op,
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
  return {
    trace_id: span.trace_id,
    span_id: span.span_id,
    parent_span_id: span.parent_span_id,
    name: op,
    start_timestamp: span.start_timestamp,
    end_timestamp: span.end_timestamp,
    status: span.status,
    is_segment: span.is_segment,
    attributes,
  };
}
export function privacyOptions(component: string, config: TelemetryConfig) {
  return {
    ...config,
    dataCollection: { ...dataCollection, httpBodies: [] },
    traceLifecycle: "stream" as const,
    beforeSendLog: () => null,
    beforeSend: (event: ErrorEvent) => sanitizeEvent(event, component, config),
    beforeSendSpan: (span: StreamedSpanJSON) => sanitizeSpan(span, component, config),
  };
}
