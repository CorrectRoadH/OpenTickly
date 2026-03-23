package publicapi

import (
	"strconv"
	"strings"
	"time"

	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

type ScopeAuthorizer interface {
	RequirePublicTrackUser(ctx echo.Context) (*identityapplication.UserSnapshot, error)
	RequirePublicTrackWorkspace(ctx echo.Context, workspaceID int64) error
	RequirePublicTrackTrackingScope(ctx echo.Context) (int64, *identityapplication.UserSnapshot, error)
}

type Handler struct {
	tracking *trackingapplication.Service
	scope    ScopeAuthorizer
}

func NewHandler(tracking *trackingapplication.Service, scope ScopeAuthorizer) *Handler {
	return &Handler{
		tracking: tracking,
		scope:    scope,
	}
}

func parsePathID(ctx echo.Context, key string) (int64, bool) {
	value, err := strconv.ParseInt(ctx.Param(key), 10, 64)
	if err != nil {
		return 0, false
	}
	return value, true
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

func intsFromInt64s(values []int64) []int {
	converted := make([]int, 0, len(values))
	for _, value := range values {
		converted = append(converted, int(value))
	}
	return converted
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

func int64PointerFromTrackIntPointer(value *int) *int64 {
	if value == nil {
		return nil
	}
	return lo.ToPtr(int64(*value))
}
