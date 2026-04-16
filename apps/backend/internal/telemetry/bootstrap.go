package telemetry

import (
	"context"
	"fmt"
	"log/slog"

	"opentoggl/backend/apps/backend/internal/telemetry/application"
	telemetryhttp "opentoggl/backend/apps/backend/internal/telemetry/infra/http"
	"opentoggl/backend/apps/backend/internal/telemetry/infra/postgres"
	"opentoggl/backend/apps/backend/internal/telemetry/infra/runtimeinfo"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Options describes the runtime shape of the telemetry subsystem, derived
// from env vars at bootstrap time.
type Options struct {
	Enabled  bool
	Endpoint string // empty → infra/http default
	Version  string
	Logger   *slog.Logger
}

// Pinger is re-exported for consumers that just want a constructor return.
type Pinger = application.Pinger

// NewPinger wires the full telemetry pipeline against a pgx pool. Returns
// ErrDisabled if opts.Enabled is false — callers should check for that and
// skip scheduling.
func NewPinger(pool *pgxpool.Pool, opts Options) (*Pinger, error) {
	if !opts.Enabled {
		return nil, application.ErrDisabled
	}
	if pool == nil {
		return nil, fmt.Errorf("telemetry: pg pool is required")
	}

	client, err := telemetryhttp.NewClient(telemetryhttp.Config{Endpoint: opts.Endpoint})
	if err != nil {
		return nil, err
	}

	return application.NewPinger(application.Config{
		Store:     postgres.NewStore(pool),
		Client:    client,
		BuildInfo: runtimeinfo.NewStatic(opts.Version),
		Logger:    opts.Logger,
	})
}

// StartWorker kicks off the pinger's Run loop in a goroutine tied to ctx.
func StartWorker(ctx context.Context, p *Pinger) {
	go p.Run(ctx)
}
