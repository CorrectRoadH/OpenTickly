package admin

import (
	"context"
	"net/http"
	"strings"

	"opentoggl/backend/apps/backend/internal/http/httperror"

	"github.com/labstack/echo/v5"
)

// AdminSessionResolver resolves the current session to check admin status.
type AdminSessionResolver interface {
	// IsInstanceAdmin returns true if the session belongs to an instance admin.
	// Returns error if the session is invalid or user not found.
	IsInstanceAdmin(requestCtx context.Context, sessionID string) (bool, error)
}

// BootstrapStateChecker checks if bootstrap has been completed.
type BootstrapStateChecker interface {
	IsBootstrapped(requestCtx context.Context) (bool, error)
}

// AdminAuthConfig holds configuration for admin auth middleware.
type AdminAuthConfig struct {
	SessionCookieName string
	SessionResolver   AdminSessionResolver
	BootstrapChecker  BootstrapStateChecker
}

// AdminAuthMiddleware protects /admin/v1/* routes.
// Bootstrap endpoints (GET/POST /admin/v1/bootstrap) are accessible without auth
// when not yet bootstrapped. All other endpoints require an instance admin session.
func AdminAuthMiddleware(cfg AdminAuthConfig) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(ctx *echo.Context) error {
			path := ctx.Path()

			// Bootstrap endpoints are open when not yet bootstrapped
			if strings.HasSuffix(path, "/admin/v1/bootstrap") {
				bootstrapped, err := cfg.BootstrapChecker.IsBootstrapped(ctx.Request().Context())
				if err != nil {
					return httperror.New(http.StatusInternalServerError, "Internal Server Error").WithCause(err)
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
				return httperror.New(http.StatusUnauthorized, "Authentication required")
			}

			isAdmin, err := cfg.SessionResolver.IsInstanceAdmin(ctx.Request().Context(), sessionID)
			if err != nil {
				return httperror.New(http.StatusUnauthorized, "Authentication required").WithCause(err)
			}
			if !isAdmin {
				return httperror.New(http.StatusForbidden, "Instance admin access required").WithCause(err)
			}

			return next(ctx)
		}
	}
}

func extractSessionID(ctx *echo.Context, cookieName string) string {
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
