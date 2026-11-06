package bootstrap

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"
	"sync"
	"time"

	instanceadminapplication "opentoggl/backend/apps/backend/internal/instance-admin/application"
	instanceadmindomain "opentoggl/backend/apps/backend/internal/instance-admin/domain"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/labstack/echo/v4"
	"golang.org/x/oauth2"
)

const (
	// oidcLoginStateTTL bounds an in-flight login between the redirect to the
	// provider and the callback.
	oidcLoginStateTTL          = 10 * time.Minute
	oidcBrowserCookie          = "__Secure-opentickly_oidc"
	oidcLoginErrorRedirect     = "/login?sso_error="
	oidcLoginRedirectAfterAuth = "/"
)

// oidcPendingLogin is the server-side state keyed by the random `state` value.
type oidcPendingLogin struct {
	Nonce        string
	PKCEVerifier string
	BrowserHash  string
	Revision     int64
}

func oidcStateKey(state string) string { return "oidc:login:" + state }

// oidcProviderCache memoises go-oidc providers per issuer so JWKS and metadata
// are fetched once, not on every login. It also serves the admin discovery test.
type oidcProviderCache struct {
	mu        sync.Mutex
	providers map[string]*oidc.Provider
	client    *http.Client
}

func newOIDCProviderCache() *oidcProviderCache {
	return &oidcProviderCache{
		providers: map[string]*oidc.Provider{},
		client:    &http.Client{Timeout: 10 * time.Second},
	}
}

func (cache *oidcProviderCache) provider(ctx context.Context, issuer string) (*oidc.Provider, error) {
	cache.mu.Lock()
	defer cache.mu.Unlock()
	if provider, ok := cache.providers[issuer]; ok {
		return provider, nil
	}
	provider, err := oidc.NewProvider(oidc.ClientContext(ctx, cache.client), issuer)
	if err != nil {
		return nil, err
	}
	cache.providers[issuer] = provider
	return provider, nil
}

// Discover implements instanceadminapplication.OIDCDiscoverer without caching
// so a corrected issuer is re-fetched on every admin test.
func (cache *oidcProviderCache) Discover(ctx context.Context, issuer string) (instanceadminapplication.OIDCDiscovery, error) {
	provider, err := oidc.NewProvider(oidc.ClientContext(ctx, cache.client), issuer)
	if err != nil {
		return instanceadminapplication.OIDCDiscovery{}, err
	}
	var claims struct {
		Issuer  string `json:"issuer"`
		AuthURL string `json:"authorization_endpoint"`
		Token   string `json:"token_endpoint"`
		JWKS    string `json:"jwks_uri"`
	}
	if err := provider.Claims(&claims); err != nil {
		return instanceadminapplication.OIDCDiscovery{}, err
	}
	if claims.AuthURL == "" || claims.Token == "" || claims.JWKS == "" {
		return instanceadminapplication.OIDCDiscovery{}, errors.New("provider metadata is missing the authorization, token or jwks endpoint")
	}
	return instanceadminapplication.OIDCDiscovery{Issuer: claims.Issuer, AuthorizationEndpoint: claims.AuthURL, TokenEndpoint: claims.Token, JWKSURI: claims.JWKS}, nil
}

func (handlers *routeHandlers) oidcOAuthConfig(provider *oidc.Provider, config instanceadmindomain.OIDCConfig, redirectURL string) oauth2.Config {
	return oauth2.Config{
		ClientID:     config.ClientID,
		ClientSecret: config.ClientSecret,
		Endpoint:     provider.Endpoint(),
		RedirectURL:  redirectURL,
		Scopes:       []string{oidc.ScopeOpenID, "email", "profile"},
	}
}

// startOIDCFlow stores the pending login and returns the provider's
// authorization URL. The browser secret cookie binds the callback to this
// browser, like the SAML flow.
func (handlers *routeHandlers) startOIDCFlow(ctx echo.Context, config instanceadmindomain.OIDCConfig) (string, error) {
	samlResponseHeaders(ctx)
	redirectURL := instanceadminapplication.OIDCRedirectURL(handlers.samlBaseURL(ctx))
	if !strings.HasPrefix(redirectURL, "https://") {
		return "", errors.New("site url must be https")
	}
	provider, err := handlers.oidcProviders.provider(ctx.Request().Context(), config.IssuerURL)
	if err != nil {
		return "", err
	}
	state, err := randomToken()
	if err != nil {
		return "", err
	}
	nonce, err := randomToken()
	if err != nil {
		return "", err
	}
	browser, err := randomToken()
	if err != nil {
		return "", err
	}
	verifier := oauth2.GenerateVerifier()
	pending := oidcPendingLogin{Nonce: nonce, PKCEVerifier: verifier, BrowserHash: samlBrowserHash(browser), Revision: config.Revision}
	if err := handlers.platformHandles.Cache.Set(ctx.Request().Context(), oidcStateKey(state), pending, oidcLoginStateTTL); err != nil {
		return "", err
	}
	setOIDCBrowserCookie(ctx, browser, int(oidcLoginStateTTL.Seconds()))
	oauth := handlers.oidcOAuthConfig(provider, config, redirectURL)
	return oauth.AuthCodeURL(state, oidc.Nonce(nonce), oauth2.S256ChallengeOption(verifier)), nil
}

// consumeOIDCFlow validates the callback's state against the browser cookie and
// atomically consumes the Redis entry so a code can be exchanged only once.
func (handlers *routeHandlers) consumeOIDCFlow(ctx echo.Context) (oidcPendingLogin, error) {
	var pending oidcPendingLogin
	state := ctx.QueryParam("state")
	if state == "" || len(state) > 128 {
		return pending, errors.New("invalid OIDC state")
	}
	cookie, err := ctx.Request().Cookie(oidcBrowserCookie)
	if err != nil || len(cookie.Value) != 64 {
		return pending, errors.New("missing OIDC browser binding")
	}
	found, err := handlers.platformHandles.Cache.Consume(ctx.Request().Context(), oidcStateKey(state), &pending)
	if err != nil {
		return pending, err
	}
	if !found {
		return pending, errors.New("OIDC state expired or already consumed")
	}
	if subtle.ConstantTimeCompare([]byte(pending.BrowserHash), []byte(samlBrowserHash(cookie.Value))) != 1 {
		return pending, errors.New("OIDC browser binding mismatch")
	}
	setOIDCBrowserCookie(ctx, "", -1)
	return pending, nil
}

func setOIDCBrowserCookie(ctx echo.Context, value string, maxAge int) {
	ctx.SetCookie(&http.Cookie{Name: oidcBrowserCookie, Value: value, Path: "/auth/oidc/", HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode, MaxAge: maxAge})
}

func randomToken() (string, error) {
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return "", err
	}
	return hex.EncodeToString(secret), nil
}

// oidcSubjectFingerprint is only used for logging; subjects themselves are stored.
func oidcSubjectFingerprint(subject string) string {
	sum := sha256.Sum256([]byte(subject))
	return base64.RawURLEncoding.EncodeToString(sum[:8])
}
