package publicapi

import (
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

type ScopeAuthorizer interface {
	RequirePublicTrackUser(ctx echo.Context) (*identityapplication.UserSnapshot, error)
	RequirePublicTrackHome(ctx echo.Context) (organizationID int64, workspaceID int64, err error)
	RequirePublicTrackWorkspace(ctx echo.Context, workspaceID int64) error
}

type Handler struct {
	catalog *catalogapplication.Service
	scope   ScopeAuthorizer
}

func NewHandler(catalog *catalogapplication.Service, scope ScopeAuthorizer) *Handler {
	return &Handler{
		catalog: catalog,
		scope:   scope,
	}
}

func bindPublicTrackJSON(ctx echo.Context, target any, optional bool) error {
	if err := ctx.Bind(target); err != nil {
		if optional && errors.Is(err, io.EOF) {
			return nil
		}
		return err
	}
	return nil
}

func writePublicTrackCatalogError(ctx echo.Context, err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && (pgErr.Code == "23505" || pgErr.Code == "23503") {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	}
	return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
}

func parseCSVInt64s(value string) ([]int64, error) {
	parts := strings.Split(value, ",")
	values := make([]int64, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		parsed, err := strconv.ParseInt(trimmed, 10, 64)
		if err != nil {
			return nil, err
		}
		values = append(values, parsed)
	}
	return values, nil
}

func intsToInt64s(values []int) []int64 {
	converted := make([]int64, 0, len(values))
	for _, value := range values {
		converted = append(converted, int64(value))
	}
	return converted
}

func intsFromInt64s(values []int64) []int {
	converted := make([]int, 0, len(values))
	for _, value := range values {
		converted = append(converted, int(value))
	}
	return converted
}

func projectCountsToAPI(projectIDs []int64, counts []catalogapplication.ProjectCountView) []map[string]int {
	countByProjectID := make(map[int64]int, len(counts))
	for _, count := range counts {
		countByProjectID[count.ProjectID] = count.Count
	}

	response := make([]map[string]int, 0, len(projectIDs))
	for _, projectID := range projectIDs {
		response = append(response, map[string]int{
			strconv.FormatInt(projectID, 10): countByProjectID[projectID],
		})
	}
	return response
}

func queryInt(ctx echo.Context, key string, fallback int) int {
	value := strings.TrimSpace(ctx.QueryParam(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func queryBool(ctx echo.Context, key string) (bool, bool) {
	value := strings.TrimSpace(ctx.QueryParam(key))
	if value == "" {
		return false, false
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false, false
	}
	return parsed, true
}

func queryBoolValue(ctx echo.Context, key string) bool {
	value, ok := queryBool(ctx, key)
	return ok && value
}

func intPointerFromInt64Pointer(value *int64) *int {
	if value == nil {
		return nil
	}
	return lo.ToPtr(int(*value))
}

func timePointer(value time.Time) *string {
	formatted := value.UTC().Format(time.RFC3339)
	return &formatted
}

func datePointer(value time.Time) *string {
	formatted := value.UTC().Format("2006-01-02")
	return &formatted
}

type batchSuccessResponse struct {
	Success []int `json:"success"`
}

func parsePathID(ctx echo.Context, key string) (int64, bool) {
	value, err := strconv.ParseInt(ctx.Param(key), 10, 64)
	if err != nil {
		return 0, false
	}
	return value, true
}

func (handler *Handler) publicTrackWorkspaceID(ctx echo.Context) (int64, error) {
	if workspaceID, ok := parsePathID(ctx, "workspace_id"); ok {
		if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
			return 0, err
		}
		return workspaceID, nil
	}

	_, workspaceID, err := handler.scope.RequirePublicTrackHome(ctx)
	if err != nil {
		return 0, err
	}
	return workspaceID, nil
}

func float32PointerFromFloat64(value *float64) *float32 {
	if value == nil {
		return nil
	}
	return lo.ToPtr(float32(*value))
}

func int64Value(value *int) int64 {
	if value == nil {
		return 0
	}
	return int64(*value)
}

func int64PointerFromTrackIntPointer(value *int) *int64 {
	if value == nil {
		return nil
	}
	return lo.ToPtr(int64(*value))
}
