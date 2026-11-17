package monitoring

import (
	"github.com/getsentry/sentry-go"
	"net/url"
	"strings"
)

func sanitize(event *sentry.Event, environment, release string) *sentry.Event {
	clean := &sentry.Event{Message: "Application error", EventID: event.EventID, Timestamp: event.Timestamp, Level: event.Level, Platform: event.Platform, Type: event.Type, StartTime: event.StartTime, Release: label(release), Environment: label(environment), Tags: safeSpanTags(event.Tags)}
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
	for _, exception := range event.Exception {
		kind := "Error"
		switch exception.Type {
		case "*errors.errorString", "*fmt.wrapError", "*fmt.wrapErrors", "*echo.HTTPError", "*pgconn.PgError", "*net.OpError", "*url.Error", "runtime.errorString", "*runtime.TypeAssertionError":
			kind = exception.Type
		}
		value := sentry.Exception{Type: kind, Value: "Application error"}
		if source := exception.Mechanism; source != nil {
			kind := "generic"
			if source.Type == "panic" || source.Type == "chained" || source.Type == "auto.http.echo" {
				kind = source.Type
			}
			value.Mechanism = &sentry.Mechanism{Type: kind, Handled: source.Handled, IsExceptionGroup: source.IsExceptionGroup, ExceptionID: source.ExceptionID, ParentID: source.ParentID}
		}
		if exception.Stacktrace != nil {
			value.Stacktrace = &sentry.Stacktrace{}
			for _, frame := range exception.Stacktrace.Frames {
				filename := frame.Filename
				if u, err := url.Parse(filename); err == nil {
					u.RawQuery = ""
					u.Fragment = ""
					u.User = nil
					filename = u.String()
				} else {
					filename = strings.Split(strings.Split(filename, "?")[0], "#")[0]
				}
				value.Stacktrace.Frames = append(value.Stacktrace.Frames, sentry.Frame{Function: frame.Function, Module: frame.Module, Filename: filename, Lineno: frame.Lineno, Colno: frame.Colno, InApp: frame.InApp})
			}
		}
		clean.Exception = append(clean.Exception, value)
	}
	if event.Type == "transaction" {
		clean.Transaction = safeOperation(event.Transaction)
		if event.Transaction == "http.server" || event.Transaction == "task" {
			clean.Transaction = event.Transaction
		}
		clean.TransactionInfo = &sentry.TransactionInfo{Source: sentry.SourceCustom}
	}
	for _, span := range event.Spans {
		clean.Spans = append(clean.Spans, &sentry.Span{TraceID: span.TraceID, SpanID: span.SpanID, ParentSpanID: span.ParentSpanID, Op: safeSpanOp(span.Op), Description: safeOperation(span.Description), StartTime: span.StartTime, EndTime: span.EndTime, Status: span.Status, Tags: safeSpanTags(span.Tags)})
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
