package monitoring

import (
	"context"
	"errors"
	"github.com/getsentry/sentry-go"
	"github.com/getsentry/sentry-go/attribute"
	"time"
)

type operationDepth struct{}
type rejectedError struct{ error }

func recordOperation(ctx context.Context, operation Operation, outcome string, started time.Time, top bool) {
	if hub := sentry.GetHubFromContext(ctx); hub == nil || hub.Client() == nil {
		return
	}
	attrs := []attribute.Builder{attribute.String("operation", string(operation)), attribute.String("outcome", outcome)}
	if top {
		meter := sentry.NewMeter(ctx)
		meter.Count("app.operation.count", 1, sentry.WithAttributes(attrs...))
		meter.Distribution("app.operation.duration", float64(time.Since(started).Microseconds())/1000, sentry.WithUnit(sentry.UnitMillisecond), sentry.WithAttributes(attrs...))
	}
	if outcome == "error" {
		sentry.NewLogger(ctx).Error().String("operation", string(operation)).String("outcome", outcome).Emit("operation.failed")
	}
}
func SchedulerTick(ctx context.Context, scheduler string) func(error) {
	started := time.Now()
	return func(err error) {
		if hub := sentry.GetHubFromContext(ctx); hub == nil || hub.Client() == nil {
			return
		}
		switch scheduler {
		case "audit_cleanup", "update_check":
		default:
			return
		}
		outcome := "success"
		if errors.Is(err, context.Canceled) {
			outcome = "cancelled"
		} else if err != nil {
			outcome = "error"
		}
		meter := sentry.NewMeter(ctx)
		attrs := sentry.WithAttributes(attribute.String("scheduler", scheduler), attribute.String("outcome", outcome))
		meter.Count("app.scheduler.tick", 1, attrs)
		meter.Distribution("app.scheduler.duration", float64(time.Since(started).Microseconds())/1000, attrs, sentry.WithUnit(sentry.UnitMillisecond))
		if outcome == "error" && scheduler != "update_check" {
			sentry.NewLogger(ctx).Error().String("outcome", outcome).Emit("operation.failed")
		}
	}
}
func ServiceLog(ctx context.Context, message string) {
	if hub := sentry.GetHubFromContext(ctx); hub == nil || hub.Client() == nil {
		return
	}
	if message == "service.started" || message == "service.stopped" {
		sentry.NewLogger(ctx).Info().Emit(message)
	}
}

func TraceScheduler(ctx context.Context, scheduler string, callback func(context.Context) error) (resultErr error) {
	hub := sentry.GetHubFromContext(ctx)
	if hub == nil || hub.Client() == nil {
		return callback(ctx)
	}
	ctx = BackgroundContext(ctx, hub.Client())
	span := sentry.StartTransaction(ctx, "task", sentry.WithOpName("task"))
	finish := SchedulerTick(span.Context(), scheduler)
	defer func() {
		if recovered := recover(); recovered != nil {
			finish(errors.New("scheduler panic"))
			span.Status = sentry.SpanStatusInternalError
			span.Finish()
			panic(recovered)
		}
		finish(resultErr)
		if errors.Is(resultErr, context.Canceled) {
			span.Status = sentry.SpanStatusCanceled
		} else if resultErr != nil {
			span.Status = sentry.SpanStatusInternalError
		} else {
			span.Status = sentry.SpanStatusOK
		}
		span.Finish()
	}()
	return callback(span.Context())
}
func Degraded(ctx context.Context, operation Operation) {
	if hub := sentry.GetHubFromContext(ctx); hub == nil || hub.Client() == nil {
		return
	}
	sentry.NewLogger(ctx).Warn().String("operation", safeOperation(string(operation))).Emit("operation.degraded")
}
