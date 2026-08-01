package application

import (
	"context"
	"errors"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/identity/domain"
)

func newRegistrationService(t *testing.T, users *stubUserRepo, verifs *stubVerificationTokenRepo, verifier *stubEmailVerifier, now time.Time) *Service {
	t.Helper()
	return newTestService(t, users, &stubSessionRepo{}, &stubPasswordResetRepo{}, &stubPasswordResetEmailer{}, verifs, verifier, now)
}

func registerInput(email string) RegisterInput {
	return RegisterInput{
		Email:    email,
		FullName: "Second Person",
		Password: "secret2",
	}
}

func TestRegisterRejectsEmailOwnedByActiveUser(t *testing.T) {
	users := newStubUserRepo()
	verifs := newStubVerificationTokenRepo()
	verifier := &stubEmailVerifier{required: true}
	seedActiveUser(t, users, 1, "person@example.com")
	service := newRegistrationService(t, users, verifs, verifier, time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC))

	_, err := service.Register(context.Background(), registerInput("Person@Example.com"))
	if !errors.Is(err, domain.ErrEmailAlreadyRegistered) {
		t.Fatalf("expected ErrEmailAlreadyRegistered, got %v", err)
	}
	if verifier.calls != 0 {
		t.Fatalf("expected no verification email, got %d", verifier.calls)
	}
}

func TestRegisterRejectsPendingUserWithLiveVerificationToken(t *testing.T) {
	users := newStubUserRepo()
	verifs := newStubVerificationTokenRepo()
	verifier := &stubEmailVerifier{required: true}
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	pending := seedPendingUser(t, users, 1, "person@example.com")
	if err := verifs.Save(context.Background(), VerificationToken{
		UserID:    pending.ID(),
		Token:     "live-token",
		ExpiresAt: now.Add(time.Hour),
		CreatedAt: now,
	}); err != nil {
		t.Fatalf("seed token: %v", err)
	}
	service := newRegistrationService(t, users, verifs, verifier, now)

	_, err := service.Register(context.Background(), registerInput("person@example.com"))
	if !errors.Is(err, domain.ErrEmailAlreadyRegistered) {
		t.Fatalf("expected ErrEmailAlreadyRegistered, got %v", err)
	}
	if got := verifs.byUser[pending.ID()].Token; got != "live-token" {
		t.Fatalf("live token must not be rotated, got %q", got)
	}
	if verifier.calls != 0 {
		t.Fatalf("expected no verification email, got %d", verifier.calls)
	}
}

func TestRegisterTakesOverPendingUserWithExpiredToken(t *testing.T) {
	users := newStubUserRepo()
	verifs := newStubVerificationTokenRepo()
	verifier := &stubEmailVerifier{required: true}
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	pending := seedPendingUser(t, users, 1, "person@example.com")
	if err := verifs.Save(context.Background(), VerificationToken{
		UserID:    pending.ID(),
		Token:     "stale-token",
		ExpiresAt: now.Add(-time.Minute),
		CreatedAt: now.Add(-25 * time.Hour),
	}); err != nil {
		t.Fatalf("seed token: %v", err)
	}
	service := newRegistrationService(t, users, verifs, verifier, now)

	result, err := service.Register(context.Background(), registerInput("person@example.com"))
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if !result.VerificationRequired {
		t.Fatalf("expected verification required")
	}
	if verifier.calls != 1 {
		t.Fatalf("expected one verification email, got %d", verifier.calls)
	}

	stored, err := users.ByEmail(context.Background(), "person@example.com")
	if err != nil {
		t.Fatalf("lookup: %v", err)
	}
	if stored.ID() != pending.ID() {
		t.Fatalf("takeover must reuse the pending row, got id %d", stored.ID())
	}
	if stored.State() != domain.UserStatePendingVerification {
		t.Fatalf("expected pending_verification, got %s", stored.State())
	}
	if !stored.MatchesPassword("secret2") {
		t.Fatalf("expected the new password to win")
	}
	if stored.FullName() != "Second Person" {
		t.Fatalf("expected the new full name, got %q", stored.FullName())
	}
	if stored.APIToken() == "api-token-pending" {
		t.Fatalf("expected a rotated API token")
	}
	if got := verifs.byUser[pending.ID()].Token; got == "stale-token" || got == "" {
		t.Fatalf("expected a fresh verification token, got %q", got)
	}
}

func TestRegisterPreVerifiedReclaimsPendingUserDespiteLiveToken(t *testing.T) {
	users := newStubUserRepo()
	verifs := newStubVerificationTokenRepo()
	verifier := &stubEmailVerifier{required: true}
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	pending := seedPendingUser(t, users, 1, "person@example.com")
	if err := verifs.Save(context.Background(), VerificationToken{
		UserID:    pending.ID(),
		Token:     "live-token",
		ExpiresAt: now.Add(time.Hour),
		CreatedAt: now,
	}); err != nil {
		t.Fatalf("seed token: %v", err)
	}
	service := newRegistrationService(t, users, verifs, verifier, now)

	input := registerInput("person@example.com")
	input.EmailAlreadyVerified = true
	result, err := service.Register(context.Background(), input)
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if result.Session == nil {
		t.Fatalf("expected a session for a pre-verified registration")
	}
	stored, err := users.ByID(context.Background(), pending.ID())
	if err != nil {
		t.Fatalf("lookup: %v", err)
	}
	if stored.State() != domain.UserStateActive {
		t.Fatalf("expected active, got %s", stored.State())
	}
	if !stored.MatchesPassword("secret2") {
		t.Fatalf("expected the invited user's password to win")
	}
}

func TestRegisterTakesOverPendingUserWithNoToken(t *testing.T) {
	users := newStubUserRepo()
	verifs := newStubVerificationTokenRepo()
	verifier := &stubEmailVerifier{required: true}
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	seedPendingUser(t, users, 1, "person@example.com")
	service := newRegistrationService(t, users, verifs, verifier, now)

	result, err := service.Register(context.Background(), registerInput("person@example.com"))
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if !result.VerificationRequired {
		t.Fatalf("expected verification required")
	}
	if verifier.calls != 1 {
		t.Fatalf("expected one verification email, got %d", verifier.calls)
	}
}

func TestRegisterTakeoverActivatesWhenVerificationDisabled(t *testing.T) {
	users := newStubUserRepo()
	verifs := newStubVerificationTokenRepo()
	verifier := &stubEmailVerifier{required: false}
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	pending := seedPendingUser(t, users, 1, "person@example.com")
	service := newRegistrationService(t, users, verifs, verifier, now)

	result, err := service.Register(context.Background(), registerInput("person@example.com"))
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if result.Session == nil {
		t.Fatalf("expected a session when verification is disabled")
	}
	stored, err := users.ByID(context.Background(), pending.ID())
	if err != nil {
		t.Fatalf("lookup: %v", err)
	}
	if stored.State() != domain.UserStateActive {
		t.Fatalf("expected active, got %s", stored.State())
	}
}

func TestRegisterDiscardsVerificationTokenWhenSendFails(t *testing.T) {
	users := newStubUserRepo()
	verifs := newStubVerificationTokenRepo()
	sendErr := errors.New("smtp down")
	verifier := &stubEmailVerifier{required: true, sendErr: sendErr}
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	service := newRegistrationService(t, users, verifs, verifier, now)

	_, err := service.Register(context.Background(), registerInput("person@example.com"))
	if !errors.Is(err, sendErr) {
		t.Fatalf("expected the send error to surface, got %v", err)
	}
	if len(verifs.byUser) != 0 {
		t.Fatalf("expected the verification token to be discarded, got %+v", verifs.byUser)
	}

	// The stranded pending row must not block a retry.
	verifier.sendErr = nil
	result, err := service.Register(context.Background(), registerInput("person@example.com"))
	if err != nil {
		t.Fatalf("retry register: %v", err)
	}
	if !result.VerificationRequired {
		t.Fatalf("expected verification required on retry")
	}
}

func TestRegisterStampsVerificationTokenCreatedAtFromClock(t *testing.T) {
	users := newStubUserRepo()
	verifs := newStubVerificationTokenRepo()
	verifier := &stubEmailVerifier{required: true}
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	service := newRegistrationService(t, users, verifs, verifier, now)

	if _, err := service.Register(context.Background(), registerInput("person@example.com")); err != nil {
		t.Fatalf("register: %v", err)
	}
	stored, err := users.ByEmail(context.Background(), "person@example.com")
	if err != nil {
		t.Fatalf("lookup: %v", err)
	}
	token := verifs.byUser[stored.ID()]
	if !token.CreatedAt.Equal(now) {
		t.Fatalf("expected created_at %v, got %v", now, token.CreatedAt)
	}
	if !token.ExpiresAt.Equal(now.Add(24 * time.Hour)) {
		t.Fatalf("expected expiry +24h, got %v", token.ExpiresAt)
	}
}
