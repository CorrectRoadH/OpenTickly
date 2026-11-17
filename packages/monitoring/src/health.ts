import type { ClientReport, SessionAggregates, Session } from "@sentry/core";
import { finite, object } from "./format-attributes.ts";
import type { TelemetryConfig } from "./policy.ts";
import { validId } from "./profile.ts";
const reasons = new Set([
  "before_send",
  "callback_error",
  "event_processor",
  "network_error",
  "queue_overflow",
  "ratelimit_backoff",
  "sample_rate",
  "send_error",
  "internal_sdk_error",
  "buffer_overflow",
  "ignored",
  "invalid",
  "no_parent_span",
]);
const categories = new Set([
  "default",
  "error",
  "transaction",
  "replay",
  "security",
  "attachment",
  "session",
  "internal",
  "profile",
  "monitor",
  "feedback",
  "span",
  "log_item",
  "log_byte",
  "trace_metric",
  "unknown",
]);
export function wireClientReport(value: unknown): ClientReport | undefined {
  const report = object(value);
  if (!report || !finite(report.timestamp) || !Array.isArray(report.discarded_events)) return;
  const discarded = report.discarded_events.flatMap((value) => {
    const item = object(value);
    return item &&
      typeof item.reason === "string" &&
      reasons.has(item.reason) &&
      typeof item.category === "string" &&
      categories.has(item.category) &&
      typeof item.quantity === "number" &&
      Number.isSafeInteger(item.quantity) &&
      item.quantity > 0
      ? [
          {
            reason: item.reason as ClientReport["discarded_events"][number]["reason"],
            category: item.category as ClientReport["discarded_events"][number]["category"],
            quantity: item.quantity,
          },
        ]
      : [];
  });
  if (!discarded.length) return;
  return { timestamp: report.timestamp, discarded_events: discarded };
}
const time = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d\d-\d\dT/.test(value) &&
  Number.isFinite(Date.parse(value));
export function wireSession(value: unknown, config: TelemetryConfig) {
  const session = object(value);
  if (
    !session ||
    !validId(session.sid) ||
    typeof session.init !== "boolean" ||
    !time(session.started) ||
    !time(session.timestamp) ||
    !Number.isSafeInteger(session.errors) ||
    !finite(session.errors) ||
    !["ok", "exited", "crashed", "abnormal", "unhandled"].includes(String(session.status))
  )
    return;
  return {
    sid: session.sid,
    init: session.init,
    started: session.started,
    timestamp: session.timestamp,
    status: session.status,
    errors: session.errors,
    ...(finite(session.duration) ? { duration: session.duration } : {}),
    attrs: { release: config.release, environment: config.environment },
  } as ReturnType<Session["toJSON"]> | SessionAggregates;
}
