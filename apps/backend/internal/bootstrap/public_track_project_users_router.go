package bootstrap

import (
	"github.com/labstack/echo/v5"
)

func (server *publicTrackOpenAPIServer) PatchWorkspaceProjectUsersIds(
	ctx *echo.Context,
	workspaceId int,
	projectUserIds []int,
) error {
	_ = workspaceId
	_ = projectUserIds
	return server.catalog.PatchWorkspaceProjectUsersIds(ctx)
}
