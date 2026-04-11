package bootstrap

import (
	"errors"
	"net/http"

	httpapp "opentoggl/backend/apps/backend/internal/http"
	"opentoggl/backend/apps/backend/internal/platform/filestore"

	"github.com/labstack/echo/v4"
)

func newFileRoutes(handlers *routeHandlers) httpapp.RouteRegistrar {
	return func(server *echo.Echo) {
		server.GET("/files/*", serveFileBlob(handlers.fileStore))
	}
}

func serveFileBlob(files *filestore.Store) echo.HandlerFunc {
	return func(ctx echo.Context) error {
		storageKey := ctx.Param("*")
		if storageKey == "" {
			return ctx.NoContent(http.StatusNotFound)
		}

		contentType, content, err := files.Get(ctx.Request().Context(), storageKey)
		if errors.Is(err, filestore.ErrNotFound) {
			return ctx.NoContent(http.StatusNotFound)
		}
		if err != nil {
			return ctx.NoContent(http.StatusInternalServerError)
		}

		ctx.Response().Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		return ctx.Blob(http.StatusOK, contentType, content)
	}
}
