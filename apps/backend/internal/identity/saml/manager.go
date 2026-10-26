package saml

import (
	"context"
	"crypto/sha256"
	"fmt"
	"sync"
	"time"

	"github.com/crewjam/saml"
)

// Manager caches a built ServiceProvider per workspace and rebuilds it (re-running
// IdP metadata fetch/parse) only when the workspace's config or the instance base
// URL changes, or after five minutes. Config is read from the database on each request, mirroring the SSO
// "no restart required" model.
type Manager struct {
	mu    sync.Mutex
	cache map[int64]cachedServiceProvider
}

type cachedServiceProvider struct {
	fingerprint string
	provider    *saml.ServiceProvider
	expiresAt   time.Time
}

// NewManager returns an empty Manager.
func NewManager() *Manager {
	return &Manager{cache: make(map[int64]cachedServiceProvider)}
}

// ServiceProvider returns a ServiceProvider for the workspace described by p,
// building and caching it on first use or whenever the config fingerprint changes.
func (m *Manager) ServiceProvider(ctx context.Context, p SPParams) (*saml.ServiceProvider, error) {
	fingerprint := p.Config.fingerprint(p.BaseURL, p.WorkspaceID) + fmt.Sprintf("%x", sha256.Sum256(p.Keypair.Certificate.Raw))

	m.mu.Lock()
	cached, ok := m.cache[p.WorkspaceID]
	m.mu.Unlock()
	if ok && cached.fingerprint == fingerprint && time.Now().Before(cached.expiresAt) {
		return cached.provider, nil
	}

	provider, err := buildServiceProvider(ctx, p)
	if err != nil {
		return nil, err
	}

	m.mu.Lock()
	m.cache[p.WorkspaceID] = cachedServiceProvider{fingerprint: fingerprint, provider: provider, expiresAt: time.Now().Add(5 * time.Minute)}
	m.mu.Unlock()
	return provider, nil
}
