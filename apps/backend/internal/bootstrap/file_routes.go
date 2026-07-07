package bootstrap

import (
	"errors"
	"net/http"

	filespostgres "opentoggl/backend/apps/backend/internal/files/infra/postgres"
	httpapp "opentoggl/backend/apps/backend/internal/http"

	"github.com/labstack/echo/v4"
)

func newFileRoutes(handlers *routeHandlers) httpapp.RouteRegistrar {
	return func(server *echo.Echo) {
		server.GET("/files/*", serveFileBlob(handlers.fileStore))
	}
}

func serveFileBlob(files *filespostgres.Store) echo.HandlerFunc {
	return func(ctx echo.Context) error {
		storageKey := ctx.Param("*")
		if storageKey == "" {
			return ctx.NoContent(http.StatusNotFound)
		}

		contentType, content, err := files.Get(ctx.Request().Context(), storageKey)
		if errors.Is(err, filespostgres.ErrNotFound) {
			return ctx.NoContent(http.StatusNotFound)
		}
		if err != nil {
			return ctx.NoContent(http.StatusInternalServerError)
		}

		// Even though uploads now sniff and pin content-type, the filestore may
		// still hold blobs from before that hardening. Refusing to sniff on
		// the way out (nosniff) + forcing inline disposition prevents any
		// remaining image/svg+xml or text/html blob from rendering as active
		// content in the browser. The cleanup migration neutralises the
		// stored content_type for historical rows, so in practice those blobs
		// download as application/octet-stream.
		ctx.Response().Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		ctx.Response().Header().Set("X-Content-Type-Options", "nosniff")
		ctx.Response().Header().Set("Content-Disposition", "inline")
		return ctx.Blob(http.StatusOK, contentType, content)
	}
}
