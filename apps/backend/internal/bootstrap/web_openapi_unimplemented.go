package bootstrap

import (
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"

	"github.com/labstack/echo/v4"
)

func (server *bootstrapWebOpenAPIServer) ListClients(ctx echo.Context, params webapi.ListClientsParams) error {
	_ = ctx
	_ = params
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) CreateClient(ctx echo.Context) error {
	_ = ctx
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) ListGroups(ctx echo.Context, params webapi.ListGroupsParams) error {
	_ = ctx
	_ = params
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) CreateGroup(ctx echo.Context) error {
	_ = ctx
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) ListProjects(ctx echo.Context, params webapi.ListProjectsParams) error {
	_ = ctx
	_ = params
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) CreateProject(ctx echo.Context) error {
	_ = ctx
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) GetProject(ctx echo.Context, projectId int) error {
	_ = ctx
	_ = projectId
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) RestoreProject(ctx echo.Context, projectId int) error {
	_ = ctx
	_ = projectId
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) ArchiveProject(ctx echo.Context, projectId int) error {
	_ = ctx
	_ = projectId
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) ListProjectMembers(ctx echo.Context, projectId int) error {
	_ = ctx
	_ = projectId
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) GrantProjectMember(ctx echo.Context, projectId int) error {
	_ = ctx
	_ = projectId
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) RevokeProjectMember(ctx echo.Context, projectId int, memberId int) error {
	_ = ctx
	_ = projectId
	_ = memberId
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) UnpinProject(ctx echo.Context, projectId int) error {
	_ = ctx
	_ = projectId
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) PinProject(ctx echo.Context, projectId int) error {
	_ = ctx
	_ = projectId
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) ListTags(ctx echo.Context, params webapi.ListTagsParams) error {
	_ = ctx
	_ = params
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) CreateTag(ctx echo.Context) error {
	_ = ctx
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) ListTasks(ctx echo.Context, params webapi.ListTasksParams) error {
	_ = ctx
	_ = params
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) CreateTask(ctx echo.Context) error {
	_ = ctx
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) ListWorkspaceMembers(ctx echo.Context, workspaceId int) error {
	_ = ctx
	_ = workspaceId
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) InviteWorkspaceMember(ctx echo.Context, workspaceId int) error {
	_ = ctx
	_ = workspaceId
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) RemoveWorkspaceMember(ctx echo.Context, workspaceId int, memberId int) error {
	_ = ctx
	_ = workspaceId
	_ = memberId
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) DisableWorkspaceMember(ctx echo.Context, workspaceId int, memberId int) error {
	_ = ctx
	_ = workspaceId
	_ = memberId
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) UpdateWorkspaceMemberRateCost(
	ctx echo.Context,
	workspaceId int,
	memberId int,
) error {
	_ = ctx
	_ = workspaceId
	_ = memberId
	return newNotImplementedError()
}

func (server *bootstrapWebOpenAPIServer) RestoreWorkspaceMember(ctx echo.Context, workspaceId int, memberId int) error {
	_ = ctx
	_ = workspaceId
	_ = memberId
	return newNotImplementedError()
}
