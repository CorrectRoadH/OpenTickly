package bootstrap

import (
	"net/http"
	"strings"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	identitysaml "opentoggl/backend/apps/backend/internal/identity/saml"
	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"

	"github.com/labstack/echo/v4"
)

func (handlers *routeHandlers) getWorkspaceSsoConfig(ctx echo.Context) error {
	workspaceID, err := handlers.authorizeWorkspaceAdmin(ctx)
	if err != nil {
		return err
	}
	config, _, getErr := handlers.samlConfig.Get(ctx.Request().Context(), workspaceID)
	if getErr != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(getErr)
	}
	return ctx.JSON(http.StatusOK, handlers.ssoConfigView(ctx, config))
}

func (handlers *routeHandlers) updateWorkspaceSsoConfig(ctx echo.Context) error {
	workspaceID, err := handlers.authorizeWorkspaceAdmin(ctx)
	if err != nil {
		return err
	}

	var request webapi.WorkspaceSsoConfigUpdate
	if bindErr := ctx.Bind(&request); bindErr != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	config := samlWorkspaceConfig{
		WorkspaceID:    workspaceID,
		Enabled:        request.Enabled,
		ProfileName:    strings.TrimSpace(request.ProfileName),
		EmailDomain:    strings.ToLower(strings.TrimSpace(request.EmailDomain)),
		IDPMetadataURL: strings.TrimSpace(request.IdpMetadataUrl),
		IDPEntityID:    strings.TrimSpace(request.IdpEntityId),
		IDPSSOURL:      strings.TrimSpace(request.IdpSsoUrl),
		IDPCertificate: strings.TrimSpace(request.IdpCertificate),
	}
	if validationErr := validateWorkspaceSsoConfigForSave(config); validationErr != nil {
		return validationErr
	}
	if upsertErr := handlers.samlConfig.Upsert(ctx.Request().Context(), config); upsertErr != nil {
		if strings.Contains(upsertErr.Error(), "tenant_workspace_sso_config_domain_key") {
			return echo.NewHTTPError(http.StatusConflict, "This email domain is already claimed by another workspace.")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(upsertErr)
	}

	saved, _, getErr := handlers.samlConfig.Get(ctx.Request().Context(), workspaceID)
	if getErr != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(getErr)
	}
	return ctx.JSON(http.StatusOK, handlers.ssoConfigView(ctx, saved))
}

// authorizeWorkspaceAdmin enforces an authenticated session whose current
// workspace matches the path and whose member role can administer it.
func (handlers *routeHandlers) authorizeWorkspaceAdmin(ctx echo.Context) (int64, error) {
	if response, ok := handlers.authorizeSession(ctx); !ok {
		return 0, response
	}
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return 0, ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handlers.requireCurrentSessionWorkspace(ctx, workspaceID); err != nil {
		return 0, err
	}

	user, err := handlers.identityApp.ResolveCurrentUser(ctx.Request().Context(), sessionID(ctx))
	if err != nil {
		return 0, echo.NewHTTPError(http.StatusForbidden, "Forbidden").SetInternal(err)
	}
	member, found, err := handlers.membershipApp.FindWorkspaceMemberByUserID(ctx.Request().Context(), workspaceID, user.ID)
	if err != nil {
		return 0, echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	if !found || member.Role != membershipdomain.WorkspaceRoleAdmin {
		return 0, echo.NewHTTPError(http.StatusForbidden, "Forbidden")
	}
	return workspaceID, nil
}

// ssoConfigView projects the persisted config plus the generated Service Provider
// integration details (Entity ID, ACS URL, Sign-in URL, metadata URL) the admin
// pastes into their identity provider.
func (handlers *routeHandlers) ssoConfigView(ctx echo.Context, config samlWorkspaceConfig) webapi.WorkspaceSsoConfig {
	base := handlers.samlBaseURL(ctx)
	return webapi.WorkspaceSsoConfig{
		Enabled:        config.Enabled,
		ProfileName:    config.ProfileName,
		EmailDomain:    config.EmailDomain,
		IdpMetadataUrl: config.IDPMetadataURL,
		IdpEntityId:    config.IDPEntityID,
		IdpSsoUrl:      config.IDPSSOURL,
		IdpCertificate: config.IDPCertificate,
		SpEntityId:     identitysaml.MetadataURLFor(base, config.WorkspaceID),
		AcsUrl:         identitysaml.AcsURLFor(base, config.WorkspaceID),
		SignInUrl:      identitysaml.SignInURLFor(base, config.WorkspaceID),
		MetadataUrl:    identitysaml.MetadataURLFor(base, config.WorkspaceID),
	}
}
