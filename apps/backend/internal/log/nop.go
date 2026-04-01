package log

import "context"

type nopLogger struct{}

// NopLogger returns a Logger that discards all log output.
// Use for optional logger fields where no logger is configured.
func NopLogger() Logger {
	return &nopLogger{}
}

func (*nopLogger) DebugContext(_ context.Context, _ string, _ ...any) {}
func (*nopLogger) InfoContext(_ context.Context, _ string, _ ...any)  {}
func (*nopLogger) WarnContext(_ context.Context, _ string, _ ...any)  {}
func (*nopLogger) ErrorContext(_ context.Context, _ string, _ ...any) {}
