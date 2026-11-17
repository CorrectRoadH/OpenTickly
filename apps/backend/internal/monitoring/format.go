package monitoring

import (
	"github.com/getsentry/sentry-go"
	"github.com/getsentry/sentry-go/attribute"
	"math"
)

func telemetryAttributes(raw map[string]attribute.Value, environment, release string) map[string]attribute.Value {
	clean := map[string]attribute.Value{"component": attribute.StringValue("api"), "sentry.release": attribute.StringValue(release), "sentry.environment": attribute.StringValue(environment), "sentry.sdk.name": attribute.StringValue("sentry.go"), "sentry.sdk.version": attribute.StringValue(sentry.SDKVersion)}
	if value := raw["operation"]; value.Type() == attribute.STRING && businessNames[value.AsString()] {
		clean["operation"] = value
	}
	if value := raw["outcome"]; value.Type() == attribute.STRING {
		switch value.AsString() {
		case "success", "error", "cancelled", "rejected":
			clean["outcome"] = value
		}
	}
	if value := raw["scheduler"]; value.Type() == attribute.STRING {
		switch value.AsString() {
		case "dream", "shared_pages", "media_cleanup", "audit_cleanup", "update_check":
			clean["scheduler"] = value
		}
	}
	for _, key := range []string{"duration_ms", "http.response.status_code"} {
		value := raw[key]
		if value.Type() == attribute.INT64 && value.AsInt64() >= 0 {
			if key == "duration_ms" || (value.AsInt64() >= 100 && value.AsInt64() <= 599) {
				clean[key] = value
			}
		}
		if key == "duration_ms" && value.Type() == attribute.FLOAT64 && !math.IsNaN(value.AsFloat64()) && !math.IsInf(value.AsFloat64(), 0) && value.AsFloat64() >= 0 {
			clean[key] = value
		}
	}
	if value := raw["sentry.trace.parent_span_id"]; value.Type() == attribute.STRING && len(value.AsString()) == 16 {
		if match := tracePattern.FindStringSubmatch("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-" + value.AsString() + "-1"); match != nil && value.AsString() != "0000000000000000" {
			clean["sentry.trace.parent_span_id"] = value
		}
	}
	return clean
}
func sanitizeLog(raw *sentry.Log, environment, release string) *sentry.Log {
	if raw == nil || raw.Timestamp.IsZero() {
		return nil
	}
	var level sentry.LogLevel
	severity := 0
	switch raw.Body {
	case "operation.failed":
		level = sentry.LogLevelError
		severity = 17
	case "operation.degraded":
		level = sentry.LogLevelWarn
		severity = 13
	case "service.started", "service.stopped":
		level = sentry.LogLevelInfo
		severity = 9
	default:
		return nil
	}
	if raw.Level != level {
		return nil
	}
	raw.Level = level
	raw.Severity = severity
	raw.Attributes = telemetryAttributes(raw.Attributes, environment, release)
	return raw
}
func sanitizeMetric(raw *sentry.Metric, environment, release string) *sentry.Metric {
	if raw == nil || raw.Timestamp.IsZero() {
		return nil
	}
	switch raw.Name {
	case "app.operation.count", "app.scheduler.tick":
		value, ok := raw.Value.Int64()
		if !ok || value <= 0 || raw.Type != sentry.MetricTypeCounter || (raw.Unit != "" && raw.Unit != "none") {
			return nil
		}
	case "app.operation.duration", "app.scheduler.duration":
		value, ok := raw.Value.Float64()
		if !ok || value < 0 || math.IsNaN(value) || math.IsInf(value, 0) || raw.Type != sentry.MetricTypeDistribution || raw.Unit != sentry.UnitMillisecond {
			return nil
		}
	default:
		return nil
	}
	return &sentry.Metric{Timestamp: raw.Timestamp, TraceID: raw.TraceID, SpanID: raw.SpanID, Name: raw.Name, Type: raw.Type, Value: raw.Value, Unit: raw.Unit, Attributes: telemetryAttributes(raw.Attributes, environment, release)}
}
