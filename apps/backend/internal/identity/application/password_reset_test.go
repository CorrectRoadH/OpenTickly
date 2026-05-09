package application

import (
	"context"
	"errors"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/identity/domain"
)

// --- stubs ---------------------------------------------------------------

type stubUserRepo struct {
	byID    map[int64]*domain.User
	byEmail map[string]*domain.User
	saves   int
}

func newStubUserRepo() *stubUserRepo {
	return &stubUserRepo{
		byID:    map[int64]*domain.User{},
		byEmail: map[string]*domain.User{},
	}
}

func (r *stubUserRepo) Save(_ context.Context, user *domain.User) error {
	r.saves++
	r.byID[user.ID()] = user
	r.byEmail[user.Email()] = user
	return nil
}

func (r *stubUserRepo) ByID(_ context.Context, id int64) (*domain.User, error) {
	if user, ok := r.byID[id]; ok {
		return user, nil
	}
	return nil, domain.ErrInvalidCredentials
}

func (r *stubUserRepo) ByEmail(_ context.Context, email string) (*domain.User, error) {
	if user, ok := r.byEmail[email]; ok {
		return user, nil
	}
	return nil, domain.ErrInvalidCredentials
}

func (r *stubUserRepo) ByLoginIdentifier(_ context.Context, identifier string) (*domain.User, error) {
	return r.ByEmail(context.Background(), identifier)
}

func (r *stubUserRepo) ByAPIToken(_ context.Context, _ string) (*domain.User, error) {
	return nil, domain.ErrInvalidCredentials
}

func (r *stubUserRepo) ByProductEmailsDisableCode(_ context.Context, _ string) (*domain.User, error) {
	return nil, domain.ErrInvalidCredentials
}

func (r *stubUserRepo) ByWeeklyReportDisableCode(_ context.Context, _ string) (*domain.User, error) {
	return nil, domain.ErrInvalidCredentials
}

type stubSessionRepo struct {
	deleted        []string
	deletedForUser []int64
}

func (r *stubSessionRepo) Put(_ context.Context, _ Session) error { return nil }
func (r *stubSessionRepo) UserIDBySession(_ context.Context, _ string) (int64, error) {
	return 0, ErrSessionNotFound
}
func (r *stubSessionRepo) Delete(_ context.Context, id string) error {
	r.deleted = append(r.deleted, id)
	return nil
}
func (r *stubSessionRepo) DeleteByUserID(_ context.Context, userID int64) error {
	r.deletedForUser = append(r.deletedForUser, userID)
	return nil
}

type stubPasswordResetRepo struct {
	saved    []PasswordResetToken
	nextID   int64
	consumed []int64
	deleted  []int64
}

func (r *stubPasswordResetRepo) Save(_ context.Context, t PasswordResetToken) error {
	r.nextID++
	t.ID = r.nextID
	r.saved = append(r.saved, t)
	return nil
}

func (r *stubPasswordResetRepo) ByTokenHash(_ context.Context, hash string) (PasswordResetToken, error) {
	for _, t := range r.saved {
		if t.TokenHash == hash {
			return t, nil
		}
	}
	return PasswordResetToken{}, ErrPasswordResetTokenInvalid
}

func (r *stubPasswordResetRepo) MarkConsumed(_ context.Context, id int64, at time.Time) error {
	for i := range r.saved {
		if r.saved[i].ID == id {
			r.saved[i].ConsumedAt = &at
		}
	}
	r.consumed = append(r.consumed, id)
	return nil
}

func (r *stubPasswordResetRepo) CountRecentForUser(_ context.Context, userID int64, since time.Time) (int, error) {
	count := 0
	for _, t := range r.saved {
		if t.UserID == userID && !t.CreatedAt.Before(since) {
			count++
		}
	}
	return count, nil
}

func (r *stubPasswordResetRepo) DeleteByID(_ context.Context, id int64) error {
	r.deleted = append(r.deleted, id)
	filtered := r.saved[:0]
	for _, t := range r.saved {
		if t.ID != id {
			filtered = append(filtered, t)
		}
	}
	r.saved = filtered
	return nil
}

type stubPasswordResetEmailer struct {
	calls int
	err   error
	last  struct {
		email string
		token string
	}
}

func (e *stubPasswordResetEmailer) SendPasswordResetEmail(_ context.Context, email, token string) error {
	e.calls++
	e.last.email = email
	e.last.token = token
	return e.err
}

type stubVerificationTokenRepo struct {
	byUser map[int64]VerificationToken
}

func newStubVerificationTokenRepo() *stubVerificationTokenRepo {
	return &stubVerificationTokenRepo{byUser: map[int64]VerificationToken{}}
}

func (r *stubVerificationTokenRepo) Save(_ context.Context, t VerificationToken) error {
	r.byUser[t.UserID] = t
	return nil
}

func (r *stubVerificationTokenRepo) ByToken(_ context.Context, token string) (VerificationToken, error) {
	for _, v := range r.byUser {
		if v.Token == token {
			return v, nil
		}
	}
	return VerificationToken{}, ErrVerificationTokenInvalid
}

func (r *stubVerificationTokenRepo) ByUserID(_ context.Context, userID int64) (VerificationToken, error) {
	if v, ok := r.byUser[userID]; ok {
		return v, nil
	}
	return VerificationToken{}, ErrVerificationTokenInvalid
}

func (r *stubVerificationTokenRepo) DeleteByUserID(_ context.Context, userID int64) error {
	delete(r.byUser, userID)
	return nil
}

type stubEmailVerifier struct {
	required bool
	sendErr  error
	calls    int
}

func (v *stubEmailVerifier) IsVerificationRequired(_ context.Context) bool { return v.required }
func (v *stubEmailVerifier) SendVerificationEmail(_ context.Context, _, _ string) error {
	v.calls++
	return v.sendErr
}

type stubSequence struct{ n int }

func (s *stubSequence) NextUserID() (int64, error)     { s.n++; return int64(s.n), nil }
func (s *stubSequence) NextSessionID() (string, error) { s.n++; return "sess", nil }
func (s *stubSequence) NextAPIToken() (string, error) {
	s.n++
	return "tok-" + time.Now().Format("150405.000000000"), nil
}

// --- helpers -------------------------------------------------------------

func newTestService(t *testing.T, users *stubUserRepo, sessions *stubSessionRepo, resets *stubPasswordResetRepo, mailer *stubPasswordResetEmailer, verifs *stubVerificationTokenRepo, verifier *stubEmailVerifier, fixedTime time.Time) *Service {
	t.Helper()
	service := NewService(Config{
		Users:                users,
		Sessions:             sessions,
		IDs:                  &stubSequence{},
		PasswordResetTokens:  resets,
		PasswordResetEmailer: mailer,
		VerificationTokens:   verifs,
		EmailVerifier:        verifier,
	})
	service.SetClockForTesting(func() time.Time { return fixedTime })
	return service
}

func seedActiveUser(t *testing.T, repo *stubUserRepo, id int64, email string) *domain.User {
	t.Helper()
	user, err := domain.RegisterUser(domain.RegisterParams{
		ID:       id,
		Email:    email,
		FullName: "Test Person",
		Password: "secret1",
		APIToken: "api-token",
	})
	if err != nil {
		t.Fatalf("register user: %v", err)
	}
	if err := repo.Save(context.Background(), user); err != nil {
		t.Fatalf("save: %v", err)
	}
	return user
}

func seedPendingUser(t *testing.T, repo *stubUserRepo, id int64, email string) *domain.User {
	t.Helper()
	user, err := domain.RegisterUser(domain.RegisterParams{
		ID:                  id,
		Email:               email,
		FullName:            "Pending Person",
		Password:            "secret1",
		APIToken:            "api-token-pending",
		PendingVerification: true,
	})
	if err != nil {
		t.Fatalf("register pending: %v", err)
	}
	if err := repo.Save(context.Background(), user); err != nil {
		t.Fatalf("save: %v", err)
	}
	return user
}

// --- RequestPasswordReset -----------------------------------------------

func TestRequestPasswordResetHappyPath(t *testing.T) {
	users := newStubUserRepo()
	sessions := &stubSessionRepo{}
	resets := &stubPasswordResetRepo{}
	mailer := &stubPasswordResetEmailer{}
	seedActiveUser(t, users, 1, "person@example.com")
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	service := newTestService(t, users, sessions, resets, mailer, newStubVerificationTokenRepo(), &stubEmailVerifier{}, now)

	if err := service.RequestPasswordReset(context.Background(), "Person@Example.com"); err != nil {
		t.Fatalf("request: %v", err)
	}
	if len(resets.saved) != 1 {
		t.Fatalf("expected one saved token, got %d", len(resets.saved))
	}
	if mailer.calls != 1 {
		t.Fatalf("expected one email, got %d", mailer.calls)
	}
	if mailer.last.token == "" || len(mailer.last.token) != 64 {
		t.Fatalf("expected 64-char hex token, got %q", mailer.last.token)
	}
	if resets.saved[0].TokenHash == mailer.last.token {
		t.Fatalf("token hash must differ from plaintext")
	}
	if !resets.saved[0].ExpiresAt.Equal(now.Add(time.Hour)) {
		t.Fatalf("expected expiry +1h, got %v", resets.saved[0].ExpiresAt)
	}
}

func TestRequestPasswordResetUnknownEmailSilent(t *testing.T) {
	users := newStubUserRepo()
	resets := &stubPasswordResetRepo{}
	mailer := &stubPasswordResetEmailer{}
	service := newTestService(t, users, &stubSessionRepo{}, resets, mailer, newStubVerificationTokenRepo(), &stubEmailVerifier{}, time.Now())

	if err := service.RequestPasswordReset(context.Background(), "ghost@example.com"); err != nil {
		t.Fatalf("unknown email should not error, got %v", err)
	}
	if len(resets.saved) != 0 || mailer.calls != 0 {
		t.Fatalf("expected no token saved / email sent, got saved=%d calls=%d", len(resets.saved), mailer.calls)
	}
}

func TestRequestPasswordResetRateLimitSilent(t *testing.T) {
	users := newStubUserRepo()
	resets := &stubPasswordResetRepo{}
	mailer := &stubPasswordResetEmailer{}
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	seedActiveUser(t, users, 1, "person@example.com")
	for i := 0; i < 5; i++ {
		_ = resets.Save(context.Background(), PasswordResetToken{
			UserID:    1,
			TokenHash: "seed-" + time.Duration(i).String(),
			ExpiresAt: now.Add(time.Hour),
			CreatedAt: now.Add(-10 * time.Minute),
		})
	}
	service := newTestService(t, users, &stubSessionRepo{}, resets, mailer, newStubVerificationTokenRepo(), &stubEmailVerifier{}, now)

	if err := service.RequestPasswordReset(context.Background(), "person@example.com"); err != nil {
		t.Fatalf("rate-limited request should not error, got %v", err)
	}
	if len(resets.saved) != 5 {
		t.Fatalf("expected no new token saved when rate-limited, got %d", len(resets.saved))
	}
	if mailer.calls != 0 {
		t.Fatalf("expected no email sent when rate-limited, got %d", mailer.calls)
	}
}

func TestRequestPasswordResetRollsBackTokenOnSendFailure(t *testing.T) {
	users := newStubUserRepo()
	resets := &stubPasswordResetRepo{}
	sendErr := errors.New("smtp boom")
	mailer := &stubPasswordResetEmailer{err: sendErr}
	seedActiveUser(t, users, 1, "person@example.com")
	service := newTestService(t, users, &stubSessionRepo{}, resets, mailer, newStubVerificationTokenRepo(), &stubEmailVerifier{}, time.Now())

	err := service.RequestPasswordReset(context.Background(), "person@example.com")
	if !errors.Is(err, sendErr) {
		t.Fatalf("expected send error to propagate, got %v", err)
	}
	if len(resets.saved) != 0 {
		t.Fatalf("expected token to be deleted after send failure, got %d remaining", len(resets.saved))
	}
}

// --- ResetPassword ------------------------------------------------------

func TestResetPasswordHappyPathRevokesSessions(t *testing.T) {
	users := newStubUserRepo()
	sessions := &stubSessionRepo{}
	resets := &stubPasswordResetRepo{}
	mailer := &stubPasswordResetEmailer{}
	user := seedActiveUser(t, users, 1, "person@example.com")
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	service := newTestService(t, users, sessions, resets, mailer, newStubVerificationTokenRepo(), &stubEmailVerifier{}, now)

	if err := service.RequestPasswordReset(context.Background(), "person@example.com"); err != nil {
		t.Fatalf("request: %v", err)
	}
	plaintext := mailer.last.token

	if err := service.ResetPassword(context.Background(), plaintext, "newsecret"); err != nil {
		t.Fatalf("reset: %v", err)
	}
	if !user.MatchesPassword("newsecret") {
		t.Fatalf("expected password to be updated to new secret")
	}
	if len(sessions.deletedForUser) != 1 || sessions.deletedForUser[0] != 1 {
		t.Fatalf("expected sessions revoked for user 1, got %v", sessions.deletedForUser)
	}
	if len(resets.consumed) != 1 {
		t.Fatalf("expected token consumed once, got %v", resets.consumed)
	}
}

func TestResetPasswordInvalidToken(t *testing.T) {
	users := newStubUserRepo()
	seedActiveUser(t, users, 1, "person@example.com")
	service := newTestService(t, users, &stubSessionRepo{}, &stubPasswordResetRepo{}, &stubPasswordResetEmailer{}, newStubVerificationTokenRepo(), &stubEmailVerifier{}, time.Now())

	err := service.ResetPassword(context.Background(), "bogus", "newsecret")
	if !errors.Is(err, ErrPasswordResetTokenInvalid) {
		t.Fatalf("expected invalid token, got %v", err)
	}
}

func TestResetPasswordExpiredToken(t *testing.T) {
	users := newStubUserRepo()
	resets := &stubPasswordResetRepo{}
	mailer := &stubPasswordResetEmailer{}
	seedActiveUser(t, users, 1, "person@example.com")
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	service := newTestService(t, users, &stubSessionRepo{}, resets, mailer, newStubVerificationTokenRepo(), &stubEmailVerifier{}, now)

	if err := service.RequestPasswordReset(context.Background(), "person@example.com"); err != nil {
		t.Fatalf("request: %v", err)
	}
	plaintext := mailer.last.token
	// Advance past expiry.
	service.SetClockForTesting(func() time.Time { return now.Add(2 * time.Hour) })

	err := service.ResetPassword(context.Background(), plaintext, "newsecret")
	if !errors.Is(err, ErrPasswordResetTokenExpired) {
		t.Fatalf("expected expired token, got %v", err)
	}
}

func TestResetPasswordConsumedToken(t *testing.T) {
	users := newStubUserRepo()
	resets := &stubPasswordResetRepo{}
	mailer := &stubPasswordResetEmailer{}
	seedActiveUser(t, users, 1, "person@example.com")
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	service := newTestService(t, users, &stubSessionRepo{}, resets, mailer, newStubVerificationTokenRepo(), &stubEmailVerifier{}, now)

	if err := service.RequestPasswordReset(context.Background(), "person@example.com"); err != nil {
		t.Fatalf("request: %v", err)
	}
	plaintext := mailer.last.token
	if err := service.ResetPassword(context.Background(), plaintext, "newsecret"); err != nil {
		t.Fatalf("first reset: %v", err)
	}
	err := service.ResetPassword(context.Background(), plaintext, "evenmore")
	if !errors.Is(err, ErrPasswordResetTokenConsumed) {
		t.Fatalf("expected consumed token, got %v", err)
	}
}

// --- ResendVerificationEmail -------------------------------------------

func TestResendVerificationEmailCooldownSilent(t *testing.T) {
	users := newStubUserRepo()
	verifs := newStubVerificationTokenRepo()
	verifier := &stubEmailVerifier{}
	seedPendingUser(t, users, 1, "pending@example.com")
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	verifs.byUser[1] = VerificationToken{
		UserID:    1,
		Token:     "initial",
		ExpiresAt: now.Add(24 * time.Hour),
		CreatedAt: now.Add(-30 * time.Second),
	}
	service := newTestService(t, users, &stubSessionRepo{}, &stubPasswordResetRepo{}, &stubPasswordResetEmailer{}, verifs, verifier, now)

	if err := service.ResendVerificationEmail(context.Background(), "pending@example.com"); err != nil {
		t.Fatalf("cooldown resend should silently succeed, got %v", err)
	}
	if verifier.calls != 0 {
		t.Fatalf("expected no email sent during cooldown, got %d", verifier.calls)
	}
	if verifs.byUser[1].Token != "initial" {
		t.Fatalf("expected existing token retained during cooldown, got %q", verifs.byUser[1].Token)
	}
}

func TestResendVerificationEmailUnknownEmailSilent(t *testing.T) {
	users := newStubUserRepo()
	verifs := newStubVerificationTokenRepo()
	verifier := &stubEmailVerifier{}
	service := newTestService(t, users, &stubSessionRepo{}, &stubPasswordResetRepo{}, &stubPasswordResetEmailer{}, verifs, verifier, time.Now())

	if err := service.ResendVerificationEmail(context.Background(), "ghost@example.com"); err != nil {
		t.Fatalf("unknown email should not error, got %v", err)
	}
	if verifier.calls != 0 {
		t.Fatalf("expected no email sent for unknown user, got %d", verifier.calls)
	}
}

func TestResendVerificationEmailSurfacesSiteURLError(t *testing.T) {
	users := newStubUserRepo()
	verifs := newStubVerificationTokenRepo()
	sendErr := errors.New("site_url not configured")
	verifier := &stubEmailVerifier{sendErr: sendErr}
	seedPendingUser(t, users, 1, "pending@example.com")
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	service := newTestService(t, users, &stubSessionRepo{}, &stubPasswordResetRepo{}, &stubPasswordResetEmailer{}, verifs, verifier, now)

	err := service.ResendVerificationEmail(context.Background(), "pending@example.com")
	if !errors.Is(err, sendErr) {
		t.Fatalf("expected emailer error to propagate, got %v", err)
	}
}

func TestResendVerificationEmailRotatesToken(t *testing.T) {
	users := newStubUserRepo()
	verifs := newStubVerificationTokenRepo()
	verifier := &stubEmailVerifier{}
	seedPendingUser(t, users, 1, "pending@example.com")
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	verifs.byUser[1] = VerificationToken{
		UserID:    1,
		Token:     "initial",
		ExpiresAt: now.Add(24 * time.Hour),
		CreatedAt: now.Add(-2 * time.Minute),
	}
	service := newTestService(t, users, &stubSessionRepo{}, &stubPasswordResetRepo{}, &stubPasswordResetEmailer{}, verifs, verifier, now)

	if err := service.ResendVerificationEmail(context.Background(), "pending@example.com"); err != nil {
		t.Fatalf("resend: %v", err)
	}
	if verifier.calls != 1 {
		t.Fatalf("expected one email sent, got %d", verifier.calls)
	}
	if verifs.byUser[1].Token == "initial" {
		t.Fatalf("expected token to be rotated")
	}
}
