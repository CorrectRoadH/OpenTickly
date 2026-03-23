package bootstrap

import (
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (server *publicTrackOpenAPIServer) GetWorkspaceUsers(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetWorkspaceUsersParams,
) error {
	_ = workspaceId
	_ = params
	return server.membership.GetPublicTrackWorkspaceUsers(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspaceUsersData(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.membership.PostPublicTrackWorkspaceUsersData(ctx)
}

func (server *publicTrackOpenAPIServer) PutWorkspaceUsers(
	ctx echo.Context,
	workspaceId int,
	userId int,
) error {
	_ = workspaceId
	_ = userId
	return server.membership.PutPublicTrackWorkspaceUser(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceWorkspaceUsers(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetWorkspaceWorkspaceUsersParams,
) error {
	_ = workspaceId
	_ = params
	return server.membership.GetPublicTrackWorkspaceWorkspaceUsers(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteWorkspaceUser(
	ctx echo.Context,
	workspaceId int,
	workspaceUserId int,
) error {
	_ = workspaceId
	_ = workspaceUserId
	return server.membership.DeletePublicTrackWorkspaceUser(ctx)
}

func (server *publicTrackOpenAPIServer) PutWorkspaceWorkspaceUsers(
	ctx echo.Context,
	workspaceId int,
	workspaceUserId int,
) error {
	_ = workspaceId
	_ = workspaceUserId
	return server.membership.PutPublicTrackWorkspaceWorkspaceUser(ctx)
}
