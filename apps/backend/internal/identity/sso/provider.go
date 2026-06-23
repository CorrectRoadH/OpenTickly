// Package sso implements instance-level OpenID Connect single sign-on for the
// web app. It wraps the OIDC discovery + OAuth2 authorization-code-with-PKCE
// flow behind a small, transport-agnostic Provider so the HTTP layer only deals
// with opaque login state and verified identity claims.
package sso

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

// ErrProviderUnavailable is returned when the identity provider could not be
// reached for OIDC discovery. The flow is retried on the next request, so a
// transient IdP/network outage does not permanently disable SSO.
var ErrProviderUnavailable = errors.New("sso: identity provider unavailable")

// ErrNonceMismatch indicates the ID token nonce did not match the value bound
// to the login request — a replay/CSRF signal that must abort the login.
var ErrNonceMismatch = errors.New("sso: id token nonce mismatch")

// ErrEmailMissing indicates the verified ID token carried no usable email
// claim, so we cannot map the login to an account.
var ErrEmailMissing = errors.New("sso: id token has no email claim")

// Config is the resolved OIDC configuration for a single identity provider.
type Config struct {
	IssuerURL    string
	ClientID     string
	ClientSecret string
	ProviderName string
}

// AuthRequest carries the per-login secrets that must round-trip through the
// identity provider so the callback can be validated. The HTTP layer persists
// these (keyed by State) in a short-lived store and replays them on callback.
type AuthRequest struct {
	State        string
	Nonce        string
	CodeVerifier string
}

// Claims is the verified subset of the ID token we map onto an account.
type Claims struct {
	Subject       string
	Email         string
	EmailVerified bool
	Name          string
}

// Provider performs OIDC discovery lazily and exposes the two operations the
// HTTP flow needs: building the authorization-redirect URL and exchanging the
// callback code for verified identity claims. It is safe for concurrent use.
type Provider struct {
	cfg Config

	mu       sync.Mutex
	provider *oidc.Provider
	verifier *oidc.IDTokenVerifier
}

// NewProvider returns a Provider without performing any network I/O. Discovery
// happens on first use so the server can boot even when the IdP is briefly
// unreachable.
func NewProvider(cfg Config) *Provider {
	return &Provider{cfg: cfg}
}

// ProviderName is the human label for the login button, defaulting to "SSO".
func (p *Provider) ProviderName() string {
	if name := strings.TrimSpace(p.cfg.ProviderName); name != "" {
		return name
	}
	return "SSO"
}

// NewAuthRequest mints the per-login state, nonce, and PKCE verifier.
func NewAuthRequest() AuthRequest {
	return AuthRequest{
		State:        oauth2.GenerateVerifier(),
		Nonce:        oauth2.GenerateVerifier(),
		CodeVerifier: oauth2.GenerateVerifier(),
	}
}

// AuthCodeURL builds the provider authorization URL for the given login request
// and redirect URI. The redirect URI must exactly match one registered with the
// identity provider.
func (p *Provider) AuthCodeURL(ctx context.Context, req AuthRequest, redirectURL string) (string, error) {
	oauthCfg, err := p.oauthConfig(ctx, redirectURL)
	if err != nil {
		return "", err
	}
	return oauthCfg.AuthCodeURL(
		req.State,
		oidc.Nonce(req.Nonce),
		oauth2.S256ChallengeOption(req.CodeVerifier),
	), nil
}

// Exchange completes the authorization-code flow: it trades the code for tokens
// (proving possession of the PKCE verifier), verifies the ID token signature
// and audience, checks the nonce, and returns the identity claims.
func (p *Provider) Exchange(ctx context.Context, code string, req AuthRequest, redirectURL string) (Claims, error) {
	oauthCfg, err := p.oauthConfig(ctx, redirectURL)
	if err != nil {
		return Claims{}, err
	}

	token, err := oauthCfg.Exchange(ctx, code, oauth2.VerifierOption(req.CodeVerifier))
	if err != nil {
		return Claims{}, fmt.Errorf("sso: code exchange failed: %w", err)
	}

	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok || rawIDToken == "" {
		return Claims{}, errors.New("sso: token response missing id_token")
	}

	idToken, err := p.verifier.Verify(ctx, rawIDToken)
	if err != nil {
		return Claims{}, fmt.Errorf("sso: id token verification failed: %w", err)
	}
	if idToken.Nonce != req.Nonce {
		return Claims{}, ErrNonceMismatch
	}

	var raw struct {
		Email             string `json:"email"`
		EmailVerified     *bool  `json:"email_verified"`
		Name              string `json:"name"`
		PreferredUsername string `json:"preferred_username"`
	}
	if err := idToken.Claims(&raw); err != nil {
		return Claims{}, fmt.Errorf("sso: failed to decode id token claims: %w", err)
	}

	email := strings.TrimSpace(strings.ToLower(raw.Email))
	if email == "" {
		return Claims{}, ErrEmailMissing
	}

	name := strings.TrimSpace(raw.Name)
	if name == "" {
		name = strings.TrimSpace(raw.PreferredUsername)
	}

	return Claims{
		Subject:       idToken.Subject,
		Email:         email,
		EmailVerified: raw.EmailVerified == nil || *raw.EmailVerified,
		Name:          name,
	}, nil
}

// oauthConfig returns an oauth2.Config bound to the given redirect URI, lazily
// performing OIDC discovery and caching the provider/verifier on success.
func (p *Provider) oauthConfig(ctx context.Context, redirectURL string) (*oauth2.Config, error) {
	provider, err := p.ensure(ctx)
	if err != nil {
		return nil, err
	}
	return &oauth2.Config{
		ClientID:     p.cfg.ClientID,
		ClientSecret: p.cfg.ClientSecret,
		Endpoint:     provider.Endpoint(),
		RedirectURL:  redirectURL,
		Scopes:       []string{oidc.ScopeOpenID, "email", "profile"},
	}, nil
}

func (p *Provider) ensure(ctx context.Context) (*oidc.Provider, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.provider != nil {
		return p.provider, nil
	}

	provider, err := oidc.NewProvider(ctx, strings.TrimSuffix(p.cfg.IssuerURL, "/"))
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrProviderUnavailable, err)
	}
	p.provider = provider
	p.verifier = provider.Verifier(&oidc.Config{ClientID: p.cfg.ClientID})
	return provider, nil
}
