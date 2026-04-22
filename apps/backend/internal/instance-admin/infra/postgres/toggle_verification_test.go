package postgres_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/instance-admin/application"
	instanceadminpostgres "opentoggl/backend/apps/backend/internal/instance-admin/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"

	"github.com/jackc/pgx/v5/pgxpool"
)

// TestEmailVerificationToggleOffActivatesPendingUsers covers the rollback
// contract: flipping the verification toggle off must not leave users stranded
// in pending_verification — otherwise they remain unable to log in after the
// admin thinks the setting is off.
func TestEmailVerificationToggleOffActivatesPendingUsers(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()
	store := instanceadminpostgres.NewStore(database.Pool)
	base := time.Now().UnixNano() % 100000000000

	// Turn verification on so the rollback path has something to clean up.
	if _, err := store.UpdateConfig(ctx, application.InstanceConfigUpdate{
		EmailVerificationRequired: boolPtr(true),
	}); err != nil {
		t.Fatalf("enable verification: %v", err)
	}

	pendingID := insertUser(t, ctx, database.Pool, base, "pending", "pending_verification")
	activeID := insertUser(t, ctx, database.Pool, base+1, "active", "active")
	deactivatedID := insertUser(t, ctx, database.Pool, base+2, "deactivated", "deactivated")

	// Seed a verification token against the pending user — it should be
	// cleared alongside the state flip.
	if _, err := database.Pool.Exec(ctx, `
		INSERT INTO identity_email_verification_tokens (user_id, token, expires_at)
		VALUES ($1, $2, now() + interval '1 hour')
	`, pendingID, fmt.Sprintf("tok-%d", base)); err != nil {
		t.Fatalf("seed verification token: %v", err)
	}

	if _, err := store.UpdateConfig(ctx, application.InstanceConfigUpdate{
		EmailVerificationRequired: boolPtr(false),
	}); err != nil {
		t.Fatalf("disable verification: %v", err)
	}

	assertUserState(t, ctx, database.Pool, pendingID, "active")
	assertUserState(t, ctx, database.Pool, activeID, "active")
	assertUserState(t, ctx, database.Pool, deactivatedID, "deactivated")

	var tokenCount int
	if err := database.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM identity_email_verification_tokens WHERE user_id = $1
	`, pendingID).Scan(&tokenCount); err != nil {
		t.Fatalf("count tokens: %v", err)
	}
	if tokenCount != 0 {
		t.Fatalf("expected verification tokens for pending user to be cleared, got %d", tokenCount)
	}
}

// TestEmailVerificationToggleUnrelatedUpdateLeavesPendingAlone guards against
// the rollback accidentally running on a config update that does not touch
// the verification flag.
func TestEmailVerificationToggleUnrelatedUpdateLeavesPendingAlone(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()
	store := instanceadminpostgres.NewStore(database.Pool)
	base := time.Now().UnixNano() % 100000000000

	if _, err := store.UpdateConfig(ctx, application.InstanceConfigUpdate{
		EmailVerificationRequired: boolPtr(true),
	}); err != nil {
		t.Fatalf("enable verification: %v", err)
	}
	pendingID := insertUser(t, ctx, database.Pool, base+10, "stays-pending", "pending_verification")

	if _, err := store.UpdateConfig(ctx, application.InstanceConfigUpdate{
		SiteURL: strPtr("https://example.test"),
	}); err != nil {
		t.Fatalf("unrelated update: %v", err)
	}

	assertUserState(t, ctx, database.Pool, pendingID, "pending_verification")
}

func insertUser(t *testing.T, ctx context.Context, pool *pgxpool.Pool, id int64, label string, state string) int64 {
	t.Helper()
	email := fmt.Sprintf("%s-%d@example.com", label, id)
	var userID int64
	err := pool.QueryRow(ctx, `
		INSERT INTO identity_users (
			id, email, password_hash, full_name, api_token, state, timezone,
			product_emails_disable_code, weekly_report_disable_code
		)
		VALUES ($1, $2, 'hash', $3, $4, $5, 'UTC', '', '')
		RETURNING id
	`, id, email, label, fmt.Sprintf("tok-%d", id), state).Scan(&userID)
	if err != nil {
		t.Fatalf("insert user %d (%s): %v", id, state, err)
	}
	return userID
}

func assertUserState(t *testing.T, ctx context.Context, pool *pgxpool.Pool, userID int64, want string) {
	t.Helper()
	var state string
	if err := pool.QueryRow(ctx, `SELECT state FROM identity_users WHERE id = $1`, userID).Scan(&state); err != nil {
		t.Fatalf("load state for user %d: %v", userID, err)
	}
	if state != want {
		t.Fatalf("user %d: expected state %q, got %q", userID, want, state)
	}
}

func boolPtr(v bool) *bool    { return &v }
func strPtr(v string) *string { return &v }
