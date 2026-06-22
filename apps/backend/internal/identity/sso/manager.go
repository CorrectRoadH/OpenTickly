package sso

import (
	"strings"
	"sync"
)

// Usable reports whether the configuration has the minimum fields needed to
// run an OIDC flow. A provider name is optional (it only labels the button).
func (c Config) Usable() bool {
	return strings.TrimSpace(c.IssuerURL) != "" &&
		strings.TrimSpace(c.ClientID) != "" &&
		strings.TrimSpace(c.ClientSecret) != ""
}

// Manager caches a single OIDC Provider and transparently rebuilds it when the
// configuration changes. Because SSO is configured at runtime through the admin
// UI, the HTTP layer reads the current config from the database on each request
// and asks the Manager for a Provider; the Manager reuses the cached Provider
// (and its memoized OIDC discovery) as long as the config is unchanged, and
// discards it the moment any field changes — no restart required.
type Manager struct {
	mu          sync.Mutex
	fingerprint string
	provider    *Provider
}

// NewManager returns an empty Manager.
func NewManager() *Manager {
	return &Manager{}
}

// Provider returns a Provider for the given config, rebuilding it only when the
// config differs from the last call.
func (m *Manager) Provider(cfg Config) *Provider {
	m.mu.Lock()
	defer m.mu.Unlock()

	fingerprint := strings.Join([]string{cfg.IssuerURL, cfg.ClientID, cfg.ClientSecret, cfg.ProviderName}, "\x00")
	if m.provider == nil || m.fingerprint != fingerprint {
		m.provider = NewProvider(cfg)
		m.fingerprint = fingerprint
	}
	return m.provider
}
