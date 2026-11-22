package monitoring

import "github.com/getsentry/sentry-go"

func sanitizeTransaction(event *sentry.Event, environment, release string) *sentry.Event {
	clean := &sentry.Event{EventID: event.EventID, Timestamp: event.Timestamp, Level: event.Level, Platform: event.Platform, Type: event.Type, StartTime: event.StartTime, Release: label(release), Environment: label(environment), Tags: safeSpanTags(event.Tags)}
	if trace := event.Contexts["trace"]; trace != nil {
		clean.Contexts = map[string]sentry.Context{"trace": {}}
		for _, key := range []string{"trace_id", "span_id", "parent_span_id", "status"} {
			clean.Contexts["trace"][key] = trace[key]
		}
		clean.Contexts["trace"]["op"] = "http.server"
		if trace["op"] == "task" {
			clean.Contexts["trace"]["op"] = "task"
		}
	}
	clean.Transaction = safeSpanName(event.Transaction)
	clean.TransactionInfo = &sentry.TransactionInfo{Source: sentry.SourceCustom}
	for _, span := range event.Spans {
		clean.Spans = append(clean.Spans, &sentry.Span{TraceID: span.TraceID, SpanID: span.SpanID, ParentSpanID: span.ParentSpanID, Op: safeSpanOp(span.Op), Description: safeSpanName(span.Description), StartTime: span.StartTime, EndTime: span.EndTime, Status: span.Status, Tags: safeSpanTags(span.Tags)})
	}
	return clean
}

func safeSpanOp(op string) string {
	switch op {
	case "ui.action", "task", "http.client", "db.query":
		return op
	}
	return "http.request"
}
func safeSpanTags(tags map[string]string) map[string]string {
	clean := map[string]string{"component": "api"}
	switch tags["outcome"] {
	case "success", "error", "cancelled", "rejected":
		clean["outcome"] = tags["outcome"]
	}
	return clean
}

func safeSpanName(name string) string {
	switch name {
	case "http.server", "task", "health.check", "db.query", "db.exec", "db.batch", "db.transaction", "db.commit", "db.rollback", "db.acquire":
		return name
	}
	return safeOperation(name)
}
