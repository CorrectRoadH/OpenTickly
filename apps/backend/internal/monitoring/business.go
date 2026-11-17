package monitoring

import (
	"context"
	"database/sql"
	"errors"
	"github.com/getsentry/sentry-go"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type Operation string
type operationStateKey struct{}
type operationState struct{ rejected atomic.Bool }

func RejectOperation(ctx context.Context) {
	if state, ok := ctx.Value(operationStateKey{}).(*operationState); ok {
		state.rejected.Store(true)
	}
}

const UpdateCheck Operation = "update.check"

var businessNames = map[string]bool{
	"auth.login": true, "auth.logout": true, "auth.sso.resolve": true,
	"timer.start": true, "timer.stop": true, "time_entry.list": true, "time_entry.create": true,
	"time_entry.update": true, "time_entry.delete": true, "project.list": true, "project.save": true,
	"client.list": true, "client.save": true, "report.load": true, "report.export": true,
	"import.run": true, "webhook.handle": true, string(UpdateCheck): true,
}

func safeOperation(value string) string {
	if businessNames[value] {
		return value
	}
	return "http.request"
}

var tracePattern = regexp.MustCompile(`^([a-f0-9]{32})-([a-f0-9]{16})-([01])$`)

func incomingTrace(value string) string {
	match := tracePattern.FindStringSubmatch(value)
	if match == nil || match[1] == strings.Repeat("0", 32) || match[2] == strings.Repeat("0", 16) {
		return ""
	}
	return value
}
func BackgroundContext(ctx context.Context, client *sentry.Client) context.Context {
	if client == nil {
		return ctx
	}
	return sentry.SetHubOnContext(ctx, sentry.NewHub(client, sentry.NewScope()))
}
func StartBusiness(ctx context.Context, operation Operation) (*sentry.Span, func(error)) {
	hub := sentry.GetHubFromContext(ctx)
	if hub == nil || hub.Client() == nil {
		return nil, func(error) {}
	}
	top := ctx.Value(operationDepth{}) == nil
	state := &operationState{}
	ctx = context.WithValue(ctx, operationStateKey{}, state)
	ctx = context.WithValue(ctx, operationDepth{}, true)
	started := time.Now()
	var once sync.Once
	var span *sentry.Span
	if sentry.SpanFromContext(ctx) == nil {
		// A separate hub per invocation prevents concurrent background checks sharing scope.
		ctx = sentry.SetHubOnContext(ctx, sentry.NewHub(hub.Client(), sentry.NewScope()))
		span = sentry.StartTransaction(ctx, safeOperation(string(operation)), sentry.WithOpName("task"))
	} else {
		span = sentry.StartSpan(ctx, "ui.action", sentry.WithDescription(safeOperation(string(operation))))
	}
	return span, func(err error) {
		once.Do(func() {
			outcome := "success"
			var rejected rejectedError
			switch {
			case errors.Is(err, context.Canceled):
				span.Status = sentry.SpanStatusCanceled
				outcome = "cancelled"
			case state.rejected.Load() || errors.As(err, &rejected) || errors.Is(err, sql.ErrNoRows):
				span.Status = sentry.SpanStatusInvalidArgument
				outcome = "rejected"
			case err != nil:
				span.Status = sentry.SpanStatusInternalError
				outcome = "error"
			default:
				span.Status = sentry.SpanStatusOK

			}
			span.SetTag("outcome", outcome)
			recordOperation(span.Context(), operation, outcome, started, top)
			span.Finish()
		})
	}
}
func SafeBaggage(span *sentry.Span) string {
	dsc := sentry.DynamicSamplingContextFromTransaction(span)
	delete(dsc.Entries, "transaction")
	delete(dsc.Entries, "org_id")
	return dsc.String()
}

func FinishBusiness(finish func(error), err *error, rejected ...error) {
	if recovered := recover(); recovered != nil {
		finish(errors.New("application panic"))
		panic(recovered)
	}
	for _, candidate := range rejected {
		if errors.Is(*err, candidate) {
			finish(rejectedError{*err})
			return
		}
	}
	finish(*err)
}
