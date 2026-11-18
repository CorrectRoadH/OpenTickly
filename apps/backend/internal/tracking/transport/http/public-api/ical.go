package publicapi

import (
	"net/http"

	"opentoggl/backend/apps/backend/internal/http/httperror"

	"github.com/labstack/echo/v5"
)

// GetIcal returns an iCal feed for a given token (public endpoint, no auth required).
func (handler *Handler) GetIcal(ctx *echo.Context) error {
	_ = ctx.Param("token")
	return httperror.New(http.StatusNotImplemented, "Not Implemented")
}

// PostWorkspaceIcalReset resets the iCal token for a workspace.
func (handler *Handler) PostWorkspaceIcalReset(ctx *echo.Context) error {
	workspaceID, _, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	_ = workspaceID
	return httperror.New(http.StatusNotImplemented, "Not Implemented").WithCause(err)
}

// PostWorkspaceIcalToggle toggles the iCal feature for a workspace.
func (handler *Handler) PostWorkspaceIcalToggle(ctx *echo.Context) error {
	workspaceID, _, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	_ = workspaceID
	return httperror.New(http.StatusNotImplemented, "Not Implemented").WithCause(err)
}
