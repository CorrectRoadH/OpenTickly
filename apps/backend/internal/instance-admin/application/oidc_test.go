package application

import (
	"context"
	"errors"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/instance-admin/domain"
)

type memOIDCStore struct {
	cfg   domain.OIDCConfig
	saved int
}

func (s *memOIDCStore) GetOIDCConfig(context.Context) (domain.OIDCConfig, error) { return s.cfg, nil }
func (s *memOIDCStore) SaveOIDCConfig(_ context.Context, next domain.OIDCConfig) (domain.OIDCConfig, error) {
	if next.Revision != s.cfg.Revision {
		return domain.OIDCConfig{}, domain.ErrOIDCConfigConflict
	}
	next.Revision = s.cfg.Revision + 1
	s.cfg = next
	s.saved++
	return next, nil
}

func newOIDCService(t *testing.T, store *memOIDCStore, siteURL string) *Service {
	t.Helper()
	service, err := NewService(Config{
		Bootstrap:          &memBootstrapStore{},
		RegistrationPolicy: &memRegistrationPolicyStore{},
		InstanceUsers:      &memInstanceUserStore{},
		InstanceConfig:     &memInstanceConfigStore{cfg: InstanceConfigView{SiteURL: siteURL}},
		OIDCConfig:         store,
		OrgLister:          &memOrgLister{},
		UserCreator:        &memUserCreator{},
		EmailSender:        &memEmailSender{},
		Clock:              fixedClock{now: time.Date(2026, 11, 6, 12, 0, 0, 0, time.UTC)},
	})
	if err != nil {
		t.Fatalf("new service: %v", err)
	}
	return service
}

func TestUpdateOIDCConfigKeepsSecretWhenOmitted(t *testing.T) {
	store := &memOIDCStore{cfg: domain.OIDCConfig{ClientSecret: "stored", Revision: 1}}
	service := newOIDCService(t, store, "https://track.example.com")

	saved, err := service.UpdateOIDCConfig(context.Background(), OIDCConfigUpdate{
		Revision: 1, Enabled: true, ProviderName: "Google",
		IssuerURL: "https://accounts.google.com/", ClientID: "cid",
		AllowedEmailDomains: []string{"Example.com"},
	})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if saved.ClientSecret != "stored" || saved.Revision != 2 || saved.IssuerURL != "https://accounts.google.com" {
		t.Fatalf("unexpected saved config: %+v", saved)
	}
	if len(saved.AllowedEmailDomains) != 1 || saved.AllowedEmailDomains[0] != "example.com" {
		t.Fatalf("domains not normalized: %v", saved.AllowedEmailDomains)
	}
}

func TestUpdateOIDCConfigRejectsEnableWithoutSiteURL(t *testing.T) {
	store := &memOIDCStore{cfg: domain.OIDCConfig{Revision: 1}}
	service := newOIDCService(t, store, "")
	secret := "s"
	_, err := service.UpdateOIDCConfig(context.Background(), OIDCConfigUpdate{
		Revision: 1, Enabled: true, IssuerURL: "https://accounts.google.com", ClientID: "cid", ClientSecret: &secret,
	})
	if !errors.Is(err, domain.ErrOIDCConfigInvalid) {
		t.Fatalf("expected validation error, got %v", err)
	}
	if store.saved != 0 {
		t.Fatal("invalid config must not be saved")
	}
}

func TestUpdateOIDCConfigStaleRevisionConflicts(t *testing.T) {
	store := &memOIDCStore{cfg: domain.OIDCConfig{Revision: 3}}
	service := newOIDCService(t, store, "https://track.example.com")
	_, err := service.UpdateOIDCConfig(context.Background(), OIDCConfigUpdate{Revision: 2})
	if !errors.Is(err, domain.ErrOIDCConfigConflict) {
		t.Fatalf("expected conflict, got %v", err)
	}
}

func TestDiscoverOIDCProviderRequiresDiscoverer(t *testing.T) {
	service := newOIDCService(t, &memOIDCStore{}, "")
	if _, err := service.DiscoverOIDCProvider(context.Background(), "https://accounts.google.com"); !errors.Is(err, ErrOIDCDiscoveryUnavailable) {
		t.Fatalf("expected discovery unavailable, got %v", err)
	}
}

func TestOIDCRedirectURL(t *testing.T) {
	if got := OIDCRedirectURL("https://track.example.com/"); got != "https://track.example.com/auth/oidc/callback" {
		t.Fatalf("unexpected redirect url %q", got)
	}
	if OIDCRedirectURL("") != "" {
		t.Fatal("empty site url must yield empty redirect")
	}
}
