package bootstrap

import "opentoggl/backend/apps/backend/internal/platform"

func newPlatformServices(cfg Config) *platform.Handles {
	return platform.NewHandles(cfg)
}
