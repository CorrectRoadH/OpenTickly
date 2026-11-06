package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"opentoggl/backend/apps/backend/internal/identity/application"
)

// OIDCRepository is the sole transaction owner for instance-level OIDC logins.
// Lock order: instance OIDC config, (email-matched or bound) user, binding,
// session. See docs/instance-oidc-sso/README.md.
type OIDCRepository struct{ pool *pgxpool.Pool }

func NewOIDCRepository(pool *pgxpool.Pool) *OIDCRepository { return &OIDCRepository{pool: pool} }

func (repo *OIDCRepository) Login(ctx context.Context, input application.OIDCLoginWrite) (application.OIDCStoredLogin, error) {
	var result application.OIDCStoredLogin
	err := repo.transaction(ctx, func(tx pgx.Tx) error {
		if err := lockOIDCConfig(ctx, tx, input.Identity.Issuer); err != nil {
			return err
		}
		userID, err := boundOIDCUser(ctx, tx, input.Identity)
		if err != nil {
			return err
		}
		if userID == 0 {
			userID, err = repo.linkOrProvision(ctx, tx, input, &result)
			if err != nil {
				return err
			}
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

// linkOrProvision resolves a never-seen subject. The application already
// decided whether the verified email may link (AllowEmailLink) and whether a
// missing account may be created (NewUser); the transaction only applies them.
func (repo *OIDCRepository) linkOrProvision(ctx context.Context, tx pgx.Tx, input application.OIDCLoginWrite, result *application.OIDCStoredLogin) (int64, error) {
	if !input.AllowEmailLink {
		return 0, application.ErrOIDCAccountNotFound
	}
	identity := input.Identity
	var userID int64
	err := tx.QueryRow(ctx, `SELECT id FROM identity_users WHERE lower(email)=lower($1) AND state <> 'deleted' FOR UPDATE`, identity.Email).Scan(&userID)
	switch {
	case err == nil:
		if err := insertOIDCBinding(ctx, tx, identity, userID); err != nil {
			return 0, err
		}
		result.Linked = true
		return userID, nil
	case errors.Is(err, pgx.ErrNoRows):
		if input.NewUser == nil {
			return 0, application.ErrOIDCAccountNotFound
		}
		if err := (&UserRepository{pool: tx}).Save(ctx, input.NewUser); err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23505" {
				return 0, application.ErrSSOBindingTaken
			}
			return 0, err
		}
		if err := insertOIDCBinding(ctx, tx, identity, input.NewUser.ID()); err != nil {
			return 0, err
		}
		result.Provisioned = true
		return input.NewUser.ID(), nil
	default:
		return 0, err
	}
}

func lockOIDCConfig(ctx context.Context, tx pgx.Tx, issuer string) error {
	var enabled bool
	var storedIssuer string
	err := tx.QueryRow(ctx, `SELECT enabled, issuer_url FROM instance_admin_oidc_config WHERE id=1 FOR SHARE`).Scan(&enabled, &storedIssuer)
	if errors.Is(err, pgx.ErrNoRows) {
		return application.ErrSSOConfigurationChanged
	}
	if err != nil {
		return err
	}
	if !enabled || storedIssuer != issuer {
		return application.ErrSSOConfigurationChanged
	}
	return nil
}

func boundOIDCUser(ctx context.Context, tx pgx.Tx, identity application.OIDCIdentity) (int64, error) {
	var userID int64
	err := tx.QueryRow(ctx, `SELECT user_id FROM identity_oidc_bindings WHERE issuer=$1 AND subject=$2`, identity.Issuer, identity.Subject).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	return userID, err
}

func insertOIDCBinding(ctx context.Context, tx pgx.Tx, identity application.OIDCIdentity, userID int64) error {
	_, err := tx.Exec(ctx, `INSERT INTO identity_oidc_bindings(issuer, subject, user_id) VALUES($1,$2,$3)`, identity.Issuer, identity.Subject, userID)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return application.ErrSSOBindingTaken
	}
	return err
}

func (repo *OIDCRepository) transaction(ctx context.Context, run func(pgx.Tx) error) error {
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
