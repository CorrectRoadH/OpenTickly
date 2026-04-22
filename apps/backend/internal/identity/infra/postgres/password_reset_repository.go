package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"opentoggl/backend/apps/backend/internal/identity/application"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PasswordResetTokenRepository persists password reset tokens keyed by the
// SHA-256 hash of the emailed token. The plaintext is never stored.
type PasswordResetTokenRepository struct {
	pool *pgxpool.Pool
}

func NewPasswordResetTokenRepository(pool *pgxpool.Pool) *PasswordResetTokenRepository {
	return &PasswordResetTokenRepository{pool: pool}
}

func (r *PasswordResetTokenRepository) Save(ctx context.Context, t application.PasswordResetToken) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO identity_password_reset_tokens (user_id, token_hash, expires_at, created_at)
		 VALUES ($1, $2, $3, $4)`,
		t.UserID, t.TokenHash, t.ExpiresAt, t.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("save password reset token: %w", err)
	}
	return nil
}

func (r *PasswordResetTokenRepository) ByTokenHash(ctx context.Context, hash string) (application.PasswordResetToken, error) {
	var (
		result     application.PasswordResetToken
		consumedAt *time.Time
	)
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, token_hash, expires_at, created_at, consumed_at
		 FROM identity_password_reset_tokens
		 WHERE token_hash = $1`,
		hash,
	).Scan(&result.ID, &result.UserID, &result.TokenHash, &result.ExpiresAt, &result.CreatedAt, &consumedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return application.PasswordResetToken{}, application.ErrPasswordResetTokenInvalid
	}
	if err != nil {
		return application.PasswordResetToken{}, fmt.Errorf("lookup password reset token: %w", err)
	}
	result.ConsumedAt = consumedAt
	return result, nil
}

func (r *PasswordResetTokenRepository) MarkConsumed(ctx context.Context, id int64, at time.Time) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE identity_password_reset_tokens
		 SET consumed_at = $2
		 WHERE id = $1 AND consumed_at IS NULL`,
		id, at,
	)
	if err != nil {
		return fmt.Errorf("mark password reset token consumed: %w", err)
	}
	return nil
}

func (r *PasswordResetTokenRepository) CountRecentForUser(ctx context.Context, userID int64, since time.Time) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT count(*) FROM identity_password_reset_tokens
		 WHERE user_id = $1 AND created_at >= $2`,
		userID, since,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count recent password reset tokens: %w", err)
	}
	return count, nil
}

func (r *PasswordResetTokenRepository) DeleteByID(ctx context.Context, id int64) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM identity_password_reset_tokens WHERE id = $1`,
		id,
	)
	if err != nil {
		return fmt.Errorf("delete password reset token: %w", err)
	}
	return nil
}
