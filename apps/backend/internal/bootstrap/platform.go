package bootstrap

import "opentoggl/backend/apps/backend/internal/platform"

func newPlatformServices(cfg Config) *platform.Runtime {
	return platform.NewRuntime(cfg)
}
