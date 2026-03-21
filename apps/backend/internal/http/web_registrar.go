package httpapp

import "github.com/labstack/echo/v4"

func NewWebRouteRegistrar(handlers *WebHandlers) RouteRegistrar {
	return func(server *echo.Echo) {
		registerWebRoutes(server, handlers)
	}
}
