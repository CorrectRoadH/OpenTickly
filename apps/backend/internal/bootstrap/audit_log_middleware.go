package bootstrap

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"strconv"
	"strings"

	governanceapplication "opentoggl/backend/apps/backend/internal/governance/application"
	application "opentoggl/backend/apps/backend/internal/identity/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

const auditLogMaxBodySize = 8192

func newAuditLogMiddleware(handlers *routeHandlers) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(ctx echo.Context) error {
			req := ctx.Request()

			// Only log mutating requests
			if req.Method == http.MethodGet || req.Method == http.MethodHead || req.Method == http.MethodOptions {
				return next(ctx)
			}

			// Capture request body
			var requestBody string
			if req.Body != nil {
				bodyBytes, err := io.ReadAll(io.LimitReader(req.Body, auditLogMaxBodySize))
				if err == nil {
					requestBody = string(bodyBytes)
					req.Body = io.NopCloser(bytes.NewReader(bodyBytes))
				}
			}

			// Wrap response writer to capture response body
			recorder := &responseRecorder{
				ResponseWriter: ctx.Response().Writer,
				body:           &bytes.Buffer{},
				maxSize:        auditLogMaxBodySize,
			}
			ctx.Response().Writer = recorder

			// Execute handler
			handlerErr := next(ctx)

			// Gather audit data synchronously before goroutine.
			// Try publicTrackUserContextKey first (set by /api/v9 auth),
			// then fall back to resolving from session cookie (for /web/v1 routes).
			user, _ := ctx.Get(publicTrackUserContextKey).(*application.UserSnapshot)
			if user == nil {
				if sid := sessionID(ctx); sid != "" {
					if resolved, err := handlers.identityApp.ResolveCurrentUser(ctx.Request().Context(), sid); err == nil {
						user = &resolved
					}
				}
			}
			if user != nil {
				source := resolveSource(ctx)
				action := req.Method + " " + req.URL.Path
				entityType, entityID := resolveEntity(req.URL.Path)
				orgID, wsID := resolveOrgWorkspace(ctx, handlers, user)
				responseBody := recorder.body.String()

				if orgID > 0 {
					command := governanceapplication.InsertAuditLogCommand{
						OrganizationID: orgID,
						WorkspaceID:    wsID,
						EntityType:     entityType,
						EntityID:       entityID,
						Action:         action,
						UserID:         lo.ToPtr(user.ID),
						Source:         source,
						RequestBody:    requestBody,
						ResponseBody:   responseBody,
					}
					go func() {
						_ = handlers.governanceApp.InsertAuditLog(context.Background(), command)
					}()
				}
			}

			return handlerErr
		}
	}
}

func resolveSource(ctx echo.Context) string {
	_, _, hasBasicAuth := ctx.Request().BasicAuth()
	if hasBasicAuth {
		return "api"
	}
	if sessionID(ctx) != "" {
		return "web"
	}
	return "unknown"
}

func resolveEntity(path string) (entityType string, entityID *int64) {
	// Parse paths like /api/v9/workspaces/123/time_entries/456 or /web/v1/workspaces/123/members/invitations
	trimmed := path
	for _, prefix := range []string{"/api/v9/", "/web/v1/"} {
		trimmed = strings.TrimPrefix(trimmed, prefix)
	}
	parts := strings.Split(trimmed, "/")
	if len(parts) < 2 {
		return "", nil
	}

	// Find the last resource/id pair
	for i := len(parts) - 1; i >= 1; i-- {
		if id, err := strconv.ParseInt(parts[i], 10, 64); err == nil && i > 0 {
			return parts[i-1], lo.ToPtr(id)
		}
	}

	// No numeric ID found — use the last path segment as entity type
	last := parts[len(parts)-1]
	if _, err := strconv.ParseInt(last, 10, 64); err != nil {
		return last, nil
	}
	return "", nil
}

func resolveOrgWorkspace(ctx echo.Context, handlers *routeHandlers, user *application.UserSnapshot) (orgID int64, wsID *int64) {
	// Try workspace_id from path
	if wsParam := ctx.Param("workspace_id"); wsParam != "" {
		if id, err := strconv.ParseInt(wsParam, 10, 64); err == nil {
			wsID = lo.ToPtr(id)
		}
	}

	// Try organization_id from path
	if orgParam := ctx.Param("organization_id"); orgParam != "" {
		if id, err := strconv.ParseInt(orgParam, 10, 64); err == nil {
			return id, wsID
		}
	}

	// Fall back to user's home org/workspace
	homeOrgID, homeWsID, found, err := handlers.userHomes.FindByUserID(ctx.Request().Context(), user.ID)
	if err != nil || !found {
		return 0, nil
	}
	if wsID == nil {
		wsID = lo.ToPtr(homeWsID)
	}
	return homeOrgID, wsID
}

type responseRecorder struct {
	http.ResponseWriter
	body    *bytes.Buffer
	maxSize int
}

func (r *responseRecorder) Write(b []byte) (int, error) {
	if r.body.Len() < r.maxSize {
		remaining := r.maxSize - r.body.Len()
		if len(b) > remaining {
			r.body.Write(b[:remaining])
		} else {
			r.body.Write(b)
		}
	}
	return r.ResponseWriter.Write(b)
}
