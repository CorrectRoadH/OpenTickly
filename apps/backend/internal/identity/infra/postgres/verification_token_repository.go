package postgres

import (
	"context"
	"fmt"

	"opentoggl/backend/apps/backend/internal/identity/application"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type VerificationTokenRepository struct {
	pool *pgxpool.Pool
}

func NewVerificationTokenRepository(pool *pgxpool.Pool) *VerificationTokenRepository {
	return &VerificationTokenRepository{pool: pool}
}

func (r *VerificationTokenRepository) Save(ctx context.Context, token application.VerificationToken) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO identity_email_verification_tokens (user_id, token, expires_at)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3, created_at = now()`,
		token.UserID, token.Token, token.ExpiresAt,
	)
	if err != nil {
		return fmt.Errorf("save verification token: %w", err)
	}
	return nil
}

func (r *VerificationTokenRepository) ByToken(ctx context.Context, token string) (application.VerificationToken, error) {
	var vt application.VerificationToken
	err := r.pool.QueryRow(ctx,
		`SELECT user_id, token, expires_at, created_at
		 FROM identity_email_verification_tokens
		 WHERE token = $1`,
		token,
	).Scan(&vt.UserID, &vt.Token, &vt.ExpiresAt, &vt.CreatedAt)
	if err == pgx.ErrNoRows {
		return application.VerificationToken{}, application.ErrVerificationTokenInvalid
	}
	if err != nil {
		return application.VerificationToken{}, fmt.Errorf("lookup verification token: %w", err)
	}
	return vt, nil
}

func (r *VerificationTokenRepository) ByUserID(ctx context.Context, userID int64) (application.VerificationToken, error) {
	var vt application.VerificationToken
	err := r.pool.QueryRow(ctx,
		`SELECT user_id, token, expires_at, created_at
		 FROM identity_email_verification_tokens
		 WHERE user_id = $1`,
		userID,
	).Scan(&vt.UserID, &vt.Token, &vt.ExpiresAt, &vt.CreatedAt)
	if err == pgx.ErrNoRows {
		return application.VerificationToken{}, application.ErrVerificationTokenInvalid
	}
	if err != nil {
		return application.VerificationToken{}, fmt.Errorf("lookup verification token by user: %w", err)
	}
	return vt, nil
}

func (r *VerificationTokenRepository) DeleteByUserID(ctx context.Context, userID int64) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM identity_email_verification_tokens WHERE user_id = $1`,
		userID,
	)
	if err != nil {
		return fmt.Errorf("delete verification tokens: %w", err)
	}
	return nil
}
