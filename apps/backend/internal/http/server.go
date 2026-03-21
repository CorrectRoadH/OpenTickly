package httpapp

import (
	"io/fs"
	"net/http"
	"path"
	"strings"

	"opentoggl/backend/apps/backend/internal/web"

	"github.com/labstack/echo/v4"
)

func NewServer(health web.HealthSnapshot, wave1 *Wave1WebHandlers) *echo.Echo {
	server := echo.New()

	healthHandler := func(context echo.Context) error {
		return context.JSON(http.StatusOK, health)
	}
	server.GET("/healthz", healthHandler)
	server.GET("/readyz", healthHandler)
	registerWave1WebRoutes(server, wave1)
	registerStaticWebRoutes(server, web.StaticFiles())

	return server
}

/*
registerStaticWebRoutes serves embedded frontend files after explicit backend
routes miss, while keeping reserved API paths out of the SPA fallback.
*/
func registerStaticWebRoutes(server *echo.Echo, staticFiles fs.FS) {
	handler := newStaticFallbackHandler(staticFiles)
	server.RouteNotFound("/", handler)
	server.RouteNotFound("/*", handler)
}

/*
newStaticFallbackHandler serves embedded files when they exist and otherwise
returns the SPA shell for client-side routes.
*/
func newStaticFallbackHandler(staticFiles fs.FS) echo.HandlerFunc {
	return func(context echo.Context) error {
		request := context.Request()
		if request.Method != http.MethodGet && request.Method != http.MethodHead {
			return echo.ErrNotFound
		}

		requestPath := request.URL.Path
		if isReservedBackendPath(requestPath) {
			return echo.ErrNotFound
		}

		staticPath := normalizeStaticPath(requestPath)
		if staticPath == "" {
			return serveEmbeddedIndex(context, staticFiles)
		}

		if staticFileExists(staticFiles, staticPath) {
			return serveEmbeddedFile(context, staticFiles, staticPath)
		}

		if path.Ext(staticPath) != "" {
			return echo.ErrNotFound
		}

		return serveEmbeddedIndex(context, staticFiles)
	}
}

/*
serveEmbeddedIndex returns the embedded SPA shell and disables caching so the
 browser always revalidates the HTML entrypoint.
*/
func serveEmbeddedIndex(context echo.Context, staticFiles fs.FS) error {
	context.Response().Header().Set("Cache-Control", "no-cache")
	return serveEmbeddedFile(context, staticFiles, "index.html")
}

/*
isReservedBackendPath blocks the frontend fallback from intercepting backend
health and API routes.
*/
func isReservedBackendPath(requestPath string) bool {
	return requestPath == "/web/v1" ||
		strings.HasPrefix(requestPath, "/web/v1/") ||
		requestPath == "/healthz" ||
		requestPath == "/readyz"
}

/*
normalizeStaticPath converts a request URL path into a safe relative path
inside the embedded dist filesystem.
*/
func normalizeStaticPath(requestPath string) string {
	cleanPath := path.Clean("/" + requestPath)
	if cleanPath == "/" || cleanPath == "." {
		return ""
	}
	return strings.TrimPrefix(cleanPath, "/")
}

/*
staticFileExists checks whether an embedded file path is present before the
handler decides between direct file serving and SPA fallback.
*/
func staticFileExists(staticFiles fs.FS, filePath string) bool {
	_, err := fs.Stat(staticFiles, filePath)
	return err == nil
}

/*
serveEmbeddedFile delegates file responses to Echo's fs.FS-aware static handler
so embedded assets can be returned without relying on unsupported Context APIs.
*/
func serveEmbeddedFile(context echo.Context, staticFiles fs.FS, filePath string) error {
	return echo.StaticFileHandler(filePath, staticFiles)(context)
}
