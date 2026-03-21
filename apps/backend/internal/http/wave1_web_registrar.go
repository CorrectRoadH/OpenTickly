package httpapp

import "github.com/labstack/echo/v4"

func NewWave1WebRouteRegistrar(handlers *Wave1WebHandlers) RouteRegistrar {
	return func(server *echo.Echo) {
		registerWave1WebRoutes(server, handlers)
	}
}
