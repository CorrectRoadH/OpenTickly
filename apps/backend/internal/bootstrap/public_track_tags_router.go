package bootstrap

import (
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (server *bootstrapPublicTrackOpenAPIServer) GetWorkspaceTag(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetWorkspaceTagParams,
) error {
	_ = workspaceId
	_ = params
	return server.runtime.getPublicTrackTags(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PostWorkspaceTag(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.postPublicTrackTags(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PutWorkspaceTag(
	ctx echo.Context,
	workspaceId int,
	tagId int,
) error {
	_ = workspaceId
	_ = tagId
	return server.runtime.putPublicTrackTag(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) DeleteWorkspaceTag(
	ctx echo.Context,
	workspaceId int,
	tagId int,
) error {
	_ = workspaceId
	_ = tagId
	return server.runtime.deletePublicTrackTag(ctx)
}
