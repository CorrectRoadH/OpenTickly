package bootstrap

import (
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"

	"github.com/labstack/echo/v4"
)

type webOpenAPIServer struct {
	handlers *routeHandlers
}

func newWebOpenAPIServer(handlers *routeHandlers) webapi.ServerInterface {
	return &webOpenAPIServer{handlers: handlers}
}

func (server *webOpenAPIServer) RegisterWebUser(ctx echo.Context) error {
	return server.handlers.register(ctx)
}

func (server *webOpenAPIServer) LoginWebUser(ctx echo.Context) error {
	return server.handlers.login(ctx)
}

func (server *webOpenAPIServer) LogoutWebUser(ctx echo.Context) error {
	return server.handlers.logout(ctx)
}

func (server *webOpenAPIServer) DeleteOrganization(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.handlers.deleteOrganization(ctx)
}

func (server *webOpenAPIServer) GetWebSession(ctx echo.Context) error {
	return server.handlers.session(ctx)
}

func (server *webOpenAPIServer) UpdateWebSession(ctx echo.Context) error {
	return server.handlers.updateSession(ctx)
}

func (server *webOpenAPIServer) GetWorkspaceCapabilities(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.handlers.workspaceCapabilities(ctx)
}

func (server *webOpenAPIServer) ListWorkspaceMembers(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.handlers.listWorkspaceMembers(ctx)
}

func (server *webOpenAPIServer) InviteWorkspaceMember(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.handlers.inviteWorkspaceMember(ctx)
}

func (server *webOpenAPIServer) RemoveWorkspaceMember(ctx echo.Context, workspaceId int, memberId int) error {
	_ = workspaceId
	_ = memberId
	return server.handlers.removeWorkspaceMember(ctx)
}

func (server *webOpenAPIServer) DisableWorkspaceMember(ctx echo.Context, workspaceId int, memberId int) error {
	_ = workspaceId
	_ = memberId
	return server.handlers.disableWorkspaceMember(ctx)
}

func (server *webOpenAPIServer) UpdateWorkspaceMemberRateCost(ctx echo.Context, workspaceId int, memberId int) error {
	_ = workspaceId
	_ = memberId
	return server.handlers.updateWorkspaceMemberRateCost(ctx)
}

func (server *webOpenAPIServer) RestoreWorkspaceMember(ctx echo.Context, workspaceId int, memberId int) error {
	_ = workspaceId
	_ = memberId
	return server.handlers.restoreWorkspaceMember(ctx)
}

func (server *webOpenAPIServer) GetWorkspacePermissions(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.handlers.workspacePermissions(ctx)
}

func (server *webOpenAPIServer) UpdateWorkspacePermissions(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.handlers.updateWorkspacePermissions(ctx)
}

func (server *webOpenAPIServer) GetWorkspaceQuota(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.handlers.workspaceQuota(ctx)
}

func (server *webOpenAPIServer) GetWorkspaceSettings(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.handlers.workspaceSettings(ctx)
}

func (server *webOpenAPIServer) UpdateWorkspaceSettings(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.handlers.updateWorkspaceSettings(ctx)
}

func (server *webOpenAPIServer) GetWorkspaceOnboarding(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.handlers.getWorkspaceOnboarding(ctx)
}

func (server *webOpenAPIServer) UpdateWorkspaceOnboarding(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.handlers.updateWorkspaceOnboarding(ctx)
}
