package publicapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func writePublicTrackTrackingError(err error) error {
	switch {
	case errors.Is(err, trackingapplication.ErrRunningTimeEntryExists):
		return echo.NewHTTPError(http.StatusConflict, "Conflict").SetInternal(err)
	case trackingapplication.IsNotFound(err):
		return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
	case errors.Is(err, trackingapplication.ErrInvalidTimeRange),
		errors.Is(err, trackingapplication.ErrInvalidWorkspace):
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
}

func parseRequiredTrackRFC3339(value *string) (time.Time, error) {
	if value == nil {
		return time.Time{}, trackingapplication.ErrInvalidTimeRange
	}
	return time.Parse(time.RFC3339, strings.TrimSpace(*value))
}

func parseOptionalTrackRFC3339(value *string) (*time.Time, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(*value))
	if err != nil {
		return nil, err
	}
	parsed = parsed.UTC()
	return &parsed, nil
}

func parseTrackDate(value *string) (time.Time, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return time.Time{}, trackingapplication.ErrInvalidTimeRange
	}
	return time.Parse("2006-01-02", strings.TrimSpace(*value))
}

func parseOptionalTrackDate(value *string) (*time.Time, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", strings.TrimSpace(*value))
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func parseTrackDateTime(value string, endOfDay bool) (time.Time, error) {
	if strings.Contains(value, "T") {
		parsed, err := time.Parse(time.RFC3339, value)
		if err != nil {
			return time.Time{}, err
		}
		return parsed.UTC(), nil
	}
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return time.Time{}, err
	}
	if endOfDay {
		return parsed.Add(23*time.Hour + 59*time.Minute + 59*time.Second).UTC(), nil
	}
	return parsed.UTC(), nil
}

func int64sFromTrackInts(values *[]int) []int64 {
	if values == nil {
		return nil
	}
	converted := make([]int64, 0, len(*values))
	for _, value := range *values {
		converted = append(converted, int64(value))
	}
	return converted
}

func firstTrackIntPointerAsInt64(values ...*int) *int64 {
	for _, value := range values {
		if value != nil {
			converted := int64(*value)
			return &converted
		}
	}
	return nil
}

func int64PointerToIntPointer(value *int) *int {
	if value == nil {
		return nil
	}
	converted := *value
	return &converted
}

func int64ValueOr(fallback int64, value *int) int64 {
	if value == nil {
		return fallback
	}
	return int64(*value)
}

func float64Value(value *float32) float64 {
	if value == nil {
		return 0
	}
	return float64(*value)
}

func intValueOrZero(value *int) int {
	if value == nil {
		return 0
	}
	return *value
}

func interfaceValue(value *interface{}) any {
	if value == nil {
		return nil
	}
	return *value
}

func parseOptionalPathID(ctx echo.Context, key string) (int64, bool) {
	value := strings.TrimSpace(ctx.Param(key))
	if value == "" {
		return 0, false
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0, false
	}
	return parsed, true
}

func queryInt64(ctx echo.Context, key string) (int64, bool) {
	value := strings.TrimSpace(ctx.QueryParam(key))
	if value == "" {
		return 0, false
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0, false
	}
	return parsed, true
}

func timePointerValue(value *time.Time) *string {
	if value == nil {
		return nil
	}
	return timePointer(value.UTC())
}

func datePointerValue(value *time.Time) *string {
	if value == nil {
		return nil
	}
	return datePointer(value.UTC())
}

func defaultString(value *string, fallback string) string {
	if value == nil || strings.TrimSpace(*value) == "" {
		return fallback
	}
	return strings.TrimSpace(*value)
}

func timeEntryViewToAPI(view trackingapplication.TimeEntryView) publictrackapi.GithubComTogglTogglApiInternalModelsTimeEntry {
	tagIDs := intsFromInt64s(view.TagIDs)
	if tagIDs == nil {
		tagIDs = []int{}
	}
	tagNames := view.TagNames
	if tagNames == nil {
		tagNames = []string{}
	}
	return publictrackapi.GithubComTogglTogglApiInternalModelsTimeEntry{
		At:            timePointer(view.UpdatedAt),
		Billable:      lo.ToPtr(view.Billable),
		ClientId:      intPointerFromInt64Pointer(view.ClientID),
		ClientName:    view.ClientName,
		Description:   lo.ToPtr(view.Description),
		Duration:      lo.ToPtr(view.Duration),
		Duronly:       lo.ToPtr(true),
		Id:            lo.ToPtr(int(view.ID)),
		Pid:           intPointerFromInt64Pointer(view.ProjectID),
		ProjectActive: view.ProjectActive,
		ProjectId:     intPointerFromInt64Pointer(view.ProjectID),
		ProjectName:   view.ProjectName,
		Start:         timePointer(view.Start),
		Stop:          timePointerValue(view.Stop),
		TagIds:        &tagIDs,
		Tags:          &tagNames,
		TaskId:        intPointerFromInt64Pointer(view.TaskID),
		TaskName:      view.TaskName,
		Tid:           intPointerFromInt64Pointer(view.TaskID),
		Uid:           lo.ToPtr(int(view.UserID)),
		UserId:        lo.ToPtr(int(view.UserID)),
		Wid:           lo.ToPtr(int(view.WorkspaceID)),
		WorkspaceId:   lo.ToPtr(int(view.WorkspaceID)),
	}
}

func bindTrackRequestBody(ctx echo.Context, payload any) (map[string]json.RawMessage, error) {
	bodyBytes, err := io.ReadAll(ctx.Request().Body)
	if err != nil {
		return nil, err
	}

	var rawFields map[string]json.RawMessage
	if err := json.Unmarshal(bodyBytes, &rawFields); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(bodyBytes, payload); err != nil {
		return nil, err
	}

	return rawFields, nil
}

func resolveTrackNullableProjectID(rawFields map[string]json.RawMessage, values ...*int) *int64 {
	if resolved := firstTrackIntPointerAsInt64(values...); resolved != nil {
		return resolved
	}
	if hasExplicitTrackJSONNull(rawFields, "project_id", "pid") {
		return lo.ToPtr(int64(0))
	}
	return nil
}

func hasExplicitTrackJSONNull(rawFields map[string]json.RawMessage, keys ...string) bool {
	for _, key := range keys {
		rawValue, ok := rawFields[key]
		if ok && strings.TrimSpace(string(rawValue)) == "null" {
			return true
		}
	}
	return false
}
