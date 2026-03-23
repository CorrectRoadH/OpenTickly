package bootstrap

import "github.com/labstack/echo/v4"

func (server *publicTrackOpenAPIServer) GetWorkspaceAllActivities(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tracking.GetPublicTrackWorkspaceAllActivities(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceMostActive(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tracking.GetPublicTrackWorkspaceMostActive(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceTopActivity(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tracking.GetPublicTrackWorkspaceTopActivity(ctx)
}
