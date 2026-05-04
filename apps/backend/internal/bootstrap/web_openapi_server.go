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

func (server *webOpenAPIServer) VerifyEmail(ctx echo.Context) error {
	return server.handlers.verifyEmail(ctx)
}

func (server *webOpenAPIServer) ResendVerificationEmail(ctx echo.Context) error {
	return server.handlers.resendVerificationEmail(ctx)
}

func (server *webOpenAPIServer) RequestPasswordReset(ctx echo.Context) error {
	return server.handlers.requestPasswordReset(ctx)
}

func (server *webOpenAPIServer) ResetPassword(ctx echo.Context) error {
	return server.handlers.resetPassword(ctx)
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

func (server *webOpenAPIServer) ResendWorkspaceInvite(ctx echo.Context, workspaceId int, memberId int) error {
	_ = workspaceId
	_ = memberId
	return server.handlers.resendWorkspaceInvite(ctx)
}

func (server *webOpenAPIServer) GetWorkspaceInvite(ctx echo.Context, token string) error {
	return server.handlers.getInvite(ctx, token)
}

func (server *webOpenAPIServer) AcceptWorkspaceInvite(ctx echo.Context, token string) error {
	return server.handlers.acceptInvite(ctx, token)
}

func (server *webOpenAPIServer) AcceptWorkspaceInviteSignup(ctx echo.Context, token string) error {
	return server.handlers.acceptInviteSignup(ctx, token)
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

func (server *webOpenAPIServer) SearchWorkspaceTimeEntries(ctx echo.Context, workspaceId int, params webapi.SearchWorkspaceTimeEntriesParams) error {
	_ = workspaceId
	_ = params
	return server.handlers.searchWorkspaceTimeEntries(ctx)
}

func (server *webOpenAPIServer) ListRecentWorkspaceTimeEntrySuggestions(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.handlers.listRecentWorkspaceTimeEntrySuggestions(ctx)
}

func (server *webOpenAPIServer) ResetOnboarding(ctx echo.Context) error {
	return server.handlers.resetOnboarding(ctx)
}

func (server *webOpenAPIServer) GetOnboarding(ctx echo.Context) error {
	return server.handlers.getOnboarding(ctx)
}

func (server *webOpenAPIServer) CompleteOnboarding(ctx echo.Context) error {
	return server.handlers.completeOnboarding(ctx)
}
