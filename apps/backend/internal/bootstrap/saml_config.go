package bootstrap

import (
	"context"
	"errors"
	"strings"

	identitysaml "opentoggl/backend/apps/backend/internal/identity/saml"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// samlWorkspaceConfig is a workspace's persisted SAML SSO configuration.
type samlWorkspaceConfig struct {
	WorkspaceID      int64
	Revision         int64
	IdentityRevision int64
	Enabled          bool
	ProfileName      string
	EmailDomain      string
	IDPMetadataURL   string
	IDPEntityID      string
	IDPSSOURL        string
	IDPCertificate   string
}

// providerConfig projects the persisted row onto the SAML package's IdP config.
func (c samlWorkspaceConfig) providerConfig() identitysaml.Config {
	return identitysaml.Config{
		ProfileName:    c.ProfileName,
		EmailDomain:    c.EmailDomain,
		IDPMetadataURL: c.IDPMetadataURL,
		IDPEntityID:    c.IDPEntityID,
		IDPSSOURL:      c.IDPSSOURL,
		IDPCertificate: c.IDPCertificate,
	}
}

// active reports whether the workspace should serve SAML logins: enabled by an
// admin AND minimally configured on the IdP side.
func (c samlWorkspaceConfig) active() bool {
	return c.Enabled && c.providerConfig().Usable()
}

// samlConfigStore reads and writes per-workspace SAML config plus the singleton
// Service Provider keypair.
type samlConfigStore struct {
	pool *pgxpool.Pool
}

func (s *samlConfigStore) Get(ctx context.Context, workspaceID int64) (samlWorkspaceConfig, bool, error) {
	return readSAMLConfig(ctx, s.pool, workspaceID, false)
}

type samlConfigQuery interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}

func readSAMLConfig(ctx context.Context, query samlConfigQuery, workspaceID int64, lock bool) (samlWorkspaceConfig, bool, error) {
	config := samlWorkspaceConfig{WorkspaceID: workspaceID}
	sql := `SELECT enabled, profile_name, email_domain, idp_metadata_url, idp_entity_id, idp_sso_url, idp_certificate,revision,identity_revision FROM tenant_workspace_sso_config WHERE workspace_id=$1`
	if lock {
		sql += " FOR UPDATE"
	}
	err := query.QueryRow(ctx, sql, workspaceID).Scan(&config.Enabled, &config.ProfileName, &config.EmailDomain,
		&config.IDPMetadataURL, &config.IDPEntityID, &config.IDPSSOURL, &config.IDPCertificate, &config.Revision, &config.IdentityRevision)
	if errors.Is(err, pgx.ErrNoRows) {
		return samlWorkspaceConfig{WorkspaceID: workspaceID}, false, nil
	}
	if err != nil {
		return samlWorkspaceConfig{}, false, err
	}
	return config, true, nil
}

// ResolveByEmailDomain finds the enabled workspace config that claims an email
// domain. Only enabled configs are returned so the login page never routes to a
// disabled or half-configured workspace.
func (s *samlConfigStore) ResolveByEmailDomain(ctx context.Context, domain string) (samlWorkspaceConfig, bool, error) {
	normalized := strings.ToLower(strings.TrimSpace(domain))
	if normalized == "" {
		return samlWorkspaceConfig{}, false, nil
	}
	config := samlWorkspaceConfig{}
	err := s.pool.QueryRow(ctx,
		`SELECT workspace_id, enabled, profile_name, email_domain, idp_metadata_url, idp_entity_id, idp_sso_url, idp_certificate,revision,identity_revision
		 FROM tenant_workspace_sso_config
		 WHERE enabled AND lower(email_domain) = $1`,
		normalized,
	).Scan(&config.WorkspaceID, &config.Enabled, &config.ProfileName, &config.EmailDomain,
		&config.IDPMetadataURL, &config.IDPEntityID, &config.IDPSSOURL, &config.IDPCertificate, &config.Revision, &config.IdentityRevision)
	if errors.Is(err, pgx.ErrNoRows) {
		return samlWorkspaceConfig{}, false, nil
	}
	if err != nil {
		return samlWorkspaceConfig{}, false, err
	}
	return config, true, nil
}

// ServiceProviderKeypair loads the singleton SP keypair, generating and
// persisting one on first use so the SP identity stays stable across restarts.
func (s *samlConfigStore) ServiceProviderKeypair(ctx context.Context) (identitysaml.Keypair, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return identitysaml.Keypair{}, err
	}
	defer tx.Rollback(ctx)
	var keyPEM, certPEM string
	if err := tx.QueryRow(ctx,
		`SELECT saml_sp_private_key, saml_sp_certificate FROM instance_admin_config WHERE id = 1 FOR UPDATE`,
	).Scan(&keyPEM, &certPEM); err != nil {
		return identitysaml.Keypair{}, err
	}

	if strings.TrimSpace(keyPEM) != "" && strings.TrimSpace(certPEM) != "" {
		return identitysaml.ParseKeypair(keyPEM, certPEM)
	}

	keypair, err := identitysaml.GenerateKeypair()
	if err != nil {
		return identitysaml.Keypair{}, err
	}
	if _, err := tx.Exec(ctx,
		`UPDATE instance_admin_config SET saml_sp_private_key = $1, saml_sp_certificate = $2, updated_at = now() WHERE id = 1`,
		keypair.PrivateKeyPEM, keypair.CertificatePEM,
	); err != nil {
		return identitysaml.Keypair{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return identitysaml.Keypair{}, err
	}
	return keypair, nil
}
