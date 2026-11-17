package monitoring

import (
	"context"
	"errors"
	"github.com/getsentry/sentry-go"
	"github.com/jackc/pgx/v5"
)

// QueryTracer measures the driver's execution boundary, including Rows close.
// SQL, arguments, connection metadata and results never enter span data.
type QueryTracer struct{}
type querySpanKey struct{}

func startQuery(ctx context.Context, name string) context.Context {
	if sentry.SpanFromContext(ctx) == nil {
		return ctx
	}
	hub := sentry.GetHubFromContext(ctx)
	if hub == nil || hub.Client() == nil {
		return ctx
	}
	span := sentry.StartSpan(ctx, "db.query", sentry.WithDescription(name))
	return context.WithValue(span.Context(), querySpanKey{}, span)
}
func endQuery(ctx context.Context, err error) {
	span, _ := ctx.Value(querySpanKey{}).(*sentry.Span)
	if span == nil {
		return
	}
	switch {
	case errors.Is(err, context.Canceled), errors.Is(err, context.DeadlineExceeded):
		span.Status = sentry.SpanStatusCanceled
	case err != nil:
		span.Status = sentry.SpanStatusInternalError
	default:
		span.Status = sentry.SpanStatusOK
	}
	span.Finish()
}
func (QueryTracer) TraceQueryStart(ctx context.Context, _ *pgx.Conn, _ pgx.TraceQueryStartData) context.Context {
	return startQuery(ctx, "db.query")
}
func (QueryTracer) TraceQueryEnd(ctx context.Context, _ *pgx.Conn, data pgx.TraceQueryEndData) {
	endQuery(ctx, data.Err)
}
func (QueryTracer) TraceBatchStart(ctx context.Context, _ *pgx.Conn, _ pgx.TraceBatchStartData) context.Context {
	return startQuery(ctx, "db.batch")
}
func (QueryTracer) TraceBatchQuery(context.Context, *pgx.Conn, pgx.TraceBatchQueryData) {}
func (QueryTracer) TraceBatchEnd(ctx context.Context, _ *pgx.Conn, data pgx.TraceBatchEndData) {
	endQuery(ctx, data.Err)
}
