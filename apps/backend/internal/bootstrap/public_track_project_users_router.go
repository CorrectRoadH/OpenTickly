package bootstrap

import (
	"github.com/labstack/echo/v4"
)

func (server *publicTrackOpenAPIServer) PatchWorkspaceProjectUsersIds(
	ctx echo.Context,
	workspaceId int,
	projectUserIds []int,
) error {
	_ = workspaceId
	_ = projectUserIds
	return server.catalog.PatchWorkspaceProjectUsersIds(ctx)
}
