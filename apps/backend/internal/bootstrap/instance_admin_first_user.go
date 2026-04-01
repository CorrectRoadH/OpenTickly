package bootstrap

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// maybeBootstrapFirstUser checks if the instance has not been bootstrapped yet,
// and if so, marks the newly registered user (identified by email) as the instance
// admin and records bootstrap completion. This allows the first user who registers
// to automatically become the instance admin without requiring a separate bootstrap flow.
func maybeBootstrapFirstUser(ctx context.Context, pool *pgxpool.Pool, email string) error {
	// Check if bootstrap has already been completed.
	var completed bool
	err := pool.QueryRow(ctx,
		`SELECT completed FROM instance_admin_bootstrap LIMIT 1`,
	).Scan(&completed)
	if err != nil && err != pgx.ErrNoRows {
		return err
	}
	if completed {
		return nil
	}

	// Look up the user ID by email.
	var userID int64
	if err := pool.QueryRow(ctx,
		`SELECT id FROM identity_users WHERE email = $1`,
		email,
	).Scan(&userID); err != nil {
		return err
	}

	// Mark as instance admin.
	if _, err := pool.Exec(ctx,
		`UPDATE identity_users SET is_instance_admin = true WHERE id = $1`,
		userID,
	); err != nil {
		return err
	}

	now := time.Now()

	// Record bootstrap completion.
	if _, err := pool.Exec(ctx,
		`INSERT INTO instance_admin_bootstrap (completed, admin_email, completed_at)
		 VALUES (true, $1, $2)
		 ON CONFLICT (id) DO NOTHING`,
		email, now,
	); err != nil {
		return err
	}

	// Set registration policy to open (first user bootstrapped, others can still register).
	if _, err := pool.Exec(ctx,
		`INSERT INTO instance_admin_registration_policy (id, mode, updated_at)
		 VALUES (1, 'open', $1)
		 ON CONFLICT (id) DO NOTHING`,
		now,
	); err != nil {
		return err
	}

	return nil
}
