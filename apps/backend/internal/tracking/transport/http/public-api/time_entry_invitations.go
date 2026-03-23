package publicapi

import (
	"net/http"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

// GetWorkspaceTimeEntryInvitations returns time entry invitations for a workspace.
func (handler *Handler) GetWorkspaceTimeEntryInvitations(ctx echo.Context) error {
	workspaceID, _, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	_ = workspaceID
	return ctx.JSON(http.StatusOK, []publictrackapi.TimeentriesGetTimEntryInvitationsResponse{})
}

// PostWorkspaceTimeEntryInvitationAction performs an action on a time entry invitation.
func (handler *Handler) PostWorkspaceTimeEntryInvitationAction(ctx echo.Context) error {
	workspaceID, _, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	_ = workspaceID
	_ = ctx.QueryParam("action")
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
