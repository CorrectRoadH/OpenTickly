package bootstrap

import "github.com/labstack/echo/v4"

func (server *publicTrackOpenAPIServer) GetMeTimeEntriesSharedWith(ctx echo.Context) error {
	return server.tracking.GetMeTimeEntriesSharedWith(ctx)
}

func (server *publicTrackOpenAPIServer) PostMeTimeEntriesSharedWith(ctx echo.Context) error {
	return server.tracking.PostMeTimeEntriesSharedWith(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceTimeEntryInvitations(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tracking.GetWorkspaceTimeEntryInvitations(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspaceTimeEntryInvitationAction(ctx echo.Context, workspaceId int, timeEntryInvitationId int, action string) error {
	_ = workspaceId
	_ = timeEntryInvitationId
	_ = action
	return server.tracking.PostWorkspaceTimeEntryInvitationAction(ctx)
}

func (server *publicTrackOpenAPIServer) GetIcal(ctx echo.Context, token string) error {
	_ = token
	return server.tracking.GetIcal(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspaceIcalReset(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tracking.PostWorkspaceIcalReset(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspaceIcalToggle(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tracking.PostWorkspaceIcalToggle(ctx)
}
