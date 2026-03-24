package application_test

import (
	"log/slog"

	"opentoggl/backend/apps/backend/internal/log"
)

var testLogger = log.NewZapLogger(slog.Default())
