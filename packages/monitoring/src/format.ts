import type { Log, Metric, SerializedLog, SerializedMetric } from "@sentry/core";
import { cleanAttributes, finite, logLevel, object, typedAttributes } from "./format-attributes.ts";
import type { TelemetryConfig } from "./policy.ts";
import { validId } from "./profile.ts";
export function cleanLog(log: Log, component: string, config: TelemetryConfig): Log | null {
  const level = logLevel(log.message);
  if (!level || level !== log.level) return null;
  return {
    message: log.message,
    level,
    attributes: cleanAttributes(log.attributes, component, config),
  };
}
export function metricAllowed(metric: {
  name: unknown;
  type: unknown;
  unit?: unknown;
  value: unknown;
}) {
  if (!finite(metric.value)) return false;
  if (metric.name === "app.operation.count" || metric.name === "app.scheduler.tick")
    return (
      metric.type === "counter" &&
      Number.isSafeInteger(metric.value) &&
      metric.value > 0 &&
      (!metric.unit || metric.unit === "none")
    );
  return (
    (metric.name === "app.operation.duration" || metric.name === "app.scheduler.duration") &&
    metric.type === "distribution" &&
    metric.unit === "millisecond"
  );
}
export function cleanMetric(
  metric: Metric,
  component: string,
  config: TelemetryConfig,
): Metric | null {
  if (!metricAllowed(metric)) return null;
  return {
    name: metric.name,
    type: metric.type,
    value: metric.value,
    unit: metric.unit,
    attributes: cleanAttributes(metric.attributes, component, config),
  };
}
export function wireLog(
  value: unknown,
  component: string,
  config: TelemetryConfig,
): SerializedLog[] {
  const log = object(value);
  const level = logLevel(log?.body);
  if (!log || !level || level !== log.level || !finite(log.timestamp)) return [];
  return [
    {
      timestamp: log.timestamp,
      level,
      body: log.body as string,
      severity_number: level === "error" ? 17 : level === "warn" ? 13 : 9,
      ...(validId(log.trace_id) ? { trace_id: log.trace_id } : {}),
      attributes: typedAttributes(cleanAttributes(log.attributes, component, config, true)),
    },
  ];
}
export function wireMetric(
  value: unknown,
  component: string,
  config: TelemetryConfig,
): SerializedMetric[] {
  const metric = object(value);
  if (
    !metric ||
    !finite(metric.timestamp) ||
    !metricAllowed({
      name: metric.name,
      type: metric.type,
      unit: metric.unit,
      value: metric.value,
    }) ||
    !validId(metric.trace_id)
  )
    return [];
  return [
    {
      timestamp: metric.timestamp,
      trace_id: metric.trace_id,
      ...(validId(metric.span_id, 16) ? { span_id: metric.span_id } : {}),
      name: metric.name as string,
      type: metric.type as Metric["type"],
      value: metric.value as number,
      ...(metric.unit ? { unit: metric.unit as Metric["unit"] } : {}),
      attributes: typedAttributes(cleanAttributes(metric.attributes, component, config, true)),
    },
  ];
}
