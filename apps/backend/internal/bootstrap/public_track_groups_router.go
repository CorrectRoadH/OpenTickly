package bootstrap

import "github.com/labstack/echo/v4"

func (server *publicTrackOpenAPIServer) GetWorkspaceGroups(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.catalog.GetPublicTrackGroups(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspaceGroup(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.catalog.PostPublicTrackGroups(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteWorkspaceGroup(
	ctx echo.Context,
	workspaceId int,
	groupId int,
) error {
	_ = workspaceId
	_ = groupId
	return server.catalog.DeletePublicTrackGroup(ctx)
}

func (server *publicTrackOpenAPIServer) PutWorkspaceGroup(
	ctx echo.Context,
	workspaceId int,
	groupId int,
) error {
	_ = workspaceId
	_ = groupId
	return server.catalog.PutPublicTrackGroup(ctx)
}
