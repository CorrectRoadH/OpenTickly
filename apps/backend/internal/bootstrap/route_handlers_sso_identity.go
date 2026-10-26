package bootstrap

import (
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/labstack/echo/v4"
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
)

func (handlers *routeHandlers) listSSOIdentities(ctx echo.Context) error {
	if response, ok := handlers.authorizeSession(ctx); !ok {
		return response
	}
	user, err := handlers.identityApp.ResolveCurrentUser(ctx.Request().Context(), sessionID(ctx))
	if err != nil {
		return err
	}
	bindings, err := handlers.identityApp.ListSSO(ctx.Request().Context(), user.ID)
	if err != nil {
		return err
	}
	items := make([]webapi.SsoIdentity, 0, len(bindings))
	for _, binding := range bindings {
		items = append(items, ssoBindingView(binding))
	}
	return ctx.JSON(http.StatusOK, items)
}

func ssoBindingView(binding identityapplication.SSOBinding) webapi.SsoIdentity {
	return webapi.SsoIdentity{WorkspaceId: binding.WorkspaceID, WorkspaceName: binding.WorkspaceName, ProfileName: binding.ProfileName, Enabled: binding.Enabled, Linked: true}
}

func (handlers *routeHandlers) workspaceSSOIdentity(ctx echo.Context) error {
	if response, ok := handlers.authorizeSession(ctx); !ok {
		return response
	}
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid workspace")
	}
	user, err := handlers.identityApp.ResolveCurrentUser(ctx.Request().Context(), sessionID(ctx))
	if err != nil {
		return err
	}
	if ctx.Request().Method == http.MethodDelete {
		var input webapi.SsoUnlinkRequest
		if err := ctx.Bind(&input); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid request")
		}
		err := handlers.identityApp.UnlinkSSO(ctx.Request().Context(), identityapplication.SSOUnlinkWrite{WorkspaceID: workspaceID, UserID: user.ID, SessionID: sessionID(ctx), Password: input.Password})
		if errors.Is(err, identitydomain.ErrInvalidCredentials) {
			return echo.NewHTTPError(http.StatusForbidden, "Current password is incorrect")
		}
		if err != nil {
			return err
		}
		clearSessionCookie(ctx)
		return ctx.NoContent(http.StatusNoContent)
	}
	if ctx.Request().Method == http.MethodGet {
		bindings, err := handlers.identityApp.ListSSO(ctx.Request().Context(), user.ID)
		if err != nil {
			return err
		}
		for _, binding := range bindings {
			if binding.WorkspaceID == workspaceID {
				return ctx.JSON(http.StatusOK, ssoBindingView(binding))
			}
		}
	}
	if err := handlers.requireCurrentSessionWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	var name string
	err = handlers.pool.QueryRow(ctx.Request().Context(), `SELECT w.name FROM tenant_workspaces w JOIN membership_workspace_members m ON m.workspace_id=w.id WHERE w.id=$1 AND m.user_id=$2 AND m.state IN ('joined','restored')`, workspaceID, user.ID).Scan(&name)
	if errors.Is(err, pgx.ErrNoRows) {
		return echo.NewHTTPError(http.StatusForbidden, "Active workspace membership is required")
	}
	if err != nil {
		return err
	}
	config, _, err := handlers.samlConfig.Get(ctx.Request().Context(), workspaceID)
	if err != nil {
		return err
	}
	if ctx.Request().Method == http.MethodGet {
		return ctx.JSON(http.StatusOK, webapi.SsoIdentity{WorkspaceId: workspaceID, WorkspaceName: name, ProfileName: config.ProfileName, Enabled: config.active(), Linked: false})
	}
	if !config.active() {
		return echo.NewHTTPError(http.StatusConflict, "SSO is not enabled")
	}
	if !strings.HasPrefix(ctx.Request().Header.Get("Content-Type"), "application/json") {
		return echo.NewHTTPError(http.StatusBadRequest, "JSON request required")
	}
	target, err := handlers.startSAMLFlow(ctx, config, samlPendingLogin{Purpose: "link", UserID: user.ID, SessionID: sessionID(ctx)})
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Could not start SSO; check the HTTPS Site URL and identity-provider configuration")
	}
	return ctx.JSON(http.StatusOK, webapi.SsoStartResponse{AuthorizationUrl: target})
}

func (server *webOpenAPIServer) ListSsoIdentities(ctx echo.Context) error {
	return server.handlers.listSSOIdentities(ctx)
}
func (server *webOpenAPIServer) GetWorkspaceSsoIdentity(ctx echo.Context, _ int) error {
	return server.handlers.workspaceSSOIdentity(ctx)
}
func (server *webOpenAPIServer) LinkWorkspaceSsoIdentity(ctx echo.Context, _ int) error {
	return server.handlers.workspaceSSOIdentity(ctx)
}
func (server *webOpenAPIServer) UnlinkWorkspaceSsoIdentity(ctx echo.Context, _ int) error {
	return server.handlers.workspaceSSOIdentity(ctx)
}
