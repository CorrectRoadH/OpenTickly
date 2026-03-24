package httpapp

import (
	importapi "opentoggl/backend/apps/backend/internal/http/generated/import"

	"github.com/labstack/echo/v4"
)

func NewGeneratedImportRouteRegistrar(handler importapi.ServerInterface) (RouteRegistrar, error) {
	return func(server *echo.Echo) {
		group := server.Group("")
		importapi.RegisterHandlers(group, handler)
	}, nil
}
