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

	server.GET("/healthz", func(context echo.Context) error {
		return context.JSON(http.StatusOK, health)
	})
	registerWave1WebRoutes(server, wave1)

	return server
}
