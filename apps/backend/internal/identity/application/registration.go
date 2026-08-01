package application

import (
	"context"
	"strings"
	"time"

	"opentoggl/backend/apps/backend/internal/identity/domain"
)

// verificationTokenTTL is how long an email verification link stays valid.
// It doubles as the window during which a pending signup holds its email
// address against re-registration.
const verificationTokenTTL = 24 * time.Hour

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

	user, reclaimed, err := service.registrationUser(ctx, input, needsVerification)
	if err != nil {
		return RegisterResult{}, err
	}

	if err := service.users.Save(ctx, user); err != nil {
		service.logger.ErrorContext(ctx, "failed to save user",
			"user_id", user.ID(),
			"error", err.Error(),
		)
		return RegisterResult{}, err
	}

	// A reclaimed row may still carry the abandoned signup's verification
	// token. Activating without clearing it would leave a link that resolves
	// to an already-active user.
	if reclaimed && !needsVerification && service.verificationTokens != nil {
		if err := service.verificationTokens.DeleteByUserID(ctx, user.ID()); err != nil {
			service.logger.ErrorContext(ctx, "failed to clear reclaimed verification token",
				"user_id", user.ID(),
				"error", err.Error(),
			)
		}
	}

	if needsVerification {
		if err := service.startEmailVerification(ctx, user); err != nil {
			return RegisterResult{}, err
		}
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
		"user_id", user.ID(),
		"session_id", session.SessionID,
	)
	return RegisterResult{Session: &session}, nil
}

// registrationUser returns the unsaved user a registration should write: a
// brand-new account, or — when the address is held by an abandoned
// pending_verification signup — that same row re-seeded with the new
// credentials. Taking the row over is what keeps an unverified signup from
// squatting an address forever, since the email column is unique and pending
// rows are never cleaned up otherwise.
func (service *Service) registrationUser(ctx context.Context, input RegisterInput, needsVerification bool) (*domain.User, bool, error) {
	if existing := service.userForEmail(ctx, input.Email); existing != nil {
		if !service.canReclaimPendingRegistration(ctx, existing, input.EmailAlreadyVerified) {
			service.logger.WarnContext(ctx, "registration rejected - email already registered",
				"user_id", existing.ID(),
			)
			return nil, false, domain.ErrEmailAlreadyRegistered
		}
		apiToken, err := service.ids.NextAPIToken()
		if err != nil {
			return nil, false, err
		}
		if err := existing.RestartPendingRegistration(domain.RestartRegistrationParams{
			FullName: input.FullName,
			Password: input.Password,
			APIToken: apiToken,
			Timezone: input.Timezone,
		}); err != nil {
			return nil, false, err
		}
		if !needsVerification {
			if err := existing.Activate(); err != nil {
				return nil, false, err
			}
		}
		service.logger.InfoContext(ctx, "reclaiming abandoned pending registration",
			"user_id", existing.ID(),
		)
		return existing, true, nil
	}

	userID, err := service.ids.NextUserID()
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to generate user ID",
			"error", err.Error(),
		)
		return nil, false, err
	}
	apiToken, err := service.ids.NextAPIToken()
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to generate API token",
			"error", err.Error(),
		)
		return nil, false, err
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
		return nil, false, err
	}
	return user, false, nil
}

func (service *Service) userForEmail(ctx context.Context, email string) *domain.User {
	normalized := strings.ToLower(strings.TrimSpace(email))
	if normalized == "" {
		return nil
	}
	existing, err := service.users.ByEmail(ctx, normalized)
	if err != nil {
		return nil
	}
	return existing
}

// canReclaimPendingRegistration reports whether a registration may take over
// an existing account. Only pending_verification rows are ever reclaimable.
// Beyond that the rule is a live verification link protects the row: someone
// may still be about to click it, so the caller reports a duplicate email
// rather than swapping the credentials out from under a link already sitting
// in the address owner's inbox. ownershipProven lifts that protection — an
// invite signup presented a token delivered to the address itself, which
// outranks any claim an unverified signup has on it.
func (service *Service) canReclaimPendingRegistration(ctx context.Context, user *domain.User, ownershipProven bool) bool {
	if user.State() != domain.UserStatePendingVerification {
		return false
	}
	if ownershipProven {
		return true
	}
	if service.verificationTokens == nil {
		return true
	}
	token, err := service.verificationTokens.ByUserID(ctx, user.ID())
	if err != nil {
		return true
	}
	return service.now().After(token.ExpiresAt)
}

// startEmailVerification issues a fresh verification link and mails it. A send
// failure discards the token again so the pending row stays reclaimable by an
// immediate retry instead of stranding an account nobody can verify or
// re-register.
func (service *Service) startEmailVerification(ctx context.Context, user *domain.User) error {
	tokenStr, err := service.ids.NextAPIToken()
	if err != nil {
		return err
	}
	now := service.now()
	vToken := VerificationToken{
		UserID:    user.ID(),
		Token:     tokenStr,
		ExpiresAt: now.Add(verificationTokenTTL),
		CreatedAt: now,
	}
	if err := service.verificationTokens.Save(ctx, vToken); err != nil {
		return err
	}
	if err := service.emailVerifier.SendVerificationEmail(ctx, user.Email(), tokenStr); err != nil {
		service.logger.ErrorContext(ctx, "failed to send verification email",
			"user_id", user.ID(),
			"error", err.Error(),
		)
		if cleanupErr := service.verificationTokens.DeleteByUserID(ctx, user.ID()); cleanupErr != nil {
			service.logger.ErrorContext(ctx, "failed to discard unsent verification token",
				"user_id", user.ID(),
				"error", cleanupErr.Error(),
			)
		}
		return err
	}
	service.logger.InfoContext(ctx, "user registered, verification email sent",
		"user_id", user.ID(),
	)
	return nil
}
