package bootstrap

import (
	"context"
	"encoding/xml"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	httpapp "opentoggl/backend/apps/backend/internal/http"
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
// Purpose separates login, explicit linking, and an administrator dry-run.
type samlPendingLogin struct {
	WorkspaceID int64
	Revision    int64
	BrowserHash string
	Purpose     string
	UserID      int64
	SessionID   string
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
// claimed by an enabled workspace, and where to begin its SAML login. It includes
// the workspace and actual IdP host for confirmation before navigation.
type ssoResolveResponse struct {
	Found         bool   `json:"found"`
	ProfileName   string `json:"profile_name,omitempty"`
	WorkspaceName string `json:"workspace_name,omitempty"`
	IDPHost       string `json:"idp_host,omitempty"`
	LoginPath     string `json:"login_path,omitempty"`
}

func (handlers *routeHandlers) ssoResolve(ctx echo.Context) error {
	samlResponseHeaders(ctx)
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
	sp, err := handlers.buildSAMLServiceProvider(ctx, config)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadGateway, "SSO provider unavailable")
	}
	destination, err := url.Parse(sp.GetSSOBindingLocation(saml.HTTPRedirectBinding))
	if err != nil || destination.Scheme != "https" {
		return echo.NewHTTPError(http.StatusBadGateway, "Invalid SSO provider")
	}
	var workspaceName string
	if err := handlers.pool.QueryRow(ctx.Request().Context(), `SELECT name FROM tenant_workspaces WHERE id=$1`, config.WorkspaceID).Scan(&workspaceName); err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, ssoResolveResponse{
		WorkspaceName: workspaceName, IDPHost: destination.Host,
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
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.Redirect(http.StatusFound, samlLoginErrorRedirect)
	}
	config, found, err := handlers.samlConfig.Get(ctx.Request().Context(), workspaceID)
	if err != nil || !found || !config.active() {
		return ctx.Redirect(http.StatusFound, samlLoginErrorRedirect)
	}
	target, err := handlers.startSAMLFlow(ctx, config, samlPendingLogin{Purpose: "login"})
	if err != nil {
		return ctx.Redirect(http.StatusFound, samlLoginErrorRedirect)
	}
	return ctx.Redirect(http.StatusFound, target)
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
	return strings.TrimRight(handlers.siteURL.ReadSiteURL(ctx.Request().Context()), "/")
}

func emailDomain(email string) string {
	at := strings.LastIndex(email, "@")
	if at < 0 || at == len(email)-1 {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(email[at+1:]))
}
