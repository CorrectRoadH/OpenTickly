package admin

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

// AdminSessionResolver resolves the current session to check admin status.
type AdminSessionResolver interface {
	// IsInstanceAdmin returns true if the session belongs to an instance admin.
	// Returns error if the session is invalid or user not found.
	IsInstanceAdmin(sessionID string) (bool, error)
}

// BootstrapStateChecker checks if bootstrap has been completed.
type BootstrapStateChecker interface {
	IsBootstrapped() (bool, error)
}

// AdminAuthConfig holds configuration for admin auth middleware.
type AdminAuthConfig struct {
	SessionCookieName    string
	SessionResolver      AdminSessionResolver
	BootstrapChecker     BootstrapStateChecker
}

// AdminAuthMiddleware protects /admin/v1/* routes.
// Bootstrap endpoints (GET/POST /admin/v1/bootstrap) are accessible without auth
// when not yet bootstrapped. All other endpoints require an instance admin session.
func AdminAuthMiddleware(cfg AdminAuthConfig) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(ctx echo.Context) error {
			path := ctx.Path()

			// Bootstrap endpoints are open when not yet bootstrapped
			if strings.HasSuffix(path, "/admin/v1/bootstrap") {
				bootstrapped, err := cfg.BootstrapChecker.IsBootstrapped()
				if err != nil {
					return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
				}
				if !bootstrapped {
					return next(ctx)
				}
				// If already bootstrapped, GET is still open (read state),
				// POST will be rejected by the handler with 409.
				if ctx.Request().Method == http.MethodGet {
					return next(ctx)
				}
			}

			// All other admin routes require instance admin session
			sessionID := extractSessionID(ctx, cfg.SessionCookieName)
			if sessionID == "" {
				return echo.NewHTTPError(http.StatusUnauthorized, "Authentication required")
			}

			isAdmin, err := cfg.SessionResolver.IsInstanceAdmin(sessionID)
			if err != nil {
				return echo.NewHTTPError(http.StatusUnauthorized, "Authentication required")
			}
			if !isAdmin {
				return echo.NewHTTPError(http.StatusForbidden, "Instance admin access required")
			}

			return next(ctx)
		}
	}
}

func extractSessionID(ctx echo.Context, cookieName string) string {
	cookie, err := ctx.Cookie(cookieName)
	if err == nil {
		return cookie.Value
	}
	raw := ctx.Request().Header.Get("Cookie")
	if raw == "" {
		return ""
	}
	for _, part := range strings.Split(raw, ";") {
		token := strings.TrimSpace(part)
		if after, ok := strings.CutPrefix(token, cookieName+"="); ok {
			return after
		}
	}
	return ""
}
