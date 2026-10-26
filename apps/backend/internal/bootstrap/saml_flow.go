package bootstrap

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"

	"github.com/crewjam/saml"
	"github.com/labstack/echo/v4"
	identitysaml "opentoggl/backend/apps/backend/internal/identity/saml"
)

const samlBrowserCookie = "__Secure-opentickly_saml"

func samlBrowserHash(value string) string {
	hash := sha256.Sum256([]byte(value))
	return hex.EncodeToString(hash[:])
}

func setSAMLBrowserCookie(ctx echo.Context, value string, maxAge int) {
	ctx.SetCookie(&http.Cookie{Name: samlBrowserCookie, Value: value, Path: "/auth/saml2/", HttpOnly: true, Secure: true, SameSite: http.SameSiteNoneMode, MaxAge: maxAge})
}

func samlResponseHeaders(ctx echo.Context) {
	ctx.Response().Header().Set("Cache-Control", "no-store")
	ctx.Response().Header().Set("Referrer-Policy", "no-referrer")
}

func (handlers *routeHandlers) startSAMLFlow(ctx echo.Context, config samlWorkspaceConfig, pending samlPendingLogin) (string, error) {
	samlResponseHeaders(ctx)
	if err := identitysaml.ValidateHTTPSURL(handlers.samlBaseURL(ctx)); err != nil {
		return "", err
	}
	sp, err := handlers.buildSAMLServiceProvider(ctx, config)
	if err != nil {
		return "", err
	}
	location := sp.GetSSOBindingLocation(saml.HTTPRedirectBinding)
	if err := identitysaml.ValidateHTTPSURL(location); err != nil {
		return "", err
	}
	request, err := sp.MakeAuthenticationRequest(location, saml.HTTPRedirectBinding, saml.HTTPPostBinding)
	if err != nil {
		return "", err
	}
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return "", err
	}
	browser := hex.EncodeToString(secret)
	pending.WorkspaceID = config.WorkspaceID
	pending.Revision = config.Revision
	pending.BrowserHash = samlBrowserHash(browser)
	target, err := request.Redirect(request.ID, sp)
	if err != nil {
		return "", err
	}
	if err := handlers.platformHandles.Cache.Set(ctx.Request().Context(), samlStateKey(request.ID), pending, samlLoginStateTTL); err != nil {
		return "", err
	}
	setSAMLBrowserCookie(ctx, browser, 600)
	return target.String(), nil
}

func (handlers *routeHandlers) consumeSAMLFlow(ctx echo.Context, workspaceID int64) (samlPendingLogin, string, error) {
	var pending samlPendingLogin
	r := ctx.Request()
	// Artifact binding can make crewjam send an additional HTTP request. We only
	// support signed POST responses; never let query parameters select a binding.
	if r.URL.RawQuery != "" || !strings.HasPrefix(r.Header.Get("Content-Type"), "application/x-www-form-urlencoded") {
		return pending, "", errors.New("invalid SAML POST")
	}
	r.Body = http.MaxBytesReader(ctx.Response(), r.Body, 1<<20)
	if err := r.ParseForm(); err != nil {
		return pending, "", err
	}
	if _, artifact := r.PostForm["SAMLart"]; artifact {
		return pending, "", errors.New("SAML artifacts are unsupported")
	}
	if len(r.PostForm["RelayState"]) != 1 || len(r.PostForm["SAMLResponse"]) != 1 || r.PostForm.Get("SAMLResponse") == "" {
		return pending, "", errors.New("invalid SAML parameters")
	}
	relay := r.PostForm.Get("RelayState")
	if relay == "" || len(relay) > 256 {
		return pending, "", errors.New("invalid SAML state")
	}
	cookie, err := r.Cookie(samlBrowserCookie)
	if err != nil || len(cookie.Value) != 64 {
		return pending, "", errors.New("missing SAML browser binding")
	}
	ctxReq := r.Context()
	found, err := handlers.platformHandles.Cache.Get(ctxReq, samlStateKey(relay), &pending)
	if err != nil {
		return pending, "", err
	}
	match := found && pending.WorkspaceID == workspaceID && subtle.ConstantTimeCompare([]byte(pending.BrowserHash), []byte(samlBrowserHash(cookie.Value))) == 1
	if !match {
		return pending, "", errors.New("SAML browser binding mismatch")
	}
	// GET above only validates the browser. GETDEL is the authoritative, atomic
	// consume; a concurrent callback must fail even if both preliminary reads hit.
	found, err = handlers.platformHandles.Cache.Consume(ctxReq, samlStateKey(relay), &pending)
	if err != nil {
		return pending, "", err
	}
	if !found {
		return pending, "", errors.New("SAML state already consumed")
	}
	setSAMLBrowserCookie(ctx, "", -1)
	if pending.Purpose != "login" && pending.Purpose != "link" && pending.Purpose != "test" {
		return pending, "", errors.New("invalid SAML purpose")
	}
	return pending, relay, nil
}
