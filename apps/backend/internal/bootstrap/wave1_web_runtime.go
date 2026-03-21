package bootstrap

import httpapp "opentoggl/backend/apps/backend/internal/http"

func newWave1WebRoutes() (httpapp.RouteRegistrar, error) {
	handlers := httpapp.NewWave1WebHandlers()
	return httpapp.NewWave1WebRouteRegistrar(handlers), nil
}
