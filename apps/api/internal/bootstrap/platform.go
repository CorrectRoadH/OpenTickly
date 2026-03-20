package bootstrap

import "opentoggl/backend/internal/platform"

func newPlatformServices(cfg Config) *platform.Runtime {
	return platform.NewRuntime(cfg)
}
