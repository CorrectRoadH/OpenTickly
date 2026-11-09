package postgres

import (
	"context"
	"errors"
	"fmt"

	"opentoggl/backend/apps/backend/internal/instance-admin/domain"

	"github.com/jackc/pgx/v5"
)

// --- InstanceOIDCConfigStore ---

const oidcConfigColumns = `enabled, provider_name, issuer_url, client_id, client_secret, allowed_email_domains, auto_provision, revision, updated_at`

func (s *Store) GetOIDCConfig(ctx context.Context) (domain.OIDCConfig, error) {
	cfg, err := scanOIDCConfig(s.pool.QueryRow(ctx, `SELECT `+oidcConfigColumns+` FROM instance_admin_oidc_config WHERE id = 1`))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.OIDCConfig{}, nil
	}
	if err != nil {
		return domain.OIDCConfig{}, fmt.Errorf("instance-admin get oidc config: %w", err)
	}
	return cfg, nil
}

// SaveOIDCConfig upserts the singleton row under a row lock. The caller's
// Revision must match the stored one (zero when no row exists yet). When the
// issuer or client changed, every binding is dropped in the same transaction.
func (s *Store) SaveOIDCConfig(ctx context.Context, next domain.OIDCConfig) (domain.OIDCConfig, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return domain.OIDCConfig{}, fmt.Errorf("instance-admin save oidc config: %w", err)
	}
	defer tx.Rollback(ctx)

	current, err := scanOIDCConfig(tx.QueryRow(ctx, `SELECT `+oidcConfigColumns+` FROM instance_admin_oidc_config WHERE id = 1 FOR UPDATE`))
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return domain.OIDCConfig{}, fmt.Errorf("instance-admin lock oidc config: %w", err)
	}
	if current.Revision != next.Revision {
		return domain.OIDCConfig{}, domain.ErrOIDCConfigConflict
	}
	saved := next
	saved.Revision = current.Revision + 1
	if saved.AllowedEmailDomains == nil {
		saved.AllowedEmailDomains = []string{}
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO instance_admin_oidc_config (id, enabled, provider_name, issuer_url, client_id, client_secret, allowed_email_domains, auto_provision, revision, updated_at)
		VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (id) DO UPDATE SET
			enabled = EXCLUDED.enabled,
			provider_name = EXCLUDED.provider_name,
			issuer_url = EXCLUDED.issuer_url,
			client_id = EXCLUDED.client_id,
			client_secret = EXCLUDED.client_secret,
			allowed_email_domains = EXCLUDED.allowed_email_domains,
			auto_provision = EXCLUDED.auto_provision,
			revision = EXCLUDED.revision,
			updated_at = EXCLUDED.updated_at`,
		saved.Enabled, saved.ProviderName, saved.IssuerURL, saved.ClientID, saved.ClientSecret,
		saved.AllowedEmailDomains, saved.AutoProvision, saved.Revision, saved.UpdatedAt,
	); err != nil {
		return domain.OIDCConfig{}, fmt.Errorf("instance-admin upsert oidc config: %w", err)
	}
	if current.TrustChanged(saved) {
		if _, err := tx.Exec(ctx, `DELETE FROM identity_oidc_bindings`); err != nil {
			return domain.OIDCConfig{}, fmt.Errorf("instance-admin reset oidc bindings: %w", err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return domain.OIDCConfig{}, fmt.Errorf("instance-admin save oidc config: %w", err)
	}
	return saved, nil
}

func scanOIDCConfig(row pgx.Row) (domain.OIDCConfig, error) {
	var cfg domain.OIDCConfig
	err := row.Scan(&cfg.Enabled, &cfg.ProviderName, &cfg.IssuerURL, &cfg.ClientID, &cfg.ClientSecret,
		&cfg.AllowedEmailDomains, &cfg.AutoProvision, &cfg.Revision, &cfg.UpdatedAt)
	if cfg.AllowedEmailDomains == nil {
		cfg.AllowedEmailDomains = []string{}
	}
	return cfg, err
}
