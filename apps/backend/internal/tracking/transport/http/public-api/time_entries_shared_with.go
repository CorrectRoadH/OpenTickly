package publicapi

import (
	"net/http"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

// GetMeTimeEntriesSharedWith returns time entries shared with the current user.
func (handler *Handler) GetMeTimeEntriesSharedWith(ctx echo.Context) error {
	_, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, []publictrackapi.GithubComTogglTogglApiInternalModelsTimeEntry{})
}

// PostMeTimeEntriesSharedWith creates a time entry sharing entry.
func (handler *Handler) PostMeTimeEntriesSharedWith(ctx echo.Context) error {
	_, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented").SetInternal(err)
}
