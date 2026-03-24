package log

import (
	"context"
	"log/slog"
)

type zapLogger struct {
	logger *slog.Logger
}

func NewZapLogger(logger *slog.Logger) Logger {
	return &zapLogger{logger: logger}
}

func (z *zapLogger) DebugContext(ctx context.Context, msg string, fields ...any) {
	z.logger.Log(ctx, slog.LevelDebug, msg, fields...)
}

func (z *zapLogger) InfoContext(ctx context.Context, msg string, fields ...any) {
	z.logger.Log(ctx, slog.LevelInfo, msg, fields...)
}

func (z *zapLogger) WarnContext(ctx context.Context, msg string, fields ...any) {
	z.logger.Log(ctx, slog.LevelWarn, msg, fields...)
}

func (z *zapLogger) ErrorContext(ctx context.Context, msg string, fields ...any) {
	z.logger.Log(ctx, slog.LevelError, msg, fields...)
}
