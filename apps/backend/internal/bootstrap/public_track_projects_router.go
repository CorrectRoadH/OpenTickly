package bootstrap

import (
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (server *bootstrapPublicTrackOpenAPIServer) GetWorkspaceProjectUsers(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetWorkspaceProjectUsersParams,
) error {
	_ = workspaceId
	_ = params
	return server.runtime.getPublicTrackProjectUsers(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetProjects(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetProjectsParams,
) error {
	_ = workspaceId
	_ = params
	return server.runtime.getPublicTrackProjects(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PostWorkspaceProjectCreate(
	ctx echo.Context,
	workspaceId int,
) error {
	_ = workspaceId
	return server.runtime.postPublicTrackProjects(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) ProjectTaskCount(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.projectTaskCount(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) ProjectUserCount(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.projectUserCount(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) DeleteWorkspaceProject(
	ctx echo.Context,
	workspaceId int,
	projectId int,
	params publictrackapi.DeleteWorkspaceProjectParams,
) error {
	_ = workspaceId
	_ = projectId
	return server.runtime.deletePublicTrackProject(ctx, params)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetWorkspacesWorkspaceIdProjectsProjectId(
	ctx echo.Context,
	workspaceId int,
	projectId int,
) error {
	_ = workspaceId
	_ = projectId
	return server.runtime.getPublicTrackProject(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PutWorkspaceProject(
	ctx echo.Context,
	workspaceId int,
	projectId int,
) error {
	_ = workspaceId
	_ = projectId
	return server.runtime.putPublicTrackProject(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PostPinnedProject(
	ctx echo.Context,
	workspaceId int,
	projectId int,
) error {
	_ = workspaceId
	_ = projectId
	return server.runtime.postPublicTrackPinnedProject(ctx)
}
