package bootstrap

import (
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (server *publicTrackOpenAPIServer) GetMeProjects(
	ctx echo.Context,
	params publictrackapi.GetMeProjectsParams,
) error {
	_ = params
	return server.catalog.GetPublicTrackProjects(ctx)
}

func (server *publicTrackOpenAPIServer) GetMeProjectsPaginated(ctx echo.Context) error {
	return server.catalog.GetPublicTrackProjects(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceProjectUsers(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetWorkspaceProjectUsersParams,
) error {
	_ = workspaceId
	_ = params
	return server.catalog.GetPublicTrackProjectUsers(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspaceProjectUsers(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.catalog.PostPublicTrackProjectUser(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspaceProjectUsersPaginated(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.PostWorkspaceProjectUsersPaginatedParams,
) error {
	_ = workspaceId
	_ = params
	return server.catalog.GetPublicTrackProjectUsers(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteWorkspaceProjectUsers(
	ctx echo.Context,
	workspaceId int,
	projectUserId int,
) error {
	_ = workspaceId
	_ = projectUserId
	return server.catalog.DeletePublicTrackProjectUser(ctx)
}

func (server *publicTrackOpenAPIServer) PutWorkspaceProjectUsers(
	ctx echo.Context,
	workspaceId int,
	projectUserId int,
) error {
	_ = workspaceId
	_ = projectUserId
	return server.catalog.PutPublicTrackProjectUser(ctx)
}

func (server *publicTrackOpenAPIServer) GetProjects(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetProjectsParams,
) error {
	_ = workspaceId
	_ = params
	return server.catalog.GetPublicTrackProjects(ctx)
}

func (server *publicTrackOpenAPIServer) GetProjectsTemplates(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.catalog.GetPublicTrackProjectTemplates(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspaceProjectCreate(
	ctx echo.Context,
	workspaceId int,
) error {
	_ = workspaceId
	return server.catalog.PostPublicTrackProjects(ctx)
}

func (server *publicTrackOpenAPIServer) ProjectTaskCount(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.catalog.ProjectTaskCount(ctx)
}

func (server *publicTrackOpenAPIServer) ProjectUserCount(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.catalog.ProjectUserCount(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteWorkspaceProject(
	ctx echo.Context,
	workspaceId int,
	projectId int,
	params publictrackapi.DeleteWorkspaceProjectParams,
) error {
	_ = workspaceId
	_ = projectId
	return server.catalog.DeletePublicTrackProject(ctx, params)
}

func (server *publicTrackOpenAPIServer) GetWorkspacesWorkspaceIdProjectsProjectId(
	ctx echo.Context,
	workspaceId int,
	projectId int,
) error {
	_ = workspaceId
	_ = projectId
	return server.catalog.GetPublicTrackProject(ctx)
}

func (server *publicTrackOpenAPIServer) PutWorkspaceProject(
	ctx echo.Context,
	workspaceId int,
	projectId int,
) error {
	_ = workspaceId
	_ = projectId
	return server.catalog.PutPublicTrackProject(ctx)
}

func (server *publicTrackOpenAPIServer) PostPinnedProject(
	ctx echo.Context,
	workspaceId int,
	projectId int,
) error {
	_ = workspaceId
	_ = projectId
	return server.catalog.PostPublicTrackPinnedProject(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspacesWorkspaceIdProjectsProjectIdStatistics(
	ctx echo.Context,
	workspaceId int,
	projectId int,
) error {
	_ = workspaceId
	_ = projectId
	return server.tracking.GetPublicTrackProjectStatistics(ctx)
}
