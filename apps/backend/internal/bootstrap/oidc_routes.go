package bootstrap

import (
	"errors"
	"net/http"

	httpapp "opentoggl/backend/apps/backend/internal/http"
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	instanceadminapplication "opentoggl/backend/apps/backend/internal/instance-admin/application"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/labstack/echo/v4"
	"golang.org/x/oauth2"
)

// newOIDCRoutes registers the instance-level OpenID Connect browser endpoints.
func newOIDCRoutes(handlers *routeHandlers) httpapp.RouteRegistrar {
	return func(server *echo.Echo) {
		server.GET(instanceadminapplication.OIDCLoginPath, handlers.oidcLogin)
		server.GET(instanceadminapplication.OIDCCallbackPath, handlers.oidcCallback)
	}
}

// ssoProviders is the public view the login page uses to render the button.
func (handlers *routeHandlers) ssoProviders(ctx echo.Context) error {
	samlResponseHeaders(ctx)
	config, err := handlers.oidcConfig.GetOIDCConfig(ctx.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	provider := webapi.InstanceOidcProvider{Enabled: config.Enabled, LoginPath: instanceadminapplication.OIDCLoginPath}
	if config.Enabled {
		provider.ProviderName = config.DisplayName()
	}
	return ctx.JSON(http.StatusOK, webapi.SsoProviders{Oidc: provider})
}

func (handlers *routeHandlers) oidcLogin(ctx echo.Context) error {
	config, err := handlers.oidcConfig.GetOIDCConfig(ctx.Request().Context())
	if err != nil || !config.Enabled {
		return ctx.Redirect(http.StatusFound, oidcLoginErrorRedirect+"configuration_changed")
	}
	target, err := handlers.startOIDCFlow(ctx, config)
	if err != nil {
		ctx.Logger().Errorf("oidc login start failed: %v", err)
		return ctx.Redirect(http.StatusFound, oidcLoginErrorRedirect+"unavailable")
	}
	return ctx.Redirect(http.StatusFound, target)
}

type oidcIDTokenClaims struct {
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Zoneinfo      string `json:"zoneinfo"`
}

func (handlers *routeHandlers) oidcCallback(ctx echo.Context) error {
	samlResponseHeaders(ctx)
	fail := func(code string) error { return ctx.Redirect(http.StatusSeeOther, oidcLoginErrorRedirect+code) }
	requestCtx := ctx.Request().Context()

	pending, err := handlers.consumeOIDCFlow(ctx)
	if err != nil {
		return fail("invalid_callback")
	}
	if ctx.QueryParam("error") != "" || ctx.QueryParam("code") == "" {
		return fail("verification_failed")
	}
	config, err := handlers.oidcConfig.GetOIDCConfig(requestCtx)
	if err != nil || !config.Enabled || config.Revision != pending.Revision {
		return fail("configuration_changed")
	}
	provider, err := handlers.oidcProviders.provider(requestCtx, config.IssuerURL)
	if err != nil {
		return fail("unavailable")
	}
	oauth := handlers.oidcOAuthConfig(provider, config, instanceadminapplication.OIDCRedirectURL(handlers.samlBaseURL(ctx)))
	token, err := oauth.Exchange(oidc.ClientContext(requestCtx, handlers.oidcProviders.client), ctx.QueryParam("code"), oauth2.VerifierOption(pending.PKCEVerifier))
	if err != nil {
		ctx.Logger().Warnf("oidc code exchange failed: %v", err)
		return fail("verification_failed")
	}
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok || rawIDToken == "" {
		return fail("verification_failed")
	}
	idToken, err := provider.Verifier(&oidc.Config{ClientID: config.ClientID}).Verify(requestCtx, rawIDToken)
	if err != nil || idToken.Nonce != pending.Nonce {
		return fail("verification_failed")
	}
	var claims oidcIDTokenClaims
	if err := idToken.Claims(&claims); err != nil {
		return fail("verification_failed")
	}
	identity := identityapplication.OIDCIdentity{
		Issuer:        idToken.Issuer,
		Subject:       idToken.Subject,
		Email:         claims.Email,
		EmailVerified: claims.EmailVerified,
		FullName:      claims.Name,
		Timezone:      claims.Zoneinfo,
	}
	policy := identityapplication.OIDCPolicy{AutoProvision: config.AutoProvision, AllowedEmailDomains: config.AllowedEmailDomains}
	result, err := handlers.identityApp.LoginOrProvisionOIDC(requestCtx, identity, policy)
	if err != nil {
		ctx.Logger().Infof("oidc login rejected subject=%s: %v", oidcSubjectFingerprint(idToken.Subject), err)
		return fail(oidcErrorCode(err))
	}
	setSessionCookie(ctx, result.Session.SessionID)
	return ctx.Redirect(http.StatusSeeOther, oidcLoginRedirectAfterAuth)
}

func oidcErrorCode(err error) string {
	switch {
	case errors.Is(err, identityapplication.ErrOIDCAccountNotFound):
		return "account_not_found"
	case errors.Is(err, identityapplication.ErrOIDCEmailNotAllowed):
		return "email_not_allowed"
	case errors.Is(err, identityapplication.ErrOIDCEmailUnverified):
		return "email_unverified"
	case errors.Is(err, identityapplication.ErrSSOBindingTaken):
		return "identity_taken"
	case errors.Is(err, identityapplication.ErrSSOConfigurationChanged):
		return "configuration_changed"
	default:
		return "verification_failed"
	}
}
