package bootstrap

import (
	"net/http"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"

	"github.com/labstack/echo/v4"
)

type bootstrapWebOpenAPIServer struct {
	runtime *webRuntime
}

func newBootstrapWebOpenAPIServer(runtime *webRuntime) webapi.ServerInterface {
	return &bootstrapWebOpenAPIServer{runtime: runtime}
}

func newNotImplementedError() error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
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

func (server *bootstrapWebOpenAPIServer) GetCurrentUserProfile(ctx echo.Context) error {
	return server.runtime.profile(ctx)
}

func (server *bootstrapWebOpenAPIServer) UpdateCurrentUserProfile(ctx echo.Context) error {
	return server.runtime.updateProfile(ctx)
}

func (server *bootstrapWebOpenAPIServer) ResetCurrentUserApiToken(ctx echo.Context) error {
	return server.runtime.resetAPIToken(ctx)
}

func (server *bootstrapWebOpenAPIServer) GetCurrentUserPreferences(ctx echo.Context) error {
	return server.runtime.preferences(ctx)
}

func (server *bootstrapWebOpenAPIServer) UpdateCurrentUserPreferences(ctx echo.Context) error {
	return server.runtime.updatePreferences(ctx)
}

func (server *bootstrapWebOpenAPIServer) GetOrganizationSettings(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.runtime.organizationSettings(ctx)
}

func (server *bootstrapWebOpenAPIServer) UpdateOrganizationSettings(ctx echo.Context, organizationId int) error {
	_ = organizationId
	return server.runtime.updateOrganizationSettings(ctx)
}

func (server *bootstrapWebOpenAPIServer) GetWorkspaceCapabilities(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.workspaceCapabilities(ctx)
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
