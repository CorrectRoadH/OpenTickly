package postgres

import (
	"context"
	"fmt"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/identity/application"
	"opentoggl/backend/apps/backend/internal/identity/domain"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

// Reclaiming an abandoned signup rewrites the existing row rather than
// inserting a second one, so it depends on ByEmail surfacing
// pending_verification users and on Save upserting by id.
func TestReclaimPendingRegistrationRewritesExistingRow(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()
	users := NewUserRepository(database.Pool)
	tokens := NewVerificationTokenRepository(database.Pool)
	sequence := NewSequence(database.Pool)

	userID, err := sequence.NextUserID()
	if err != nil {
		t.Fatalf("next user id: %v", err)
	}
	email := fmt.Sprintf("reclaim-%d@example.com", userID)
	pending, err := domain.RegisterUser(domain.RegisterParams{
		ID:                  userID,
		Email:               email,
		FullName:            "Abandoned Signup",
		Password:            "secret1",
		APIToken:            fmt.Sprintf("api-token-abandoned-%d", userID),
		PendingVerification: true,
	})
	if err != nil {
		t.Fatalf("register pending: %v", err)
	}
	if err := users.Save(ctx, pending); err != nil {
		t.Fatalf("save pending: %v", err)
	}
	if err := tokens.Save(ctx, application.VerificationToken{
		UserID:    userID,
		Token:     "stale-" + email,
		ExpiresAt: time.Now().Add(-time.Hour),
	}); err != nil {
		t.Fatalf("save token: %v", err)
	}

	found, err := users.ByEmail(ctx, email)
	if err != nil {
		t.Fatalf("by email: %v", err)
	}
	if found.State() != domain.UserStatePendingVerification {
		t.Fatalf("expected pending_verification, got %s", found.State())
	}

	if err := found.RestartPendingRegistration(domain.RestartRegistrationParams{
		FullName: "Real Owner",
		Password: "secret2",
		APIToken: fmt.Sprintf("api-token-reclaimed-%d", userID),
	}); err != nil {
		t.Fatalf("restart: %v", err)
	}
	if err := users.Save(ctx, found); err != nil {
		t.Fatalf("save reclaimed: %v", err)
	}

	reloaded, err := users.ByEmail(ctx, email)
	if err != nil {
		t.Fatalf("reload: %v", err)
	}
	if reloaded.ID() != userID {
		t.Fatalf("expected the same row, got id %d", reloaded.ID())
	}
	if reloaded.FullName() != "Real Owner" {
		t.Fatalf("expected the reclaimed name, got %q", reloaded.FullName())
	}
	if !reloaded.MatchesPassword("secret2") {
		t.Fatalf("expected the reclaimed password to win")
	}
	if reloaded.State() != domain.UserStatePendingVerification {
		t.Fatalf("expected the row to stay pending, got %s", reloaded.State())
	}
}

// The verification link resolves the user by id and activates them. Rebuilding
// a stored pending row used to fail outright, which made every verification
// link and every resend request error out.
func TestPendingUserRoundTripsAndActivates(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()
	users := NewUserRepository(database.Pool)
	sequence := NewSequence(database.Pool)

	userID, err := sequence.NextUserID()
	if err != nil {
		t.Fatalf("next user id: %v", err)
	}
	pending, err := domain.RegisterUser(domain.RegisterParams{
		ID:                  userID,
		Email:               fmt.Sprintf("pending-roundtrip-%d@example.com", userID),
		FullName:            "Pending Person",
		Password:            "secret1",
		APIToken:            fmt.Sprintf("api-token-pending-%d", userID),
		Timezone:            "Europe/Berlin",
		PendingVerification: true,
	})
	if err != nil {
		t.Fatalf("register pending: %v", err)
	}
	if err := users.Save(ctx, pending); err != nil {
		t.Fatalf("save pending: %v", err)
	}

	loaded, err := users.ByID(ctx, userID)
	if err != nil {
		t.Fatalf("by id: %v", err)
	}
	if loaded.State() != domain.UserStatePendingVerification {
		t.Fatalf("expected pending_verification, got %s", loaded.State())
	}
	if loaded.Timezone() != "Europe/Berlin" {
		t.Fatalf("expected the stored timezone to survive hydration, got %q", loaded.Timezone())
	}

	if err := loaded.Activate(); err != nil {
		t.Fatalf("activate: %v", err)
	}
	if err := users.Save(ctx, loaded); err != nil {
		t.Fatalf("save activated: %v", err)
	}

	reloaded, err := users.ByID(ctx, userID)
	if err != nil {
		t.Fatalf("reload: %v", err)
	}
	if reloaded.State() != domain.UserStateActive {
		t.Fatalf("expected active, got %s", reloaded.State())
	}
}
