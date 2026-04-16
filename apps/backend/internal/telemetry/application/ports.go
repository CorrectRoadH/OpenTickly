package application

import (
	"context"

	"opentoggl/backend/apps/backend/internal/telemetry/domain"
)

// InstanceIDStore reads the singleton instance identity. The row is seeded by
// the 00008 migration; callers should treat ErrNotSeeded as a startup bug.
type InstanceIDStore interface {
	GetInstanceID(ctx context.Context) (domain.InstanceID, error)
}

// CheckinClient posts to the upstream /v1/check endpoint and decodes the
// manifest reply. Implementations must be network-bounded and must not
// block longer than their configured timeout.
type CheckinClient interface {
	PostCheckin(ctx context.Context, payload domain.CheckinPayload) (domain.Manifest, error)
}

// BuildInfo exposes the compiled-in version and runtime tuple so the pinger
// can describe the current binary without touching globals at call time.
type BuildInfo interface {
	Version() string
	GoVersion() string
	OS() string
	Arch() string
}
