package application

import (
	"context"
	"errors"
	"log/slog"
	"math/rand/v2"
	"sync"
	"time"

	"opentoggl/backend/apps/backend/internal/telemetry/domain"
)

// DefaultInterval is the scheduled cadence between pings. One per day balances
// freshness against noise in the Analytics Engine dataset.
const DefaultInterval = 24 * time.Hour

// DefaultMaxJitter spreads initial pings across the first hour after startup
// so fleets of simultaneously-restarted instances don't thundering-herd the
// upstream service.
const DefaultMaxJitter = time.Hour

// ErrDisabled indicates the caller asked for the pinger but the operator has
// set OPENTOGGL_TELEMETRY=off.
var ErrDisabled = errors.New("telemetry: disabled")

// Config groups the Pinger's collaborators and tunables.
type Config struct {
	Store     InstanceIDStore
	Client    ManifestClient
	BuildInfo BuildInfo
	Interval  time.Duration
	MaxJitter time.Duration
	Logger    *slog.Logger
}

// Pinger periodically fetches the update manifest from the upstream worker.
// Each fetch doubles as a DAU signal — the worker records one Analytics Engine
// data point per request with a valid instanceId + version. Safe to call
// SendOnce from handler code for on-demand checks.
type Pinger struct {
	store     InstanceIDStore
	client    ManifestClient
	buildInfo BuildInfo
	interval  time.Duration
	maxJitter time.Duration
	logger    *slog.Logger

	mu       sync.RWMutex
	manifest *domain.Manifest
}

func NewPinger(cfg Config) (*Pinger, error) {
	if cfg.Store == nil {
		return nil, errors.New("telemetry: instance id store is required")
	}
	if cfg.Client == nil {
		return nil, errors.New("telemetry: checkin client is required")
	}
	if cfg.BuildInfo == nil {
		return nil, errors.New("telemetry: build info is required")
	}
	interval := cfg.Interval
	if interval <= 0 {
		interval = DefaultInterval
	}
	jitter := cfg.MaxJitter
	if jitter == 0 {
		jitter = DefaultMaxJitter
	}
	jitter = max(jitter, 0)
	logger := cfg.Logger
	if logger == nil {
		logger = slog.Default()
	}
	return &Pinger{
		store:     cfg.Store,
		client:    cfg.Client,
		buildInfo: cfg.BuildInfo,
		interval:  interval,
		maxJitter: jitter,
		logger:    logger.With("component", "telemetry.pinger"),
	}, nil
}

// Run blocks until ctx is cancelled, sending a check-in on startup (after a
// bounded random jitter) and then once per Interval. Failures are logged at
// INFO — they never crash the process.
func (p *Pinger) Run(ctx context.Context) {
	initialDelay := p.randomJitter()
	timer := time.NewTimer(initialDelay)
	defer timer.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-timer.C:
			if _, err := p.SendOnce(ctx); err != nil && !errors.Is(err, context.Canceled) {
				p.logger.Info("telemetry check-in failed", "error", err)
			}
			timer.Reset(p.interval)
		}
	}
}

// SendOnce performs a single check-in and caches the manifest for later
// retrieval via LatestManifest. Safe to call from handlers.
func (p *Pinger) SendOnce(ctx context.Context) (domain.Manifest, error) {
	id, err := p.store.GetInstanceID(ctx)
	if err != nil {
		return domain.Manifest{}, err
	}
	payload := domain.CheckinPayload{
		InstanceID: id,
		Version:    p.buildInfo.Version(),
		GoVersion:  p.buildInfo.GoVersion(),
		OS:         p.buildInfo.OS(),
		Arch:       p.buildInfo.Arch(),
	}

	manifest, err := p.client.FetchManifest(ctx, payload)
	if err != nil {
		return domain.Manifest{}, err
	}
	p.cacheManifest(manifest)
	return manifest, nil
}

// LatestManifest returns the most recent successful manifest, or false if no
// check-in has succeeded yet this process lifetime.
func (p *Pinger) LatestManifest() (domain.Manifest, bool) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	if p.manifest == nil {
		return domain.Manifest{}, false
	}
	return *p.manifest, true
}

func (p *Pinger) cacheManifest(m domain.Manifest) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.manifest = &m
}

func (p *Pinger) randomJitter() time.Duration {
	if p.maxJitter <= 0 {
		return 0
	}
	return time.Duration(rand.Int64N(int64(p.maxJitter)))
}
