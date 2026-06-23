package bootstrap

import (
	"context"
	"encoding/xml"
	"net/http"
	"strconv"
	"strings"
	"time"

	httpapp "opentoggl/backend/apps/backend/internal/http"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	identitysaml "opentoggl/backend/apps/backend/internal/identity/saml"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"

	"github.com/crewjam/saml"
	"github.com/labstack/echo/v4"
)

const (
	// samlLoginStateTTL bounds how long an in-flight SAML login may take from the
	// AuthnRequest until the assertion arrives at the ACS.
	samlLoginStateTTL = 10 * time.Minute
	// samlLoginRedirectAfterAuth is where a successful login lands; the SPA reroutes
	// from "/" to the user's workspace home.
	samlLoginRedirectAfterAuth = "/"
	// samlLoginErrorRedirect is the login page with a flag the SPA surfaces as a toast.
	samlLoginErrorRedirect = "/login?sso_error=1"
)

// samlPendingLogin is the per-login state persisted server-side (keyed by the
// AuthnRequest ID, echoed back as RelayState) between the redirect and the ACS.
// Test marks a dry-run started from the settings page: the ACS reports the
// assertion back to the admin instead of creating a session.
type samlPendingLogin struct {
	WorkspaceID int64
	Test        bool
}

func samlStateKey(requestID string) string {
	return "saml:login:" + requestID
}

// newSAML2Routes registers the workspace-scoped SAML2 single sign-on endpoints as
// plain browser routes: an email-to-workspace resolver, SP metadata, the
// SP-initiated login redirect, and the assertion consumer service.
func newSAML2Routes(handlers *routeHandlers) httpapp.RouteRegistrar {
	return func(server *echo.Echo) {
		server.POST("/auth/sso/resolve", handlers.ssoResolve)
		server.GET("/auth/saml2/metadata/:workspace_id", handlers.saml2Metadata)
		server.GET("/auth/saml2/login/:workspace_id", handlers.saml2Login)
		server.GET("/auth/saml2/test/login/:workspace_id", handlers.saml2TestLogin)
		server.POST("/auth/saml2/acs/:workspace_id", handlers.saml2ACS)
	}
}

type ssoResolveRequest struct {
	Email string `json:"email"`
}

// ssoResolveResponse tells the login page whether the typed email's domain is
// claimed by an enabled workspace, and where to begin its SAML login. It leaks
// nothing about the identity provider beyond a display name.
type ssoResolveResponse struct {
	Found       bool   `json:"found"`
	ProfileName string `json:"profile_name,omitempty"`
	LoginPath   string `json:"login_path,omitempty"`
}

func (handlers *routeHandlers) ssoResolve(ctx echo.Context) error {
	var request ssoResolveRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	domain := emailDomain(request.Email)
	if domain == "" {
		return ctx.JSON(http.StatusOK, ssoResolveResponse{Found: false})
	}
	config, found, err := handlers.samlConfig.ResolveByEmailDomain(ctx.Request().Context(), domain)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	if !found || !config.active() {
		return ctx.JSON(http.StatusOK, ssoResolveResponse{Found: false})
	}
	return ctx.JSON(http.StatusOK, ssoResolveResponse{
		Found:       true,
		ProfileName: config.ProfileName,
		LoginPath:   "/auth/saml2/login/" + strconv.FormatInt(config.WorkspaceID, 10),
	})
}

func (handlers *routeHandlers) saml2Metadata(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	keypair, err := handlers.samlConfig.ServiceProviderKeypair(ctx.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	metadata, err := identitysaml.SPMetadata(keypair, handlers.samlBaseURL(ctx), workspaceID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	xmlBytes, err := xml.MarshalIndent(metadata, "", "  ")
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	return ctx.Blob(http.StatusOK, "application/samlmetadata+xml", xmlBytes)
}

func (handlers *routeHandlers) saml2Login(ctx echo.Context) error {
	requestCtx := ctx.Request().Context()
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.Redirect(http.StatusFound, samlLoginErrorRedirect)
	}
	config, found, err := handlers.samlConfig.Get(requestCtx, workspaceID)
	if err != nil || !found || !config.active() {
		return ctx.Redirect(http.StatusFound, samlLoginErrorRedirect)
	}

	sp, err := handlers.buildSAMLServiceProvider(ctx, config)
	if err != nil {
		return ctx.Redirect(http.StatusFound, samlLoginErrorRedirect)
	}

	authnRequest, err := sp.MakeAuthenticationRequest(
		sp.GetSSOBindingLocation(saml.HTTPRedirectBinding),
		saml.HTTPRedirectBinding,
		saml.HTTPPostBinding,
	)
	if err != nil {
		return ctx.Redirect(http.StatusFound, samlLoginErrorRedirect)
	}

	// Persist the request ID (echoed back as RelayState) so the ACS can confirm we
	// issued this login and validate the assertion's InResponseTo. Single-use.
	if err := handlers.platformHandles.Cache.Set(requestCtx, samlStateKey(authnRequest.ID), samlPendingLogin{WorkspaceID: workspaceID}, samlLoginStateTTL); err != nil {
		return ctx.Redirect(http.StatusFound, samlLoginErrorRedirect)
	}

	redirectURL, err := authnRequest.Redirect(authnRequest.ID, sp)
	if err != nil {
		return ctx.Redirect(http.StatusFound, samlLoginErrorRedirect)
	}
	return ctx.Redirect(http.StatusFound, redirectURL.String())
}

func (handlers *routeHandlers) saml2ACS(ctx echo.Context) error {
	requestCtx := ctx.Request().Context()
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.Redirect(http.StatusFound, samlLoginErrorRedirect)
	}
	// A usable IdP config is enough to validate an assertion; the enabled check is
	// deferred so a dry-run test works before SSO is switched on.
	config, found, err := handlers.samlConfig.Get(requestCtx, workspaceID)
	if err != nil || !found || !config.providerConfig().Usable() {
		return ctx.Redirect(http.StatusFound, samlLoginErrorRedirect)
	}

	sp, err := handlers.buildSAMLServiceProvider(ctx, config)
	if err != nil {
		return ctx.Redirect(http.StatusFound, samlLoginErrorRedirect)
	}

	if err := ctx.Request().ParseForm(); err != nil {
		return ctx.Redirect(http.StatusFound, samlLoginErrorRedirect)
	}
	relayState := ctx.Request().Form.Get("RelayState")
	if relayState == "" {
		return ctx.Redirect(http.StatusFound, samlLoginErrorRedirect)
	}

	// The RelayState must match a login we issued for this workspace. Consuming it
	// single-use blocks assertion replay.
	var pending samlPendingLogin
	foundState, err := handlers.platformHandles.Cache.Get(requestCtx, samlStateKey(relayState), &pending)
	if err != nil || !foundState || pending.WorkspaceID != workspaceID {
		return ctx.Redirect(http.StatusFound, samlLoginErrorRedirect)
	}
	handlers.platformHandles.Cache.Del(requestCtx, samlStateKey(relayState))

	assertion, parseErr := sp.ParseResponse(ctx.Request(), []string{relayState})

	// Dry-run test: report the result to the admin instead of logging in.
	if pending.Test {
		return handlers.renderSAMLTestResult(ctx, config, assertion, parseErr)
	}

	if parseErr != nil || !config.active() {
		return ctx.Redirect(http.StatusFound, samlLoginErrorRedirect)
	}

	email := identitysaml.EmailFromAssertion(assertion)
	if email == "" {
		return ctx.Redirect(http.StatusFound, samlLoginErrorRedirect)
	}
	// SECURITY: the asserted email's domain must match the workspace's claimed
	// domain. Because LoginOrProvisionSSO matches accounts by email, a workspace's
	// IdP must not be able to assert emails outside its claimed domain.
	if emailDomain(email) != strings.ToLower(strings.TrimSpace(config.EmailDomain)) {
		return ctx.Redirect(http.StatusFound, samlLoginErrorRedirect)
	}

	result, err := handlers.identityApp.LoginOrProvisionSSO(requestCtx, identityapplication.SSOIdentity{
		Email:    email,
		FullName: identitysaml.NameFromAssertion(assertion),
	})
	if err != nil {
		return ctx.Redirect(http.StatusFound, samlLoginErrorRedirect)
	}

	if err := handlers.joinWorkspaceAfterSSO(requestCtx, workspaceID, result.Session.User.ID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	setSessionCookie(ctx, result.Session.SessionID)
	return ctx.Redirect(http.StatusFound, samlLoginRedirectAfterAuth)
}

// joinWorkspaceAfterSSO joins the authenticated user to the workspace (and its
// organization) as a member, then seeds a session home if the user has none yet.
func (handlers *routeHandlers) joinWorkspaceAfterSSO(ctx context.Context, workspaceID int64, userID int64) error {
	workspace, err := handlers.tenantApp.GetWorkspace(ctx, tenantdomain.WorkspaceID(workspaceID))
	if err != nil {
		return err
	}
	organizationID := int64(workspace.OrganizationID)

	if _, err := handlers.membershipApp.EnsureOrganizationMember(ctx, membershipapplication.EnsureOrganizationMemberCommand{
		OrganizationID: organizationID,
		UserID:         userID,
		Role:           membershipdomain.OrganizationRoleMember,
	}); err != nil {
		return err
	}
	if _, err := handlers.membershipApp.EnsureWorkspaceMember(ctx, membershipapplication.EnsureWorkspaceMemberCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Role:        membershipdomain.WorkspaceRoleMember,
	}); err != nil {
		return err
	}

	_, _, hasHome, err := handlers.userHomes.FindByUserID(ctx, userID)
	if err != nil {
		return err
	}
	if !hasHome {
		return handlers.userHomes.Save(ctx, userID, organizationID, workspaceID)
	}
	return nil
}

// buildSAMLServiceProvider loads the SP keypair and asks the Manager for the
// workspace's ServiceProvider (cached per config fingerprint).
func (handlers *routeHandlers) buildSAMLServiceProvider(ctx echo.Context, config samlWorkspaceConfig) (*saml.ServiceProvider, error) {
	keypair, err := handlers.samlConfig.ServiceProviderKeypair(ctx.Request().Context())
	if err != nil {
		return nil, err
	}
	return handlers.samlManager.ServiceProvider(ctx.Request().Context(), identitysaml.SPParams{
		Keypair:     keypair,
		BaseURL:     handlers.samlBaseURL(ctx),
		WorkspaceID: config.WorkspaceID,
		Config:      config.providerConfig(),
	})
}

func (handlers *routeHandlers) samlBaseURL(ctx echo.Context) string {
	base := strings.TrimRight(handlers.siteURL.ReadSiteURL(ctx.Request().Context()), "/")
	if base == "" {
		base = ctx.Scheme() + "://" + ctx.Request().Host
	}
	return base
}

func emailDomain(email string) string {
	at := strings.LastIndex(email, "@")
	if at < 0 || at == len(email)-1 {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(email[at+1:]))
}
