package bootstrap

import httpapp "opentoggl/backend/apps/backend/internal/http"

func newWebRoutes() (httpapp.RouteRegistrar, error) {
	handlers := httpapp.NewWebHandlers()
	return httpapp.NewWebRouteRegistrar(handlers), nil
}
