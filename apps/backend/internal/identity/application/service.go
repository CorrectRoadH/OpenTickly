package application

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"opentoggl/backend/apps/backend/internal/identity/domain"
	"opentoggl/backend/apps/backend/internal/log"
)

var (
	ErrSessionNotFound            = errors.New("session not found")
	ErrUnknownPreferencesClient   = errors.New("unknown client")
	ErrUnknownAlphaFeature        = errors.New("invalid feature code(s)")
	ErrRegistrationClosed         = errors.New("registration is currently closed")
	ErrVerificationTokenExpired   = errors.New("verification token has expired")
	ErrVerificationTokenInvalid   = errors.New("verification token is invalid")
	ErrPasswordResetTokenInvalid  = errors.New("password reset token is invalid")
	ErrPasswordResetTokenExpired  = errors.New("password reset token has expired")
	ErrPasswordResetTokenConsumed = errors.New("password reset token already used")
	ErrVerificationResendCooldown = errors.New("verification email resend cooldown in effect")
)

// passwordResetTokenTTL is how long a password reset link is valid.
const passwordResetTokenTTL = time.Hour

// passwordResetRateLimit caps reset requests per user per hour.
const passwordResetRateLimit = 5

// verificationResendCooldown is the minimum interval between resends of a
// verification email for the same user.
const verificationResendCooldown = 60 * time.Second

const StopRunningTimerJobName = "identity.deactivated.stop_running_timer"

type Config struct {
	Users                UserRepository
	Sessions             SessionRepository
	PushServices         PushServiceRepository
	JobRecorder          JobRecorder
	RunningTimerLookup   RunningTimerLookup
	IDs                  Sequence
	KnownAlphaFeatures   []string
	RegistrationGuard    RegistrationGuard
	EmailVerifier        EmailVerifier
	VerificationTokens   VerificationTokenRepository
	PasswordResetTokens  PasswordResetTokenRepository
	PasswordResetEmailer PasswordResetEmailer
	Logger               log.Logger
}

type UserRepository interface {
	Save(context.Context, *domain.User) error
	ByID(context.Context, int64) (*domain.User, error)
	ByEmail(context.Context, string) (*domain.User, error)
	ByLoginIdentifier(context.Context, string) (*domain.User, error)
	ByAPIToken(context.Context, string) (*domain.User, error)
	ByProductEmailsDisableCode(context.Context, string) (*domain.User, error)
	ByWeeklyReportDisableCode(context.Context, string) (*domain.User, error)
}

type SessionRepository interface {
	Put(context.Context, Session) error
	UserIDBySession(context.Context, string) (int64, error)
	Delete(context.Context, string) error
	DeleteByUserID(ctx context.Context, userID int64) error
}

type PushServiceRepository interface {
	ListByUserID(context.Context, int64) ([]domain.PushService, error)
	Save(context.Context, domain.PushService) error
	Delete(context.Context, int64, domain.PushServiceToken) error
}

type JobRecorder interface {
	Record(context.Context, JobRecord) error
	RecordedForUser(context.Context, int64) ([]JobRecord, error)
}

type RunningTimerLookup interface {
	HasRunningTimer(context.Context, int64) (bool, error)
}

type Sequence interface {
	NextUserID() (int64, error)
	NextSessionID() (string, error)
	NextAPIToken() (string, error)
}

// RegistrationGuard checks whether new user registration is allowed.
// When nil, registration is always allowed (backward compatible).
type RegistrationGuard interface {
	CanRegister(ctx context.Context) error
}

// EmailVerifier checks whether email verification is required and sends verification emails.
// When nil, email verification is skipped (backward compatible).
type EmailVerifier interface {
	IsVerificationRequired(ctx context.Context) bool
	SendVerificationEmail(ctx context.Context, email string, token string) error
}

// VerificationTokenRepository stores and retrieves email verification tokens.
type VerificationTokenRepository interface {
	Save(ctx context.Context, token VerificationToken) error
	ByToken(ctx context.Context, token string) (VerificationToken, error)
	ByUserID(ctx context.Context, userID int64) (VerificationToken, error)
	DeleteByUserID(ctx context.Context, userID int64) error
}

type VerificationToken struct {
	UserID    int64
	Token     string
	ExpiresAt time.Time
	CreatedAt time.Time
}

// PasswordResetEmailer sends password reset links. Mirrors EmailVerifier.
type PasswordResetEmailer interface {
	SendPasswordResetEmail(ctx context.Context, email string, token string) error
}

// PasswordResetTokenRepository stores and retrieves password reset tokens.
type PasswordResetTokenRepository interface {
	Save(ctx context.Context, t PasswordResetToken) error
	ByTokenHash(ctx context.Context, hash string) (PasswordResetToken, error)
	MarkConsumed(ctx context.Context, id int64, at time.Time) error
	CountRecentForUser(ctx context.Context, userID int64, since time.Time) (int, error)
	DeleteByID(ctx context.Context, id int64) error
}

// PasswordResetToken is the stored record for a password reset request.
// Only the SHA-256 hash of the emailed token is persisted: the plaintext
// token is a credential delivered via email and stealing the DB must not
// yield valid reset links (contrast with workspace invite tokens, which
// are UI-visible plaintext for Copy-Link UX).
type PasswordResetToken struct {
	ID         int64
	UserID     int64
	TokenHash  string
	ExpiresAt  time.Time
	CreatedAt  time.Time
	ConsumedAt *time.Time
}

type RegisterInput struct {
	Email    string
	FullName string
	Password string
	Timezone string
	// EmailAlreadyVerified skips the email-verification flow entirely — the
	// caller has already proven ownership of the email (e.g. by presenting a
	// valid workspace invite token that was delivered to that address).
	EmailAlreadyVerified bool
}

type Session struct {
	ID     string
	UserID int64
}

type JobRecord struct {
	Name   string
	UserID int64
}

type UserSnapshot struct {
	ID                       int64
	Email                    string
	FullName                 string
	APIToken                 string
	Timezone                 string
	BeginningOfWeek          int
	CountryID                int64
	DefaultWorkspaceID       int64
	HasPassword              bool
	TwoFactorEnabled         bool
	SendProductEmails        bool
	SendWeeklyReport         bool
	ToSAcceptNeeded          bool
	ProductEmailsDisableCode string
	WeeklyReportDisableCode  string
	IsInstanceAdmin          bool
	AvatarStorageKey         string
}

type AuthenticatedSession struct {
	SessionID string
	User      UserSnapshot
}

type RegisterResult struct {
	Session              *AuthenticatedSession
	VerificationRequired bool
	Email                string
}

type Service struct {
	users                UserRepository
	sessions             SessionRepository
	pushServices         PushServiceRepository
	jobRecorder          JobRecorder
	runningTimerLookup   RunningTimerLookup
	ids                  Sequence
	knownAlphaFeatures   map[string]struct{}
	registrationGuard    RegistrationGuard
	emailVerifier        EmailVerifier
	verificationTokens   VerificationTokenRepository
	passwordResetTokens  PasswordResetTokenRepository
	passwordResetEmailer PasswordResetEmailer
	now                  func() time.Time
	logger               log.Logger
}

func NewService(cfg Config) *Service {
	knownAlphaFeatures := make(map[string]struct{}, len(cfg.KnownAlphaFeatures))
	for _, code := range cfg.KnownAlphaFeatures {
		knownAlphaFeatures[code] = struct{}{}
	}

	logger := cfg.Logger
	if logger == nil {
		logger = log.NopLogger()
	}

	return &Service{
		users:                cfg.Users,
		sessions:             cfg.Sessions,
		pushServices:         cfg.PushServices,
		jobRecorder:          cfg.JobRecorder,
		runningTimerLookup:   cfg.RunningTimerLookup,
		ids:                  cfg.IDs,
		knownAlphaFeatures:   knownAlphaFeatures,
		registrationGuard:    cfg.RegistrationGuard,
		emailVerifier:        cfg.EmailVerifier,
		verificationTokens:   cfg.VerificationTokens,
		passwordResetTokens:  cfg.PasswordResetTokens,
		passwordResetEmailer: cfg.PasswordResetEmailer,
		now:                  time.Now,
		logger:               logger,
	}
}

// SetClockForTesting overrides the service clock for deterministic tests.
func (service *Service) SetClockForTesting(now func() time.Time) {
	if now == nil {
		service.now = time.Now
		return
	}
	service.now = now
}

func (service *Service) ListPushServices(ctx context.Context, userID int64) ([]domain.PushService, error) {
	if _, err := service.users.ByID(ctx, userID); err != nil {
		return nil, err
	}
	if service.pushServices == nil {
		return []domain.PushService{}, nil
	}
	return service.pushServices.ListByUserID(ctx, userID)
}

func (service *Service) RegisterPushService(ctx context.Context, userID int64, token string) (domain.PushService, error) {
	pushService, err := domain.NewPushService(userID, token)
	if err != nil {
		return domain.PushService{}, err
	}
	if _, err := service.users.ByID(ctx, userID); err != nil {
		return domain.PushService{}, err
	}
	if service.pushServices == nil {
		return pushService, nil
	}
	return pushService, service.pushServices.Save(ctx, pushService)
}

func (service *Service) DeletePushService(ctx context.Context, userID int64, token string) error {
	pushToken, err := domain.NewPushServiceToken(token)
	if err != nil {
		return err
	}
	if _, err := service.users.ByID(ctx, userID); err != nil {
		return err
	}
	if service.pushServices == nil {
		return nil
	}
	return service.pushServices.Delete(ctx, userID, pushToken)
}

func (service *Service) Register(ctx context.Context, input RegisterInput) (RegisterResult, error) {
	service.logger.InfoContext(ctx, "registering user",
		"email", input.Email,
	)
	if service.registrationGuard != nil {
		if err := service.registrationGuard.CanRegister(ctx); err != nil {
			service.logger.WarnContext(ctx, "registration denied",
				"email", input.Email,
				"error", err.Error(),
			)
			return RegisterResult{}, err
		}
	}

	needsVerification := service.emailVerifier != nil && service.emailVerifier.IsVerificationRequired(ctx)
	if input.EmailAlreadyVerified {
		needsVerification = false
	}

	userID, err := service.ids.NextUserID()
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to generate user ID",
			"error", err.Error(),
		)
		return RegisterResult{}, err
	}
	apiToken, err := service.ids.NextAPIToken()
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to generate API token",
			"error", err.Error(),
		)
		return RegisterResult{}, err
	}

	user, err := domain.RegisterUser(domain.RegisterParams{
		ID:                  userID,
		Email:               input.Email,
		FullName:            input.FullName,
		Password:            input.Password,
		APIToken:            apiToken,
		Timezone:            input.Timezone,
		PendingVerification: needsVerification,
	})
	if err != nil {
		service.logger.WarnContext(ctx, "invalid registration data",
			"email", input.Email,
			"error", err.Error(),
		)
		return RegisterResult{}, err
	}

	if err := service.users.Save(ctx, user); err != nil {
		service.logger.ErrorContext(ctx, "failed to save user",
			"user_id", userID,
			"error", err.Error(),
		)
		return RegisterResult{}, err
	}

	if needsVerification {
		tokenStr, err := service.ids.NextAPIToken()
		if err != nil {
			return RegisterResult{}, err
		}
		vToken := VerificationToken{
			UserID:    userID,
			Token:     tokenStr,
			ExpiresAt: time.Now().Add(24 * time.Hour),
		}
		if err := service.verificationTokens.Save(ctx, vToken); err != nil {
			return RegisterResult{}, err
		}
		if err := service.emailVerifier.SendVerificationEmail(ctx, user.Email(), tokenStr); err != nil {
			service.logger.ErrorContext(ctx, "failed to send verification email",
				"user_id", userID,
				"error", err.Error(),
			)
			return RegisterResult{}, err
		}
		service.logger.InfoContext(ctx, "user registered, verification email sent",
			"user_id", userID,
		)
		return RegisterResult{
			VerificationRequired: true,
			Email:                user.Email(),
		}, nil
	}

	session, err := service.issueSession(ctx, user)
	if err != nil {
		return RegisterResult{}, err
	}
	service.logger.InfoContext(ctx, "user registered",
		"user_id", userID,
		"session_id", session.SessionID,
	)
	return RegisterResult{Session: &session}, nil
}

func (service *Service) VerifyEmail(ctx context.Context, token string) (AuthenticatedSession, error) {
	service.logger.InfoContext(ctx, "verifying email", "token_prefix", token[:min(8, len(token))])

	vToken, err := service.verificationTokens.ByToken(ctx, token)
	if err != nil {
		return AuthenticatedSession{}, ErrVerificationTokenInvalid
	}
	if time.Now().After(vToken.ExpiresAt) {
		return AuthenticatedSession{}, ErrVerificationTokenExpired
	}

	user, err := service.users.ByID(ctx, vToken.UserID)
	if err != nil {
		return AuthenticatedSession{}, err
	}
	if err := user.Activate(); err != nil {
		return AuthenticatedSession{}, err
	}
	if err := service.users.Save(ctx, user); err != nil {
		return AuthenticatedSession{}, err
	}
	if err := service.verificationTokens.DeleteByUserID(ctx, vToken.UserID); err != nil {
		service.logger.ErrorContext(ctx, "failed to clean up verification tokens",
			"user_id", vToken.UserID,
			"error", err.Error(),
		)
	}

	session, err := service.issueSession(ctx, user)
	if err != nil {
		return AuthenticatedSession{}, err
	}
	service.logger.InfoContext(ctx, "email verified, user activated",
		"user_id", user.ID(),
		"session_id", session.SessionID,
	)
	return session, nil
}

func (service *Service) LoginBasic(ctx context.Context, credentials domain.BasicCredentials) (AuthenticatedSession, error) {
	service.logger.InfoContext(ctx, "login attempt",
		"username", credentials.Username,
	)
	user, err := service.userForBasicCredentials(ctx, credentials)
	if err != nil {
		service.logger.WarnContext(ctx, "login failed - user not found",
			"username", credentials.Username,
			"error", err.Error(),
		)
		return AuthenticatedSession{}, err
	}

	if err := user.AuthenticateBasic(credentials); err != nil {
		service.logger.WarnContext(ctx, "login failed - authentication failed",
			"username", credentials.Username,
			"error", err.Error(),
		)
		return AuthenticatedSession{}, err
	}

	session, err := service.issueSession(ctx, user)
	if err != nil {
		return AuthenticatedSession{}, err
	}
	service.logger.InfoContext(ctx, "login successful",
		"user_id", user.ID(),
		"session_id", session.SessionID,
	)
	return session, nil
}

func (service *Service) ResolveBasicUser(ctx context.Context, credentials domain.BasicCredentials) (UserSnapshot, error) {
	user, err := service.userForBasicCredentials(ctx, credentials)
	if err != nil {
		return UserSnapshot{}, err
	}
	if err := user.AuthenticateBasic(credentials); err != nil {
		return UserSnapshot{}, err
	}

	return snapshotFromUser(user), nil
}

func (service *Service) ResolveCurrentUser(ctx context.Context, sessionID string) (UserSnapshot, error) {
	userID, err := service.sessions.UserIDBySession(ctx, sessionID)
	if err != nil {
		service.logger.WarnContext(ctx, "session not found",
			"session_id", sessionID,
			"error", err.Error(),
		)
		return UserSnapshot{}, err
	}

	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get user by session",
			"user_id", userID,
			"error", err.Error(),
		)
		return UserSnapshot{}, err
	}
	if !user.CanAuthenticate() {
		return UserSnapshot{}, user.AuthenticateBasic(domain.BasicCredentials{})
	}

	return snapshotFromUser(user), nil
}

func (service *Service) Logout(ctx context.Context, sessionID string) error {
	service.logger.InfoContext(ctx, "logout",
		"session_id", sessionID,
	)
	if err := service.sessions.Delete(ctx, sessionID); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete session",
			"session_id", sessionID,
			"error", err.Error(),
		)
		return err
	}
	return nil
}

func (service *Service) CreateDesktopLoginToken(ctx context.Context, userID int64) (string, error) {
	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return "", err
	}
	if !user.CanAuthenticate() {
		return "", user.AuthenticateBasic(domain.BasicCredentials{})
	}

	authenticated, err := service.issueSession(ctx, user)
	if err != nil {
		return "", err
	}
	return authenticated.SessionID, nil
}

func (service *Service) UpdateProfile(ctx context.Context, userID int64, update domain.ProfileUpdate) (UserSnapshot, error) {
	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return UserSnapshot{}, err
	}
	if err := user.UpdateProfile(update); err != nil {
		return UserSnapshot{}, err
	}
	if err := service.users.Save(ctx, user); err != nil {
		return UserSnapshot{}, err
	}

	return snapshotFromUser(user), nil
}

func (service *Service) UpdateAvatar(ctx context.Context, userID int64, storageKey string) (UserSnapshot, error) {
	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return UserSnapshot{}, err
	}
	user.SetAvatarStorageKey(storageKey)
	if err := service.users.Save(ctx, user); err != nil {
		return UserSnapshot{}, err
	}
	return snapshotFromUser(user), nil
}

func (service *Service) GetPreferences(ctx context.Context, userID int64, client string) (domain.Preferences, error) {
	if err := validatePreferencesClient(client); err != nil {
		return domain.Preferences{}, err
	}

	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return domain.Preferences{}, err
	}

	return user.Preferences(), nil
}

func (service *Service) UpdatePreferences(ctx context.Context, userID int64, client string, preferences domain.Preferences) error {
	if err := validatePreferencesClient(client); err != nil {
		return err
	}
	if err := service.validateAlphaFeatures(preferences); err != nil {
		return err
	}

	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return err
	}
	if err := user.UpdatePreferences(preferences); err != nil {
		return err
	}
	return service.users.Save(ctx, user)
}

func (service *Service) ListAlphaFeatures(ctx context.Context, userID int64, client string) ([]domain.AlphaFeature, error) {
	if err := validatePreferencesClient(client); err != nil {
		return nil, err
	}

	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	enabled := make(map[string]bool, len(user.Preferences().AlphaFeatures))
	for _, feature := range user.Preferences().AlphaFeatures {
		enabled[feature.Code] = feature.Enabled
	}

	codes := make([]string, 0, len(service.knownAlphaFeatures))
	for code := range service.knownAlphaFeatures {
		codes = append(codes, code)
	}
	sort.Strings(codes)

	features := make([]domain.AlphaFeature, 0, len(codes))
	for _, code := range codes {
		features = append(features, domain.AlphaFeature{
			Code:    code,
			Enabled: enabled[code],
		})
	}
	return features, nil
}

func (service *Service) ResetAPIToken(ctx context.Context, userID int64) (string, error) {
	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return "", err
	}

	token, err := service.ids.NextAPIToken()
	if err != nil {
		return "", err
	}
	if err := user.RotateAPIToken(token); err != nil {
		return "", err
	}
	if err := service.users.Save(ctx, user); err != nil {
		return "", err
	}

	return token, nil
}

func (service *Service) AcceptTOS(ctx context.Context, userID int64) error {
	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return err
	}
	if err := user.AcceptTermsOfService(); err != nil {
		return err
	}
	return service.users.Save(ctx, user)
}

func (service *Service) DisableProductEmailsByCode(ctx context.Context, disableCode string) error {
	user, err := service.users.ByProductEmailsDisableCode(ctx, disableCode)
	if err != nil {
		return err
	}
	if err := user.DisableProductEmails(); err != nil {
		return err
	}
	return service.users.Save(ctx, user)
}

func (service *Service) DisableWeeklyReportByCode(ctx context.Context, weeklyReportCode string) error {
	user, err := service.users.ByWeeklyReportDisableCode(ctx, weeklyReportCode)
	if err != nil {
		return err
	}
	if err := user.DisableWeeklyReport(); err != nil {
		return err
	}
	return service.users.Save(ctx, user)
}

func (service *Service) Deactivate(ctx context.Context, userID int64) error {
	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return err
	}
	rollback := *user
	if err := user.Deactivate(); err != nil {
		return err
	}

	// Identity only records the required side effect boundary here. Tracking owns
	// the actual timer stop behavior and can consume the job later.
	running := false
	if service.runningTimerLookup != nil {
		running, err = service.runningTimerLookup.HasRunningTimer(ctx, userID)
		if err != nil {
			return err
		}
	}

	// Persist the state change first, then roll it back if the job handoff fails.
	// With copy-on-write repositories this keeps deactivation and handoff atomic in
	// the current module tests instead of leaking a deactivated user on failure.
	if err := service.users.Save(ctx, user); err != nil {
		return err
	}

	if running && service.jobRecorder != nil {
		if err := service.jobRecorder.Record(ctx, JobRecord{
			Name:   StopRunningTimerJobName,
			UserID: userID,
		}); err != nil {
			if rollbackErr := service.users.Save(ctx, &rollback); rollbackErr != nil {
				return errors.Join(err, rollbackErr)
			}
			return err
		}
	}

	return nil
}

func (service *Service) AuthorizeBusinessWrite(ctx context.Context, userID int64) error {
	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return err
	}
	if !user.CanWriteBusinessData() {
		return user.AuthenticateBasic(domain.BasicCredentials{})
	}

	return nil
}

// RequestPasswordReset always succeeds from the caller's perspective so an
// attacker cannot use it to enumerate accounts. If the email maps to an
// active user, a reset token is minted and emailed. Rate-limited to 5
// requests per hour per user. Only email-sender misconfiguration (site_url
// or smtp missing) surfaces as an error so the admin can fix it.
func (service *Service) RequestPasswordReset(ctx context.Context, email string) error {
	normalized := strings.ToLower(strings.TrimSpace(email))
	if normalized == "" {
		return nil
	}

	user, err := service.users.ByEmail(ctx, normalized)
	if err != nil {
		service.logger.InfoContext(ctx, "password reset requested for unknown email",
			"email", normalized,
		)
		return nil
	}
	if user.State() != domain.UserStateActive {
		service.logger.InfoContext(ctx, "password reset requested for non-active user",
			"user_id", user.ID(),
			"state", string(user.State()),
		)
		return nil
	}

	if service.passwordResetTokens == nil {
		return errors.New("password reset tokens repository is not configured")
	}

	now := service.now()
	count, err := service.passwordResetTokens.CountRecentForUser(ctx, user.ID(), now.Add(-time.Hour))
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to count recent password reset tokens",
			"user_id", user.ID(),
			"error", err.Error(),
		)
		return err
	}
	if count >= passwordResetRateLimit {
		service.logger.WarnContext(ctx, "password reset rate-limited",
			"user_id", user.ID(),
			"recent_count", count,
		)
		return nil
	}

	plaintext, err := newPasswordResetToken()
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to mint password reset token",
			"user_id", user.ID(),
			"error", err.Error(),
		)
		return err
	}
	tokenHash := sha256Hex(plaintext)

	stored := PasswordResetToken{
		UserID:    user.ID(),
		TokenHash: tokenHash,
		ExpiresAt: now.Add(passwordResetTokenTTL),
		CreatedAt: now,
	}
	if err := service.passwordResetTokens.Save(ctx, stored); err != nil {
		service.logger.ErrorContext(ctx, "failed to save password reset token",
			"user_id", user.ID(),
			"error", err.Error(),
		)
		return err
	}

	if service.passwordResetEmailer == nil {
		return errors.New("password reset emailer is not configured")
	}
	if err := service.passwordResetEmailer.SendPasswordResetEmail(ctx, user.Email(), plaintext); err != nil {
		saved, lookupErr := service.passwordResetTokens.ByTokenHash(ctx, tokenHash)
		if lookupErr == nil {
			_ = service.passwordResetTokens.DeleteByID(ctx, saved.ID)
		}
		service.logger.ErrorContext(ctx, "failed to send password reset email",
			"user_id", user.ID(),
			"error", err.Error(),
		)
		return err
	}

	service.logger.InfoContext(ctx, "password reset email sent",
		"user_id", user.ID(),
	)
	return nil
}

// ResetPassword validates the token, updates the password, consumes the
// token, and revokes every session the user currently has.
func (service *Service) ResetPassword(ctx context.Context, token string, newPassword string) error {
	trimmed := strings.TrimSpace(token)
	if trimmed == "" {
		return ErrPasswordResetTokenInvalid
	}
	if service.passwordResetTokens == nil {
		return errors.New("password reset tokens repository is not configured")
	}

	tokenHash := sha256Hex(trimmed)
	stored, err := service.passwordResetTokens.ByTokenHash(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, ErrPasswordResetTokenInvalid) {
			return ErrPasswordResetTokenInvalid
		}
		return err
	}

	now := service.now()
	if stored.ConsumedAt != nil {
		return ErrPasswordResetTokenConsumed
	}
	if !stored.ExpiresAt.After(now) {
		return ErrPasswordResetTokenExpired
	}

	user, err := service.users.ByID(ctx, stored.UserID)
	if err != nil {
		return err
	}
	if err := user.ResetPassword(newPassword); err != nil {
		return err
	}

	// No cross-repo transaction primitive exists in this module yet; apply the
	// three writes in order and log if the follow-up steps fail. Token consume
	// happens before session purge so a retry after a transient session delete
	// failure cannot re-use the same reset link.
	if err := service.users.Save(ctx, user); err != nil {
		service.logger.ErrorContext(ctx, "failed to persist password reset",
			"user_id", user.ID(),
			"error", err.Error(),
		)
		return err
	}
	if err := service.passwordResetTokens.MarkConsumed(ctx, stored.ID, now); err != nil {
		service.logger.ErrorContext(ctx, "failed to mark password reset token consumed",
			"token_id", stored.ID,
			"error", err.Error(),
		)
		return err
	}
	if err := service.sessions.DeleteByUserID(ctx, user.ID()); err != nil {
		service.logger.ErrorContext(ctx, "failed to revoke sessions after password reset",
			"user_id", user.ID(),
			"error", err.Error(),
		)
		return err
	}

	service.logger.InfoContext(ctx, "password reset complete",
		"user_id", user.ID(),
	)
	return nil
}

// ResendVerificationEmail rotates the user's verification token and
// re-sends the email. Silently succeeds for unknown emails and users not
// in pending_verification (same non-enumerable guarantee as
// RequestPasswordReset). Per-user cooldown of 60 seconds is enforced via
// the VerificationToken row's created_at.
func (service *Service) ResendVerificationEmail(ctx context.Context, email string) error {
	normalized := strings.ToLower(strings.TrimSpace(email))
	if normalized == "" {
		return nil
	}

	user, err := service.users.ByEmail(ctx, normalized)
	if err != nil {
		service.logger.InfoContext(ctx, "verification resend requested for unknown email",
			"email", normalized,
		)
		return nil
	}
	if user.State() != domain.UserStatePendingVerification {
		service.logger.InfoContext(ctx, "verification resend requested for non-pending user",
			"user_id", user.ID(),
			"state", string(user.State()),
		)
		return nil
	}

	if service.verificationTokens == nil || service.emailVerifier == nil {
		return errors.New("verification tokens or email verifier is not configured")
	}

	now := service.now()
	existing, err := service.verificationTokens.ByUserID(ctx, user.ID())
	if err == nil && !existing.CreatedAt.IsZero() && now.Sub(existing.CreatedAt) < verificationResendCooldown {
		service.logger.InfoContext(ctx, "verification resend cooldown active",
			"user_id", user.ID(),
		)
		return nil
	}

	if err := service.verificationTokens.DeleteByUserID(ctx, user.ID()); err != nil {
		return err
	}

	tokenStr, err := service.ids.NextAPIToken()
	if err != nil {
		return err
	}
	fresh := VerificationToken{
		UserID:    user.ID(),
		Token:     tokenStr,
		ExpiresAt: now.Add(24 * time.Hour),
		CreatedAt: now,
	}
	if err := service.verificationTokens.Save(ctx, fresh); err != nil {
		return err
	}
	if err := service.emailVerifier.SendVerificationEmail(ctx, user.Email(), tokenStr); err != nil {
		service.logger.ErrorContext(ctx, "failed to resend verification email",
			"user_id", user.ID(),
			"error", err.Error(),
		)
		return err
	}

	service.logger.InfoContext(ctx, "verification email resent",
		"user_id", user.ID(),
	)
	return nil
}

// newPasswordResetToken generates 32 random bytes as hex (64 chars).
func newPasswordResetToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func sha256Hex(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func (service *Service) issueSession(ctx context.Context, user *domain.User) (AuthenticatedSession, error) {
	sessionID, err := service.ids.NextSessionID()
	if err != nil {
		return AuthenticatedSession{}, err
	}
	if err := service.sessions.Put(ctx, Session{
		ID:     sessionID,
		UserID: user.ID(),
	}); err != nil {
		return AuthenticatedSession{}, err
	}

	return AuthenticatedSession{
		SessionID: sessionID,
		User:      snapshotFromUser(user),
	}, nil
}

func (service *Service) userForBasicCredentials(ctx context.Context, credentials domain.BasicCredentials) (*domain.User, error) {
	if credentials.Password == "api_token" {
		return service.users.ByAPIToken(ctx, credentials.Username)
	}
	return service.users.ByLoginIdentifier(ctx, credentials.Username)
}

func (service *Service) validateAlphaFeatures(preferences domain.Preferences) error {
	if len(service.knownAlphaFeatures) == 0 {
		return nil
	}

	for _, feature := range preferences.AlphaFeatures {
		if _, ok := service.knownAlphaFeatures[feature.Code]; !ok {
			return fmt.Errorf("%w: %s", ErrUnknownAlphaFeature, feature.Code)
		}
	}

	return nil
}

func validatePreferencesClient(client string) error {
	switch client {
	case "", "web", "desktop":
		return nil
	default:
		return ErrUnknownPreferencesClient
	}
}

func snapshotFromUser(user *domain.User) UserSnapshot {
	return UserSnapshot{
		ID:                       user.ID(),
		Email:                    user.Email(),
		FullName:                 user.FullName(),
		APIToken:                 user.APIToken(),
		Timezone:                 user.Timezone(),
		BeginningOfWeek:          user.BeginningOfWeek(),
		CountryID:                user.CountryID(),
		DefaultWorkspaceID:       user.DefaultWorkspaceID(),
		HasPassword:              user.HasPassword(),
		TwoFactorEnabled:         false,
		SendProductEmails:        user.SendProductEmails(),
		SendWeeklyReport:         user.SendWeeklyReport(),
		ToSAcceptNeeded:          user.ToSAcceptNeeded(),
		ProductEmailsDisableCode: user.ProductEmailsDisableCode(),
		WeeklyReportDisableCode:  user.WeeklyReportDisableCode(),
		IsInstanceAdmin:          user.IsInstanceAdmin(),
		AvatarStorageKey:         user.AvatarStorageKey(),
	}
}
