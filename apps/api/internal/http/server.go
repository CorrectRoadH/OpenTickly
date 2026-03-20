package httpapp

import (
	"net/http"

	"opentoggl/backend/apps/api/internal/web"

	"github.com/labstack/echo/v4"
)

func NewServer(health web.HealthSnapshot, wave1 *Wave1WebHandlers) *echo.Echo {
	server := echo.New()
	server.HideBanner = true
	server.HidePort = true

	healthHandler := func(context echo.Context) error {
		return context.JSON(http.StatusOK, health)
	}
	server.GET("/healthz", healthHandler)
	server.GET("/readyz", healthHandler)
	registerWave1WebRoutes(server, wave1)

	return server
}
