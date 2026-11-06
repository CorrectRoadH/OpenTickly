package application

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"opentoggl/backend/apps/backend/internal/instance-admin/domain"
)

// ErrOIDCDiscoveryUnavailable is returned when no discoverer was wired.
var ErrOIDCDiscoveryUnavailable = errors.New("instance-admin: provider discovery is not available")

// OIDCConfigUpdate is the write model for the instance OIDC provider. A nil
// ClientSecret keeps the stored secret; the revision is an optimistic lock.
type OIDCConfigUpdate struct {
	Revision            int64
	Enabled             bool
	ProviderName        string
	IssuerURL           string
	ClientID            string
	ClientSecret        *string
	AllowedEmailDomains []string
	AutoProvision       bool
}

// GetOIDCConfig returns the stored provider configuration (secret included; the
// transport decides what to expose).
func (s *Service) GetOIDCConfig(ctx context.Context) (domain.OIDCConfig, error) {
	cfg, err := s.oidcConfig.GetOIDCConfig(ctx)
	if err != nil {
		return domain.OIDCConfig{}, fmt.Errorf("instance-admin get oidc config: %w", err)
	}
	return cfg, nil
}

// UpdateOIDCConfig validates and saves the provider configuration.
func (s *Service) UpdateOIDCConfig(ctx context.Context, update OIDCConfigUpdate) (domain.OIDCConfig, error) {
	current, err := s.oidcConfig.GetOIDCConfig(ctx)
	if err != nil {
		return domain.OIDCConfig{}, fmt.Errorf("instance-admin update oidc config: %w", err)
	}
	next := domain.OIDCConfig{
		Enabled:             update.Enabled,
		ProviderName:        update.ProviderName,
		IssuerURL:           update.IssuerURL,
		ClientID:            update.ClientID,
		ClientSecret:        current.ClientSecret,
		AllowedEmailDomains: update.AllowedEmailDomains,
		AutoProvision:       update.AutoProvision,
		Revision:            update.Revision,
	}
	if update.ClientSecret != nil && strings.TrimSpace(*update.ClientSecret) != "" {
		next.ClientSecret = *update.ClientSecret
	}
	next = next.Normalize()

	instance, err := s.instanceConfig.GetConfig(ctx)
	if err != nil {
		return domain.OIDCConfig{}, fmt.Errorf("instance-admin update oidc config site url: %w", err)
	}
	if err := next.Validate(instance.SiteURL); err != nil {
		return domain.OIDCConfig{}, err
	}
	next.UpdatedAt = s.clock.Now()
	saved, err := s.oidcConfig.SaveOIDCConfig(ctx, next)
	if err != nil {
		if errors.Is(err, domain.ErrOIDCConfigConflict) {
			return domain.OIDCConfig{}, err
		}
		return domain.OIDCConfig{}, fmt.Errorf("instance-admin save oidc config: %w", err)
	}
	return saved, nil
}

// DiscoverOIDCProvider fetches the issuer's metadata so the admin can confirm
// the URL before enabling. It validates the URL with the same rule as saving.
func (s *Service) DiscoverOIDCProvider(ctx context.Context, issuerURL string) (OIDCDiscovery, error) {
	if s.oidcDiscoverer == nil {
		return OIDCDiscovery{}, ErrOIDCDiscoveryUnavailable
	}
	draft := domain.OIDCConfig{IssuerURL: issuerURL}.Normalize()
	if draft.IssuerURL == "" {
		return OIDCDiscovery{}, &domain.OIDCValidationError{Field: "issuer_url", Reason: "is required"}
	}
	if err := draft.Validate(""); err != nil {
		return OIDCDiscovery{}, err
	}
	return s.oidcDiscoverer.Discover(ctx, draft.IssuerURL)
}

// OIDCRedirectURL is the callback the admin registers at the provider.
func OIDCRedirectURL(siteURL string) string {
	trimmed := strings.TrimRight(strings.TrimSpace(siteURL), "/")
	if trimmed == "" {
		return ""
	}
	return trimmed + OIDCCallbackPath
}

const (
	// OIDCLoginPath starts the browser flow; OIDCCallbackPath receives the code.
	OIDCLoginPath    = "/auth/oidc/login"
	OIDCCallbackPath = "/auth/oidc/callback"
)
