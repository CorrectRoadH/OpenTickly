package bootstrap

import (
	"net/http"
	"strings"
	"time"

	httpapp "opentoggl/backend/apps/backend/internal/http"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	"opentoggl/backend/apps/backend/internal/identity/sso"

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
	if handlers.ssoProvider == nil {
		return ctx.JSON(http.StatusOK, ssoInfoResponse{Enabled: false})
	}
	return ctx.JSON(http.StatusOK, ssoInfoResponse{
		Enabled:      true,
		ProviderName: handlers.ssoProvider.ProviderName(),
	})
}

func (handlers *routeHandlers) ssoStart(ctx echo.Context) error {
	if handlers.ssoProvider == nil {
		return ctx.Redirect(http.StatusFound, ssoLoginErrorRedirect)
	}

	request := sso.NewAuthRequest()
	redirectURL := handlers.ssoRedirectURL(ctx)

	authURL, err := handlers.ssoProvider.AuthCodeURL(ctx.Request().Context(), request, redirectURL)
	if err != nil {
		handlers.platformHandles.Cache.Del(ctx.Request().Context(), ssoStateKey(request.State))
		return ctx.Redirect(http.StatusFound, ssoLoginErrorRedirect)
	}

	pending := ssoPendingLogin{Auth: request, RedirectURL: redirectURL}
	if err := handlers.platformHandles.Cache.Set(ctx.Request().Context(), ssoStateKey(request.State), pending, ssoLoginStateTTL); err != nil {
		return ctx.Redirect(http.StatusFound, ssoLoginErrorRedirect)
	}

	return ctx.Redirect(http.StatusFound, authURL)
}

func (handlers *routeHandlers) ssoCallback(ctx echo.Context) error {
	if handlers.ssoProvider == nil {
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

	requestCtx := ctx.Request().Context()
	var pending ssoPendingLogin
	found, err := handlers.platformHandles.Cache.Get(requestCtx, ssoStateKey(state), &pending)
	if err != nil || !found {
		return ctx.Redirect(http.StatusFound, ssoLoginErrorRedirect)
	}
	// Single-use: consume the state before exchanging so a replay cannot reuse it.
	handlers.platformHandles.Cache.Del(requestCtx, ssoStateKey(state))

	claims, err := handlers.ssoProvider.Exchange(requestCtx, code, pending.Auth, pending.RedirectURL)
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

// ssoRedirectURL resolves the OAuth2 redirect URI. A configured value wins;
// otherwise it is derived from the admin site URL, then the inbound request.
// The result must exactly match a redirect URI registered with the provider.
func (handlers *routeHandlers) ssoRedirectURL(ctx echo.Context) string {
	if configured := strings.TrimSpace(handlers.ssoConfig.RedirectURL); configured != "" {
		return configured
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
