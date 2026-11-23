package httpapp

import (
	"io/fs"
	"log/slog"
	"net/http"
	"net/url"
	"path"
	"strings"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	"opentoggl/backend/apps/backend/internal/platform/websession"
	"opentoggl/backend/apps/backend/internal/web"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

type ServerOptions struct {
	BrowserTelemetry webapi.BrowserSentryConfig
	Logger           *slog.Logger
	Readiness        web.ReadinessProbe
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
	server.HTTPErrorHandler = newHTTPErrorHandler(logger)
	readiness := options.Readiness
	if readiness == nil {
		readiness = web.NewStaticReadinessProbe(health.Service)
	}

	server.Use(middleware.RequestID())
	server.Use(newRequestLogMiddleware(logger))
	server.Use(newSecureHeadersMiddleware())
	server.Use(newCookieOriginMiddleware())
	server.Use(middleware.BodyLimit(16 << 20))

	healthHandler := func(c *echo.Context) error {
		return c.JSON(http.StatusOK, health)
	}
	readinessHandler := func(c *echo.Context) error {
		report := readiness.Check(c.Request().Context())
		if report.Status == web.StatusOK {
			return c.JSON(http.StatusOK, report)
		}
		logReadinessFailure(c, logger, report)
		if err := c.JSON(http.StatusServiceUnavailable, report); err != nil {
			return err
		}
		return report.Err()
	}
	server.GET("/healthz", healthHandler)
	server.GET("/readyz", readinessHandler)
	if registerRoutes != nil {
		registerRoutes(server)
	}
	if staticFiles, ok := web.StaticFiles(); ok {
		registerStaticWebRoutes(server, BrowserTelemetryFiles(staticFiles, options.BrowserTelemetry))
	}

	return server
}

func newRequestLogMiddleware(logger *slog.Logger) echo.MiddlewareFunc {
	return middleware.RequestLoggerWithConfig(middleware.RequestLoggerConfig{
		LogMethod:    true,
		LogStatus:    true,
		LogLatency:   true,
		LogRequestID: true,
		HandleError:  true,
		LogValuesFunc: func(c *echo.Context, values middleware.RequestLoggerValues) error {
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

func logReadinessFailure(c *echo.Context, logger *slog.Logger, report web.ReadinessReport) {
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

func requestIDFromContext(c *echo.Context) string {
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

// newSecureHeadersMiddleware applies static response hardening that is safe for
// both HTTP and HTTPS self-hosted deployments. HSTS is intentionally omitted
// because many self-hosted instances serve plain HTTP.
func newSecureHeadersMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			headers := c.Response().Header()
			headers.Set("X-Content-Type-Options", "nosniff")
			headers.Set("X-Frame-Options", "SAMEORIGIN")
			headers.Set("Referrer-Policy", "strict-origin-when-cross-origin")
			headers.Set("X-Permitted-Cross-Domain-Policies", "none")
			return next(c)
		}
	}
}

func newCookieOriginMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			request := c.Request()
			// SAML POST binding is cross-origin by design. The ACS independently
			// verifies its Secure browser-bound, one-time state and signed response.
			if request.Method == http.MethodPost && c.Path() == "/auth/saml2/acs/:workspace_id" {
				return next(c)
			}
			if !isMutatingMethod(request.Method) || !hasSessionCookie(request) || hasAuthorizationHeader(request) {
				return next(c)
			}

			sourceHost, ok := sourceHostFromRequest(request)
			if !ok {
				return next(c)
			}
			if !sameOriginHost(sourceHost, request.Host) {
				return echo.ErrForbidden
			}

			return next(c)
		}
	}
}

func isMutatingMethod(method string) bool {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	default:
		return false
	}
}

func hasSessionCookie(request *http.Request) bool {
	_, err := request.Cookie(websession.CookieName)
	return err == nil
}

func hasAuthorizationHeader(request *http.Request) bool {
	return strings.TrimSpace(request.Header.Get("Authorization")) != ""
}

func sourceHostFromRequest(request *http.Request) (string, bool) {
	if origin := strings.TrimSpace(request.Header.Get("Origin")); origin != "" {
		parsed, err := url.Parse(origin)
		if err != nil || parsed.Host == "" {
			return "", true
		}
		return parsed.Host, true
	}
	if referer := strings.TrimSpace(request.Header.Get("Referer")); referer != "" {
		parsed, err := url.Parse(referer)
		if err != nil || parsed.Host == "" {
			return "", true
		}
		return parsed.Host, true
	}
	return "", false
}

func sameOriginHost(sourceHost string, requestHost string) bool {
	sourceHost = strings.TrimSpace(strings.ToLower(sourceHost))
	requestHost = strings.TrimSpace(strings.ToLower(requestHost))
	return sourceHost != "" && requestHost != "" && sourceHost == requestHost
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
	return func(context *echo.Context) error {
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
func serveEmbeddedIndex(context *echo.Context, staticFiles fs.FS) error {
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
func serveEmbeddedFile(context *echo.Context, staticFiles fs.FS, filePath string) error {
	if path.Ext(filePath) == ".html" {
		policy := context.Response().Header().Get("Document-Policy")
		if !strings.Contains(policy, "js-profiling") {
			if policy != "" {
				policy += ", "
			}
			context.Response().Header().Set("Document-Policy", policy+"js-profiling")
		}
	}
	return echo.StaticFileHandler(filePath, staticFiles)(context)
}
