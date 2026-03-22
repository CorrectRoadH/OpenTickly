package httpapp

import (
	"io/fs"
	"log/slog"
	"net/http"
	"path"
	"strings"

	"opentoggl/backend/apps/backend/internal/web"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

type ServerOptions struct {
	Logger    *slog.Logger
	Readiness web.ReadinessProbe
}

type RouteRegistrar func(*echo.Echo)

func ComposeRouteRegistrars(registrars ...RouteRegistrar) RouteRegistrar {
	return func(server *echo.Echo) {
		for _, registrar := range registrars {
			if registrar == nil {
				continue
			}
			registrar(server)
		}
	}
}

func NewServer(health web.HealthSnapshot, registerRoutes RouteRegistrar) *echo.Echo {
	return NewServerWithOptions(health, registerRoutes, ServerOptions{})
}

func NewServerWithOptions(
	health web.HealthSnapshot,
	registerRoutes RouteRegistrar,
	options ServerOptions,
) *echo.Echo {
	server := echo.New()
	logger := options.Logger
	if logger == nil {
		logger = slog.Default()
	}
	readiness := options.Readiness
	if readiness == nil {
		readiness = web.NewStaticReadinessProbe(health.Service)
	}

	server.Use(middleware.RequestID())
	server.Use(newRequestLogMiddleware(logger))

	healthHandler := func(c echo.Context) error {
		return c.JSON(http.StatusOK, health)
	}
	readinessHandler := func(c echo.Context) error {
		report := readiness.Check(c.Request().Context())
		statusCode := http.StatusOK
		if report.Status != web.StatusOK {
			statusCode = http.StatusServiceUnavailable
			logReadinessFailure(c, logger, report)
		}
		return c.JSON(statusCode, report)
	}
	server.GET("/healthz", healthHandler)
	server.GET("/readyz", readinessHandler)
	if registerRoutes != nil {
		registerRoutes(server)
	}
	registerStaticWebRoutes(server, web.StaticFiles())

	return server
}

func newRequestLogMiddleware(logger *slog.Logger) echo.MiddlewareFunc {
	return middleware.RequestLoggerWithConfig(middleware.RequestLoggerConfig{
		LogMethod:    true,
		LogStatus:    true,
		LogLatency:   true,
		LogRequestID: true,
		HandleError:  true,
		LogValuesFunc: func(c echo.Context, values middleware.RequestLoggerValues) error {
			correlation := requestCorrelationFromRequest(c.Request(), values.RequestID)
			requestPath := c.Request().URL.Path
			fields := []any{
				"method", values.Method,
				"path", requestPath,
				"status", values.Status,
				"duration", values.Latency.String(),
			}
			fields = append(fields, correlation.logFields()...)
			logger.Info("http request", fields...)
			return nil
		},
	})
}

func logReadinessFailure(c echo.Context, logger *slog.Logger, report web.ReadinessReport) {
	correlation := requestCorrelationFromRequest(c.Request(), requestIDFromContext(c))
	baseFields := []any{
		"service", report.Service,
		"path", c.Request().URL.Path,
		"status", report.Status,
	}
	baseFields = append(baseFields, correlation.logFields()...)

	for _, check := range report.Checks {
		if check.Status == web.StatusOK {
			continue
		}

		fields := append([]any{}, baseFields...)
		fields = append(fields,
			"check", check.Name,
			"target", check.Target,
			"message", check.Message,
		)
		logger.WarnContext(c.Request().Context(), "readiness check failed", fields...)
	}
}

type requestCorrelation struct {
	requestID   string
	traceparent string
	traceID     string
	spanID      string
}

func requestCorrelationFromRequest(request *http.Request, requestID string) requestCorrelation {
	correlation := requestCorrelation{
		requestID: strings.TrimSpace(requestID),
	}

	traceparent := strings.TrimSpace(request.Header.Get("Traceparent"))
	if traceparent == "" {
		return correlation
	}

	correlation.traceparent = traceparent
	traceID, spanID, ok := parseTraceparent(traceparent)
	if ok {
		correlation.traceID = traceID
		correlation.spanID = spanID
	}

	return correlation
}

func (correlation requestCorrelation) logFields() []any {
	fields := []any{}
	if correlation.requestID != "" {
		fields = append(fields, "request_id", correlation.requestID)
	}
	if correlation.traceparent != "" {
		fields = append(fields, "traceparent", correlation.traceparent)
	}
	if correlation.traceID != "" {
		fields = append(fields, "trace_id", correlation.traceID)
	}
	if correlation.spanID != "" {
		fields = append(fields, "span_id", correlation.spanID)
	}
	return fields
}

func requestIDFromContext(c echo.Context) string {
	if value := strings.TrimSpace(c.Response().Header().Get(echo.HeaderXRequestID)); value != "" {
		return value
	}

	if value, ok := c.Get("requestid").(string); ok {
		return strings.TrimSpace(value)
	}

	return ""
}

func parseTraceparent(header string) (traceID string, spanID string, ok bool) {
	parts := strings.Split(strings.TrimSpace(header), "-")
	if len(parts) != 4 {
		return "", "", false
	}
	if len(parts[1]) != 32 || len(parts[2]) != 16 {
		return "", "", false
	}
	if !isLowerHex(parts[1]) || !isLowerHex(parts[2]) {
		return "", "", false
	}
	if parts[1] == strings.Repeat("0", 32) || parts[2] == strings.Repeat("0", 16) {
		return "", "", false
	}

	return parts[1], parts[2], true
}

func isLowerHex(value string) bool {
	for _, character := range value {
		switch {
		case character >= '0' && character <= '9':
		case character >= 'a' && character <= 'f':
		default:
			return false
		}
	}
	return true
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
