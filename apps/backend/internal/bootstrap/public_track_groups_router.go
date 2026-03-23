package bootstrap

import "github.com/labstack/echo/v4"

func (server *bootstrapPublicTrackOpenAPIServer) GetWorkspaceGroups(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.getPublicTrackGroups(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PostWorkspaceGroup(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.postPublicTrackGroups(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) DeleteWorkspaceGroup(
	ctx echo.Context,
	workspaceId int,
	groupId int,
) error {
	_ = workspaceId
	_ = groupId
	return server.runtime.deletePublicTrackGroup(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PutWorkspaceGroup(
	ctx echo.Context,
	workspaceId int,
	groupId int,
) error {
	_ = workspaceId
	_ = groupId
	return server.runtime.putPublicTrackGroup(ctx)
}
