package postgres

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"opentoggl/backend/apps/backend/internal/identity/application"
	"opentoggl/backend/apps/backend/internal/identity/domain"
)

type SSORepository struct{ pool *pgxpool.Pool }

func NewSSORepository(pool *pgxpool.Pool) *SSORepository { return &SSORepository{pool: pool} }

func (repo *SSORepository) Bound(ctx context.Context, key application.SSOIdentity) (bool, error) {
	var exists bool
	err := repo.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM identity_saml_bindings WHERE workspace_id=$1 AND identity_revision=$2 AND subject_key=$3)`, key.WorkspaceID, key.IdentityRevision, key.SubjectKey).Scan(&exists)
	return exists, err
}

func (repo *SSORepository) Login(ctx context.Context, input application.SSOLoginWrite) (application.SSOStoredLogin, error) {
	var result application.SSOStoredLogin
	err := repo.transaction(ctx, func(tx pgx.Tx) error {
		// Lock policy before workspace config, even if a concurrent request has just
		// provisioned this identity. All decisions below use this transaction.
		var mode string
		var verification bool
		if err := tx.QueryRow(ctx, `SELECT mode FROM instance_admin_registration_policy WHERE id=1 FOR SHARE`).Scan(&mode); err != nil {
			return err
		}
		if err := tx.QueryRow(ctx, `SELECT email_verification_required FROM instance_admin_config WHERE id=1 FOR SHARE`).Scan(&verification); err != nil {
			return err
		}
		if err := lockSSOConfig(ctx, tx, input.Identity); err != nil {
			return err
		}
		var userID int64
		err := tx.QueryRow(ctx, `SELECT user_id FROM identity_saml_bindings WHERE workspace_id=$1 AND identity_revision=$2 AND subject_key=$3`, input.Identity.WorkspaceID, input.Identity.IdentityRevision, input.Identity.SubjectKey).Scan(&userID)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		if userID == 0 {
			if input.NewUser == nil {
				return application.ErrSSOIdentity
			}
			var emailDomain string
			if err := tx.QueryRow(ctx, `SELECT email_domain FROM tenant_workspace_sso_config WHERE workspace_id=$1`, input.Identity.WorkspaceID).Scan(&emailDomain); err != nil {
				return err
			}
			_, assertedDomain, _ := strings.Cut(input.NewUser.Email(), "@")
			if assertedDomain == "" || !strings.EqualFold(assertedDomain, emailDomain) {
				return application.ErrSSOIdentity
			}
			var exists bool
			if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM identity_users WHERE lower(email)=lower($1))`, input.NewUser.Email()).Scan(&exists); err != nil {
				return err
			}
			if exists {
				return application.ErrSSOAccountExists
			}
			if mode != "open" {
				return application.ErrRegistrationClosed
			}
			if verification {
				return application.ErrSSOVerificationRequired
			}
			if err := (&UserRepository{pool: tx}).Save(ctx, input.NewUser); err != nil {
				var pgErr *pgconn.PgError
				if errors.As(err, &pgErr) && pgErr.Code == "23505" {
					return application.ErrSSOAccountExists
				}
				return err
			}
			userID = input.NewUser.ID()
			if err := insertSSOBinding(ctx, tx, input.Identity, userID); err != nil {
				return err
			}
			result.Provisioned = true
		}
		user, err := lockSSOUser(ctx, tx, userID)
		if err != nil {
			return err
		}
		if err := (&SessionRepository{pool: tx}).Put(ctx, application.Session{ID: input.SessionID, UserID: userID}); err != nil {
			return err
		}
		result.User = user
		return nil
	})
	return result, err
}

func (repo *SSORepository) Link(ctx context.Context, input application.SSOLinkWrite) error {
	return repo.transaction(ctx, func(tx pgx.Tx) error {
		if err := lockSSOConfig(ctx, tx, input.Identity); err != nil {
			return err
		}
		if _, err := lockSSOUser(ctx, tx, input.UserID); err != nil {
			return err
		}
		if err := lockSSOSession(ctx, tx, input.UserID, input.SessionID); err != nil {
			return err
		}
		var memberID int64
		err := tx.QueryRow(ctx, `SELECT id FROM membership_workspace_members WHERE workspace_id=$1 AND user_id=$2 AND state IN ('joined','restored') FOR SHARE`, input.Identity.WorkspaceID, input.UserID).Scan(&memberID)
		if errors.Is(err, pgx.ErrNoRows) {
			return application.ErrSSOMembershipRequired
		}
		if err != nil {
			return err
		}
		var owner int64
		err = tx.QueryRow(ctx, `SELECT user_id FROM identity_saml_bindings WHERE workspace_id=$1 AND identity_revision=$2 AND subject_key=$3`, input.Identity.WorkspaceID, input.Identity.IdentityRevision, input.Identity.SubjectKey).Scan(&owner)
		if err == nil && owner == input.UserID {
			return nil
		}
		if err == nil {
			return application.ErrSSOBindingTaken
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		return insertSSOBinding(ctx, tx, input.Identity, input.UserID)
	})
}

func (repo *SSORepository) Unlink(ctx context.Context, input application.SSOUnlinkWrite) error {
	return repo.transaction(ctx, func(tx pgx.Tx) error {
		// Config exists whenever a binding exists (workspace deletion cascades).
		if _, err := tx.Exec(ctx, `SELECT workspace_id FROM tenant_workspace_sso_config WHERE workspace_id=$1 FOR UPDATE`, input.WorkspaceID); err != nil {
			return err
		}
		user, err := lockSSOUser(ctx, tx, input.UserID)
		if err != nil {
			return err
		}
		if err := lockSSOSession(ctx, tx, input.UserID, input.SessionID); err != nil {
			return err
		}
		if !user.MatchesPassword(input.Password) {
			return domain.ErrInvalidCredentials
		}
		if _, err := tx.Exec(ctx, `DELETE FROM identity_saml_bindings WHERE workspace_id=$1 AND user_id=$2`, input.WorkspaceID, input.UserID); err != nil {
			return err
		}
		return (&SessionRepository{pool: tx}).DeleteByUserID(ctx, input.UserID)
	})
}

func (repo *SSORepository) List(ctx context.Context, userID int64) ([]application.SSOBinding, error) {
	rows, err := repo.pool.Query(ctx, `SELECT b.workspace_id,w.name,c.profile_name,c.enabled FROM identity_saml_bindings b JOIN tenant_workspaces w ON w.id=b.workspace_id JOIN tenant_workspace_sso_config c ON c.workspace_id=b.workspace_id WHERE b.user_id=$1 ORDER BY b.workspace_id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []application.SSOBinding{}
	for rows.Next() {
		var item application.SSOBinding
		if err := rows.Scan(&item.WorkspaceID, &item.WorkspaceName, &item.ProfileName, &item.Enabled); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (repo *SSORepository) transaction(ctx context.Context, run func(pgx.Tx) error) error {
	tx, err := repo.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err := run(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func lockSSOConfig(ctx context.Context, tx pgx.Tx, key application.SSOIdentity) error {
	var enabled bool
	var revision, identityRevision int64
	err := tx.QueryRow(ctx, `SELECT enabled,revision,identity_revision FROM tenant_workspace_sso_config WHERE workspace_id=$1 FOR UPDATE`, key.WorkspaceID).Scan(&enabled, &revision, &identityRevision)
	if errors.Is(err, pgx.ErrNoRows) {
		return application.ErrSSOConfigurationChanged
	}
	if err != nil {
		return err
	}
	if !enabled || key.Revision != revision || key.IdentityRevision != identityRevision {
		return application.ErrSSOConfigurationChanged
	}
	return nil
}

func lockSSOUser(ctx context.Context, tx pgx.Tx, userID int64) (*domain.User, error) {
	user, err := scanUser(tx.QueryRow(ctx, `SELECT `+userColumns+` FROM identity_users WHERE id=$1 FOR UPDATE`, userID))
	if err != nil {
		return nil, err
	}
	if !user.CanAuthenticate() {
		return nil, user.AuthenticateBasic(domain.BasicCredentials{})
	}
	return user, nil
}

func lockSSOSession(ctx context.Context, tx pgx.Tx, userID int64, sessionID string) error {
	var owner int64
	err := tx.QueryRow(ctx, `SELECT user_id FROM identity_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE`, sessionID, userID).Scan(&owner)
	if errors.Is(err, pgx.ErrNoRows) {
		return application.ErrSessionNotFound
	}
	return err
}

func insertSSOBinding(ctx context.Context, tx pgx.Tx, key application.SSOIdentity, userID int64) error {
	_, err := tx.Exec(ctx, `INSERT INTO identity_saml_bindings(workspace_id,identity_revision,subject_key,user_id) VALUES($1,$2,$3,$4)`, key.WorkspaceID, key.IdentityRevision, key.SubjectKey, userID)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return application.ErrSSOBindingTaken
	}
	return err
}
