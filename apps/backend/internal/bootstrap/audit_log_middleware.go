package bootstrap

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	governanceapplication "opentoggl/backend/apps/backend/internal/governance/application"
	governancepostgres "opentoggl/backend/apps/backend/internal/governance/infra/postgres"
	application "opentoggl/backend/apps/backend/internal/identity/application"
	"opentoggl/backend/apps/backend/internal/platform"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

const auditLogMaxBodySize = governanceapplication.AuditPayloadMaxSize

func newAuditLogMiddleware(handlers *routeHandlers) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(ctx echo.Context) error {
			req := ctx.Request()

			// Only log mutating requests
			if req.Method == http.MethodGet || req.Method == http.MethodHead || req.Method == http.MethodOptions {
				return next(ctx)
			}

			// Bound audit capture without consuming the handler's request stream.
			var requestBody string
			if req.Body != nil && !isMultipartUploadPath(req.URL.Path) {
				original := req.Body
				prefix, err := io.ReadAll(io.LimitReader(original, auditLogMaxBodySize+1))
				req.Body = struct {
					io.Reader
					io.Closer
				}{io.MultiReader(bytes.NewReader(prefix), original), original}
				if err != nil {
					return echo.NewHTTPError(http.StatusBadRequest, "Unable to read request body")
				}
				requestBody = governanceapplication.SanitizeAuditPayload(prefix)
			}

			// Resolve membership before reading any entity; IDs alone are not authority.
			user := auditUser(ctx, handlers)
			var metadata string
			if user != nil && (req.Method == http.MethodPut || req.Method == http.MethodPatch) {
				_, workspaceID := resolveOrgWorkspace(ctx, handlers, user)
				if workspaceID != nil {
					metadata = snapshotPreviousEntity(req.Context(), handlers.pool, req.URL.Path, *workspaceID, user.ID)
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

			if user == nil {
				user = auditUser(ctx, handlers)
			}
			if user != nil {
				source := resolveSource(ctx)
				action := req.Method + " " + req.URL.Path
				entityType, entityID := resolveEntity(req.URL.Path)
				orgID, wsID := resolveOrgWorkspace(ctx, handlers, user)
				responseBody := governanceapplication.SanitizeAuditPayload(recorder.body.Bytes())
				if recorder.overflow {
					responseBody = ""
				}
				if handlerErr != nil || ctx.Response().Status >= http.StatusBadRequest {
					requestBody, responseBody, metadata = "", "", ""
				}
				if governanceapplication.SensitiveAuditPath(req.URL.Path) {
					requestBody, responseBody, metadata = "", "", ""
				}

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
						Metadata:       metadata,
					}
					job := platform.Job{
						Name:    governancepostgres.AuditLogJobName,
						Payload: command,
					}
					// Finish the audit write within a bounded lifecycle, including on disconnect.
					auditCtx, cancel := context.WithTimeout(context.WithoutCancel(req.Context()), 2*time.Second)
					if err := handlers.platformHandles.Jobs.RunOnce(auditCtx, job); err != nil {
						ctx.Logger().Error("audit log persistence failed")
					}
					cancel()
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
	if raw := ctx.Param("workspace_id"); raw != "" {
		id, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			return 0, nil
		}
		workspaces, err := handlers.tenantApp.ListWorkspacesByUserID(ctx.Request().Context(), user.ID)
		if err != nil {
			return 0, nil
		}
		for _, workspace := range workspaces {
			if int64(workspace.ID) == id {
				return int64(workspace.OrganizationID), lo.ToPtr(id)
			}
		}
		return 0, nil
	}
	if raw := ctx.Param("organization_id"); raw != "" {
		id, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			return 0, nil
		}
		organizations, err := handlers.tenantApp.ListOrganizationsByUserID(ctx.Request().Context(), user.ID)
		if err != nil {
			return 0, nil
		}
		for _, organization := range organizations {
			if int64(organization.ID) == id {
				return id, nil
			}
		}
		return 0, nil
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

// entityTableMap maps entity type path segments to their database table names.
var entityTableMap = map[string]string{
	"time_entries": "tracking_time_entries",
	"projects":     "catalog_projects",
	"clients":      "catalog_clients",
	"tags":         "catalog_tags",
	"tasks":        "catalog_tasks",
}

// snapshotPreviousEntity fetches the current DB row as JSON before a PUT/PATCH modifies it.
func snapshotPreviousEntity(ctx context.Context, pool *pgxpool.Pool, path string, workspaceID, userID int64) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 6 || parts[2] != "workspaces" || parts[3] != strconv.FormatInt(workspaceID, 10) {
		return ""
	}
	entityType, entityID := resolveEntity(path)
	if entityID == nil {
		return ""
	}
	table, ok := entityTableMap[entityType]
	if !ok {
		return ""
	}

	var rowJSON []byte
	// Safe: table name is from a hardcoded allowlist, not user input.
	query := "select row_to_json(t) from " + table + " t where id = $1 and workspace_id = $2"
	args := []any{*entityID, workspaceID}
	if entityType == "time_entries" {
		query += " and user_id = $3"
		args = append(args, userID)
	}
	err := pool.QueryRow(ctx, query, args...).Scan(&rowJSON)
	if err != nil || len(rowJSON) == 0 {
		return ""
	}

	result, _ := json.Marshal(map[string]json.RawMessage{"previous": rowJSON})
	return governanceapplication.SanitizeAuditPayload(result)
}

type responseRecorder struct {
	http.ResponseWriter
	body     *bytes.Buffer
	maxSize  int
	overflow bool
}

func (r *responseRecorder) Write(b []byte) (int, error) {
	if len(b) > r.maxSize-r.body.Len() {
		r.overflow = true
	}
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

func auditUser(ctx echo.Context, handlers *routeHandlers) *application.UserSnapshot {
	if user, ok := ctx.Get(publicTrackUserContextKey).(*application.UserSnapshot); ok {
		return user
	}
	if sid := sessionID(ctx); sid != "" {
		if user, err := handlers.identityApp.ResolveCurrentUser(ctx.Request().Context(), sid); err == nil {
			return &user
		}
	}
	return nil
}
