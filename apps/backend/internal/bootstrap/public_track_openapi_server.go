package bootstrap

import (
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

type bootstrapPublicTrackOpenAPIServer struct {
	*publicTrackUnimplementedServer
	runtime *webRuntime
}

func newBootstrapPublicTrackOpenAPIServer(runtime *webRuntime) publictrackapi.ServerInterface {
	return &bootstrapPublicTrackOpenAPIServer{
		publicTrackUnimplementedServer: &publicTrackUnimplementedServer{},
		runtime:                        runtime,
	}
}

func (server *bootstrapPublicTrackOpenAPIServer) GetMe(
	ctx echo.Context,
	params publictrackapi.GetMeParams,
) error {
	_ = params
	return server.runtime.getPublicTrackMe(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PutMe(ctx echo.Context) error {
	return server.runtime.putPublicTrackMe(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetPreferences(ctx echo.Context) error {
	return server.runtime.getPublicTrackPreferences(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PostPreferences(ctx echo.Context) error {
	return server.runtime.postPublicTrackPreferences(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PostResetToken(ctx echo.Context) error {
	return server.runtime.postPublicTrackResetToken(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetOrganization(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.runtime.getPublicTrackOrganization(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PutOrganization(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.runtime.putPublicTrackOrganization(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetWorkspaceClients(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetWorkspaceClientsParams,
) error {
	_ = workspaceId
	_ = params
	return server.runtime.getPublicTrackClients(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PostWorkspaceClients(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.postPublicTrackClients(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetWorkspaceClient(
	ctx echo.Context,
	workspaceId int,
	clientId int,
) error {
	_ = workspaceId
	_ = clientId
	return server.runtime.getPublicTrackClient(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PutWorkspaceClients(
	ctx echo.Context,
	workspaceId int,
	clientId int,
) error {
	_ = workspaceId
	_ = clientId
	return server.runtime.putPublicTrackClient(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetWorkspaceGroups(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.getPublicTrackGroups(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PostWorkspaceGroup(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.postPublicTrackGroups(ctx)
}

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

func (server *bootstrapPublicTrackOpenAPIServer) GetWorkspacesWorkspaceIdProjectsProjectId(
	ctx echo.Context,
	workspaceId int,
	projectId int,
) error {
	_ = workspaceId
	_ = projectId
	return server.runtime.getPublicTrackProject(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PostWorkspaceProjectCreate(
	ctx echo.Context,
	workspaceId int,
) error {
	_ = workspaceId
	return server.runtime.postPublicTrackProjects(ctx)
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
