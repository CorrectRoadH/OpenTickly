package bootstrap

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

var errSSOConfigConflict = errors.New("SSO settings changed; reload before saving")

func (s *samlConfigStore) Upsert(ctx context.Context, config samlWorkspaceConfig) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	old, found, err := readSAMLConfig(ctx, tx, config.WorkspaceID, true)
	if err != nil {
		return err
	}
	if old.Revision != config.Revision {
		return errSSOConfigConflict
	}
	changedIdentity := found && (old.EmailDomain != config.EmailDomain || old.IDPMetadataURL != config.IDPMetadataURL || old.IDPEntityID != config.IDPEntityID || old.IDPSSOURL != config.IDPSSOURL || old.IDPCertificate != config.IDPCertificate)
	identityRevision := old.IdentityRevision
	if !found || changedIdentity {
		identityRevision++
	}
	if !found {
		_, err = tx.Exec(ctx, `INSERT INTO tenant_workspace_sso_config(workspace_id,enabled,profile_name,email_domain,idp_metadata_url,idp_entity_id,idp_sso_url,idp_certificate,revision,identity_revision) VALUES($1,$2,$3,$4,$5,$6,$7,$8,1,1)`, config.WorkspaceID, config.Enabled, config.ProfileName, config.EmailDomain, config.IDPMetadataURL, config.IDPEntityID, config.IDPSSOURL, config.IDPCertificate)
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.ConstraintName == "tenant_workspace_sso_config_pkey" {
			return errSSOConfigConflict
		}
	} else {
		_, err = tx.Exec(ctx, `UPDATE tenant_workspace_sso_config SET enabled=$2,profile_name=$3,email_domain=$4,idp_metadata_url=$5,idp_entity_id=$6,idp_sso_url=$7,idp_certificate=$8,revision=revision+1,identity_revision=$9,updated_at=now() WHERE workspace_id=$1`, config.WorkspaceID, config.Enabled, config.ProfileName, config.EmailDomain, config.IDPMetadataURL, config.IDPEntityID, config.IDPSSOURL, config.IDPCertificate, identityRevision)
	}
	if err != nil {
		return err
	}
	if changedIdentity {
		if _, err := tx.Exec(ctx, `DELETE FROM identity_saml_bindings WHERE workspace_id=$1`, config.WorkspaceID); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
