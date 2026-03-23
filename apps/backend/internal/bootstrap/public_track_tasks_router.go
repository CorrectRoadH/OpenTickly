package bootstrap

import (
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (server *publicTrackOpenAPIServer) GetTasks(
	ctx echo.Context,
	params publictrackapi.GetTasksParams,
) error {
	_ = params
	return server.catalog.GetPublicTrackTasks(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceProjectTasks(
	ctx echo.Context,
	workspaceId int,
	projectId int,
	params publictrackapi.GetWorkspaceProjectTasksParams,
) error {
	_ = workspaceId
	_ = projectId
	_ = params
	return server.catalog.GetPublicTrackProjectTasks(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspaceProjectTasks(
	ctx echo.Context,
	workspaceId int,
	projectId int,
) error {
	_ = workspaceId
	_ = projectId
	return server.catalog.PostPublicTrackProjectTask(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceProjectTask(
	ctx echo.Context,
	workspaceId int,
	projectId int,
	taskId int,
) error {
	_ = workspaceId
	_ = projectId
	_ = taskId
	return server.catalog.GetPublicTrackProjectTask(ctx)
}

func (server *publicTrackOpenAPIServer) PutWorkspaceProjectTask(
	ctx echo.Context,
	workspaceId int,
	projectId int,
	taskId string,
) error {
	_ = workspaceId
	_ = projectId
	_ = taskId
	return server.catalog.PutPublicTrackProjectTask(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteWorkspaceProjectTask(
	ctx echo.Context,
	workspaceId int,
	projectId int,
	taskId int,
) error {
	_ = workspaceId
	_ = projectId
	_ = taskId
	return server.catalog.DeletePublicTrackProjectTask(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceTasks(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetWorkspaceTasksParams,
) error {
	_ = workspaceId
	_ = params
	return server.catalog.GetPublicTrackTasks(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceTasksBasic(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetWorkspaceTasksBasicParams,
) error {
	_ = workspaceId
	_ = params
	return server.catalog.GetPublicTrackTasksBasic(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceTasksData(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetWorkspaceTasksDataParams,
) error {
	_ = workspaceId
	_ = params
	return server.catalog.GetPublicTrackWorkspaceTasksData(ctx)
}
