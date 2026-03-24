package bootstrap

import (
	httpapp "opentoggl/backend/apps/backend/internal/http"
)

func newImportRoutes(handlers *routeHandlers) (httpapp.RouteRegistrar, error) {
	return httpapp.NewGeneratedImportRouteRegistrar(newImportOpenAPIServer(handlers))
}
