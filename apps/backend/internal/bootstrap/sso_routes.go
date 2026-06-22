package bootstrap

import (
	"context"
	"net/http"
	"strings"
	"time"

	httpapp "opentoggl/backend/apps/backend/internal/http"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	"opentoggl/backend/apps/backend/internal/identity/sso"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
)

// ssoLoginStateTTL bounds how long an in-flight OIDC login may take from the
// redirect to the provider until the callback returns.
const ssoLoginStateTTL = 10 * time.Minute

// ssoLoginRedirectAfterAuth is where a successful SSO login lands. The SPA
// reroutes from "/" to the user's workspace home.
const ssoLoginRedirectAfterAuth = "/"

// ssoLoginErrorRedirect is the login page with a flag the SPA surfaces as a toast.
const ssoLoginErrorRedirect = "/login?sso_error=1"

// ssoPendingLogin is the per-login state persisted (server-side, keyed by the
// opaque OAuth2 state) between the authorization redirect and the callback.
type ssoPendingLogin struct {
	Auth        sso.AuthRequest
	RedirectURL string
}

// ssoSettings is the runtime SSO configuration read from instance_admin_config.
type ssoSettings struct {
	Enabled     bool
	RedirectURL string
	Provider    sso.Config
}

// active reports whether SSO should serve logins: enabled by the admin AND
// minimally configured (issuer + client id + secret present).
func (s ssoSettings) active() bool {
	return s.Enabled && s.Provider.Usable()
}

// ssoConfigReaderFromDB reads the runtime SSO settings from the singleton
// instance_admin_config row. It mirrors siteURLReaderFromDB: a focused reader so
// the SSO routes don't depend on the whole instance-admin service.
type ssoConfigReaderFromDB struct {
	pool *pgxpool.Pool
}

func (r *ssoConfigReaderFromDB) Read(ctx context.Context) ssoSettings {
	var s ssoSettings
	_ = r.pool.QueryRow(ctx,
		`SELECT sso_enabled, sso_provider_name, sso_issuer_url, sso_client_id, sso_client_secret, sso_redirect_url
		 FROM instance_admin_config WHERE id = 1`,
	).Scan(&s.Enabled, &s.Provider.ProviderName, &s.Provider.IssuerURL, &s.Provider.ClientID, &s.Provider.ClientSecret, &s.RedirectURL)
	return s
}

// newSSORoutes registers the instance-level OIDC single sign-on endpoints as
// plain browser routes (not part of the typed web API): an unauthenticated
// capability probe, the authorization redirect, and the provider callback.
func newSSORoutes(handlers *routeHandlers) httpapp.RouteRegistrar {
	return func(server *echo.Echo) {
		server.GET("/auth/sso/info", handlers.ssoInfo)
		server.GET("/auth/sso/start", handlers.ssoStart)
		server.GET("/auth/sso/callback", handlers.ssoCallback)
	}
}

// ssoInfoResponse tells the login page whether to show the SSO button and what
// to label it. It is intentionally unauthenticated and leaks no secrets.
type ssoInfoResponse struct {
	Enabled      bool   `json:"enabled"`
	ProviderName string `json:"provider_name,omitempty"`
}

func (handlers *routeHandlers) ssoInfo(ctx echo.Context) error {
	settings := handlers.ssoConfigReader.Read(ctx.Request().Context())
	if !settings.active() {
		return ctx.JSON(http.StatusOK, ssoInfoResponse{Enabled: false})
	}
	return ctx.JSON(http.StatusOK, ssoInfoResponse{
		Enabled:      true,
		ProviderName: handlers.ssoManager.Provider(settings.Provider).ProviderName(),
	})
}

func (handlers *routeHandlers) ssoStart(ctx echo.Context) error {
	requestCtx := ctx.Request().Context()
	settings := handlers.ssoConfigReader.Read(requestCtx)
	if !settings.active() {
		return ctx.Redirect(http.StatusFound, ssoLoginErrorRedirect)
	}

	provider := handlers.ssoManager.Provider(settings.Provider)
	request := sso.NewAuthRequest()
	redirectURL := handlers.ssoRedirectURL(ctx, settings.RedirectURL)

	authURL, err := provider.AuthCodeURL(requestCtx, request, redirectURL)
	if err != nil {
		return ctx.Redirect(http.StatusFound, ssoLoginErrorRedirect)
	}

	pending := ssoPendingLogin{Auth: request, RedirectURL: redirectURL}
	if err := handlers.platformHandles.Cache.Set(requestCtx, ssoStateKey(request.State), pending, ssoLoginStateTTL); err != nil {
		return ctx.Redirect(http.StatusFound, ssoLoginErrorRedirect)
	}

	return ctx.Redirect(http.StatusFound, authURL)
}

func (handlers *routeHandlers) ssoCallback(ctx echo.Context) error {
	requestCtx := ctx.Request().Context()
	settings := handlers.ssoConfigReader.Read(requestCtx)
	if !settings.active() {
		return ctx.Redirect(http.StatusFound, ssoLoginErrorRedirect)
	}
	if providerError := ctx.QueryParam("error"); providerError != "" {
		return ctx.Redirect(http.StatusFound, ssoLoginErrorRedirect)
	}

	state := ctx.QueryParam("state")
	code := ctx.QueryParam("code")
	if state == "" || code == "" {
		return ctx.Redirect(http.StatusFound, ssoLoginErrorRedirect)
	}

	var pending ssoPendingLogin
	found, err := handlers.platformHandles.Cache.Get(requestCtx, ssoStateKey(state), &pending)
	if err != nil || !found {
		return ctx.Redirect(http.StatusFound, ssoLoginErrorRedirect)
	}
	// Single-use: consume the state before exchanging so a replay cannot reuse it.
	handlers.platformHandles.Cache.Del(requestCtx, ssoStateKey(state))

	claims, err := handlers.ssoManager.Provider(settings.Provider).Exchange(requestCtx, code, pending.Auth, pending.RedirectURL)
	if err != nil {
		return ctx.Redirect(http.StatusFound, ssoLoginErrorRedirect)
	}

	result, err := handlers.identityApp.LoginOrProvisionSSO(requestCtx, identitySSOFromClaims(claims))
	if err != nil {
		return ctx.Redirect(http.StatusFound, ssoLoginErrorRedirect)
	}
	if result.Provisioned {
		if err := maybeBootstrapFirstUser(requestCtx, handlers.pool, claims.Email); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
		}
	}

	setSessionCookie(ctx, result.Session.SessionID)
	return ctx.Redirect(http.StatusFound, ssoLoginRedirectAfterAuth)
}

func identitySSOFromClaims(claims sso.Claims) identityapplication.SSOIdentity {
	return identityapplication.SSOIdentity{Email: claims.Email, FullName: claims.Name}
}

// ssoRedirectURL resolves the OAuth2 redirect URI. A value configured in the
// admin UI wins; otherwise it is derived from the admin site URL, then the
// inbound request. The result must exactly match a redirect URI registered with
// the identity provider.
func (handlers *routeHandlers) ssoRedirectURL(ctx echo.Context, configured string) string {
	if trimmed := strings.TrimSpace(configured); trimmed != "" {
		return trimmed
	}

	base := strings.TrimRight(handlers.ssoSiteURL.ReadSiteURL(ctx.Request().Context()), "/")
	if base == "" {
		base = ctx.Scheme() + "://" + ctx.Request().Host
	}
	return base + "/auth/sso/callback"
}

func ssoStateKey(state string) string {
	return "sso:login:" + state
}
