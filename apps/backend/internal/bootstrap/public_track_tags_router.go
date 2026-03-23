package bootstrap

import (
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (server *publicTrackOpenAPIServer) GetTags(ctx echo.Context) error {
	return server.catalog.GetPublicTrackTags(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceTag(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetWorkspaceTagParams,
) error {
	_ = workspaceId
	_ = params
	return server.catalog.GetPublicTrackTags(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspaceTag(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.catalog.PostPublicTrackTags(ctx)
}

func (server *publicTrackOpenAPIServer) PutWorkspaceTag(
	ctx echo.Context,
	workspaceId int,
	tagId int,
) error {
	_ = workspaceId
	_ = tagId
	return server.catalog.PutPublicTrackTag(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteWorkspaceTag(
	ctx echo.Context,
	workspaceId int,
	tagId int,
) error {
	_ = workspaceId
	_ = tagId
	return server.catalog.DeletePublicTrackTag(ctx)
}

func (server *publicTrackOpenAPIServer) PatchWorkspaceTags(ctx echo.Context, workspaceId int) error {
	return server.catalog.PatchPublicTrackTags(ctx)
}
