import type { SerializedStreamedSpan, StreamedSpanJSON } from "@sentry/core";
import { sanitizeSpan, type TelemetryConfig } from "./policy.ts";
import { validId } from "./profile.ts";
export function wireSpan(
  value: unknown,
  component: string,
  config: TelemetryConfig,
  profiling: boolean,
): SerializedStreamedSpan[] {
  if (!value || typeof value !== "object") return [];
  const raw = value as SerializedStreamedSpan;
  if (
    !validId(raw.trace_id) ||
    !validId(raw.span_id, 16) ||
    (raw.parent_span_id !== undefined && !validId(raw.parent_span_id, 16)) ||
    !Number.isFinite(raw.start_timestamp) ||
    !Number.isFinite(raw.end_timestamp) ||
    (raw.status !== "ok" && raw.status !== "error") ||
    typeof raw.is_segment !== "boolean" ||
    raw.end_timestamp < raw.start_timestamp ||
    !raw.attributes
  )
    return [];
  const attributes = Object.fromEntries(
    Object.entries(raw.attributes).flatMap(([key, item]) =>
      item && typeof item === "object" && "value" in item ? [[key, item.value]] : [],
    ),
  );
  const threadId = attributes["thread.id"];
  if (typeof threadId !== "number" || !Number.isSafeInteger(threadId) || threadId < 0) {
    delete attributes["sentry.profiler_id"];
    delete attributes["thread.id"];
  }
  const span = sanitizeSpan(
    { ...raw, attributes } as StreamedSpanJSON,
    component,
    config,
    profiling,
  );
  const typed: SerializedStreamedSpan["attributes"] = {};
  for (const [key, value] of Object.entries(span.attributes)) {
    if (typeof value === "string") typed[key] = { type: "string", value };
    else if (typeof value === "number")
      typed[key] = { type: Number.isInteger(value) ? "integer" : "double", value };
    else if (typeof value === "boolean") typed[key] = { type: "boolean", value };
  }
  return [
    {
      trace_id: span.trace_id,
      span_id: span.span_id,
      parent_span_id: span.parent_span_id,
      start_timestamp: span.start_timestamp,
      end_timestamp: raw.end_timestamp,
      name: span.name,
      status: span.status,
      is_segment: span.is_segment,
      attributes: typed,
    },
  ];
}
