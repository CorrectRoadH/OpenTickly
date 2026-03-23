package bootstrap

import (
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (server *bootstrapPublicTrackOpenAPIServer) GetWorkspaceProjectTasks(
	ctx echo.Context,
	workspaceId int,
	projectId int,
	params publictrackapi.GetWorkspaceProjectTasksParams,
) error {
	_ = workspaceId
	_ = projectId
	_ = params
	return server.runtime.getPublicTrackProjectTasks(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PostWorkspaceProjectTasks(
	ctx echo.Context,
	workspaceId int,
	projectId int,
) error {
	_ = workspaceId
	_ = projectId
	return server.runtime.postPublicTrackProjectTask(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetWorkspaceProjectTask(
	ctx echo.Context,
	workspaceId int,
	projectId int,
	taskId int,
) error {
	_ = workspaceId
	_ = projectId
	_ = taskId
	return server.runtime.getPublicTrackProjectTask(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PutWorkspaceProjectTask(
	ctx echo.Context,
	workspaceId int,
	projectId int,
	taskId string,
) error {
	_ = workspaceId
	_ = projectId
	_ = taskId
	return server.runtime.putPublicTrackProjectTask(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) DeleteWorkspaceProjectTask(
	ctx echo.Context,
	workspaceId int,
	projectId int,
	taskId int,
) error {
	_ = workspaceId
	_ = projectId
	_ = taskId
	return server.runtime.deletePublicTrackProjectTask(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetWorkspaceTasks(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetWorkspaceTasksParams,
) error {
	_ = workspaceId
	_ = params
	return server.runtime.getPublicTrackTasks(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetWorkspaceTasksBasic(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetWorkspaceTasksBasicParams,
) error {
	_ = workspaceId
	_ = params
	return server.runtime.getPublicTrackTasksBasic(ctx)
}
