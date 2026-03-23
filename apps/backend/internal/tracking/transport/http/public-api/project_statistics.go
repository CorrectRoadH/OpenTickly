package publicapi

import (
	"errors"
	"net/http"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (handler *Handler) GetPublicTrackProjectStatistics(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	_ = user

	projectID, ok := parsePathID(ctx, "project_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	view, err := handler.tracking.GetProjectStatistics(ctx.Request().Context(), workspaceID, projectID)
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackTrackingError(err)
	}

	return ctx.JSON(http.StatusOK, publictrackapi.ModelsProjectStatistics{
		EarliestTimeEntry: timePointerValue(view.EarliestTimeEntry),
		LatestTimeEntry:   timePointerValue(view.LatestTimeEntry),
	})
}
