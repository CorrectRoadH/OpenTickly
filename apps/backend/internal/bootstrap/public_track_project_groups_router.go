package bootstrap

import "github.com/labstack/echo/v4"

func (server *publicTrackOpenAPIServer) GetProjectGroups(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.catalog.GetPublicTrackProjectGroups(ctx)
}

func (server *publicTrackOpenAPIServer) PostProjectGroup(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.catalog.PostPublicTrackProjectGroup(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteProjectGroup(
	ctx echo.Context,
	workspaceId int,
	projectGroupId int,
) error {
	_ = workspaceId
	_ = projectGroupId
	return server.catalog.DeletePublicTrackProjectGroup(ctx)
}
