package bootstrap

import (
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"

	"github.com/labstack/echo/v4"
)

type bootstrapWebOpenAPIServer struct {
	runtime *webRuntime
}

func newBootstrapWebOpenAPIServer(runtime *webRuntime) webapi.ServerInterface {
	return &bootstrapWebOpenAPIServer{runtime: runtime}
}

func (server *bootstrapWebOpenAPIServer) RegisterWebUser(ctx echo.Context) error {
	return server.runtime.register(ctx)
}

func (server *bootstrapWebOpenAPIServer) LoginWebUser(ctx echo.Context) error {
	return server.runtime.login(ctx)
}

func (server *bootstrapWebOpenAPIServer) LogoutWebUser(ctx echo.Context) error {
	return server.runtime.logout(ctx)
}

func (server *bootstrapWebOpenAPIServer) GetWebSession(ctx echo.Context) error {
	return server.runtime.session(ctx)
}

func (server *bootstrapWebOpenAPIServer) CreateTask(ctx echo.Context) error {
	return server.runtime.createTask(ctx)
}

func (server *bootstrapWebOpenAPIServer) GetWorkspaceCapabilities(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.workspaceCapabilities(ctx)
}

func (server *bootstrapWebOpenAPIServer) ListWorkspaceMembers(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.listWorkspaceMembers(ctx)
}

func (server *bootstrapWebOpenAPIServer) InviteWorkspaceMember(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.inviteWorkspaceMember(ctx)
}

func (server *bootstrapWebOpenAPIServer) RemoveWorkspaceMember(ctx echo.Context, workspaceId int, memberId int) error {
	_ = workspaceId
	_ = memberId
	return server.runtime.removeWorkspaceMember(ctx)
}

func (server *bootstrapWebOpenAPIServer) DisableWorkspaceMember(ctx echo.Context, workspaceId int, memberId int) error {
	_ = workspaceId
	_ = memberId
	return server.runtime.disableWorkspaceMember(ctx)
}

func (server *bootstrapWebOpenAPIServer) UpdateWorkspaceMemberRateCost(ctx echo.Context, workspaceId int, memberId int) error {
	_ = workspaceId
	_ = memberId
	return server.runtime.updateWorkspaceMemberRateCost(ctx)
}

func (server *bootstrapWebOpenAPIServer) RestoreWorkspaceMember(ctx echo.Context, workspaceId int, memberId int) error {
	_ = workspaceId
	_ = memberId
	return server.runtime.restoreWorkspaceMember(ctx)
}

func (server *bootstrapWebOpenAPIServer) GetWorkspacePermissions(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.workspacePermissions(ctx)
}

func (server *bootstrapWebOpenAPIServer) UpdateWorkspacePermissions(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.updateWorkspacePermissions(ctx)
}

func (server *bootstrapWebOpenAPIServer) GetWorkspaceQuota(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.workspaceQuota(ctx)
}

func (server *bootstrapWebOpenAPIServer) GetWorkspaceSettings(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.workspaceSettings(ctx)
}

func (server *bootstrapWebOpenAPIServer) UpdateWorkspaceSettings(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.updateWorkspaceSettings(ctx)
}
