package httpapp

import (
	adminapi "opentoggl/backend/apps/backend/internal/http/generated/admin"

	"github.com/labstack/echo/v4"
)

func NewGeneratedAdminRouteRegistrar(handler adminapi.ServerInterface) (RouteRegistrar, error) {
	return func(server *echo.Echo) {
		group := server.Group("")
		adminapi.RegisterHandlers(group, handler)
	}, nil
}

func NewGeneratedAdminRouteRegistrarWithMiddleware(handler adminapi.ServerInterface, middleware echo.MiddlewareFunc) (RouteRegistrar, error) {
	return func(server *echo.Echo) {
		group := server.Group("", middleware)
		adminapi.RegisterHandlers(group, handler)
	}, nil
}
