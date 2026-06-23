package application

import (
	"context"
	"errors"
	"strings"

	"opentoggl/backend/apps/backend/internal/identity/domain"
)

// SSOIdentity is the verified identity an external OIDC provider asserted.
type SSOIdentity struct {
	Email    string
	FullName string
	Timezone string
}

// SSOLoginResult is the outcome of an SSO login. Provisioned reports whether a
// brand-new account was created, so the caller can run first-user bootstrap.
type SSOLoginResult struct {
	Session     AuthenticatedSession
	Provisioned bool
}

// LoginOrProvisionSSO authenticates an externally-verified identity. Existing
// accounts (matched by email) are logged in directly; a pending-verification
// account is activated because the IdP already proved email ownership. Unknown
// emails are auto-provisioned as a new account, subject to the registration
// guard, with a random unguessable password (the user can later set a real one
// via the password-reset flow to also enable local login).
func (service *Service) LoginOrProvisionSSO(ctx context.Context, identity SSOIdentity) (SSOLoginResult, error) {
	email := strings.ToLower(strings.TrimSpace(identity.Email))
	if !strings.Contains(email, "@") {
		return SSOLoginResult{}, domain.ErrInvalidEmail
	}

	user, err := service.users.ByEmail(ctx, email)
	if err == nil {
		session, loginErr := service.loginExistingSSOUser(ctx, user)
		if loginErr != nil {
			return SSOLoginResult{}, loginErr
		}
		return SSOLoginResult{Session: session}, nil
	}
	if !errors.Is(err, domain.ErrUserNotFound) {
		return SSOLoginResult{}, err
	}

	session, err := service.provisionSSOUser(ctx, email, identity)
	if err != nil {
		return SSOLoginResult{}, err
	}
	return SSOLoginResult{Session: session, Provisioned: true}, nil
}

func (service *Service) loginExistingSSOUser(ctx context.Context, user *domain.User) (AuthenticatedSession, error) {
	if user.State() == domain.UserStatePendingVerification {
		// The IdP already verified the email, so honour SSO as proof of ownership.
		if err := user.Activate(); err != nil {
			return AuthenticatedSession{}, err
		}
		if err := service.users.Save(ctx, user); err != nil {
			return AuthenticatedSession{}, err
		}
	}
	if !user.CanAuthenticate() {
		// Deactivated or deleted accounts must not be revived via SSO.
		return AuthenticatedSession{}, user.AuthenticateBasic(domain.BasicCredentials{})
	}

	session, err := service.issueSession(ctx, user)
	if err != nil {
		return AuthenticatedSession{}, err
	}
	service.logger.InfoContext(ctx, "sso login successful",
		"user_id", user.ID(),
		"session_id", session.SessionID,
	)
	return session, nil
}

func (service *Service) provisionSSOUser(ctx context.Context, email string, identity SSOIdentity) (AuthenticatedSession, error) {
	if service.registrationGuard != nil {
		if err := service.registrationGuard.CanRegister(ctx); err != nil {
			service.logger.WarnContext(ctx, "sso provisioning denied by registration guard",
				"email", email,
				"error", err.Error(),
			)
			return AuthenticatedSession{}, err
		}
	}

	userID, err := service.ids.NextUserID()
	if err != nil {
		return AuthenticatedSession{}, err
	}
	apiToken, err := service.ids.NextAPIToken()
	if err != nil {
		return AuthenticatedSession{}, err
	}
	// SSO accounts have no user-known password. A random 64-char secret keeps
	// the password-hash column populated without granting a usable login.
	randomPassword, err := newPasswordResetToken()
	if err != nil {
		return AuthenticatedSession{}, err
	}

	fullName := strings.TrimSpace(identity.FullName)
	if fullName == "" {
		fullName, _, _ = strings.Cut(email, "@")
	}

	user, err := domain.RegisterUser(domain.RegisterParams{
		ID:       userID,
		Email:    email,
		FullName: fullName,
		Password: randomPassword,
		APIToken: apiToken,
		Timezone: identity.Timezone,
		// The OIDC provider already verified the email, so skip our own flow.
		PendingVerification: false,
	})
	if err != nil {
		service.logger.WarnContext(ctx, "sso provisioning rejected invalid identity",
			"email", email,
			"error", err.Error(),
		)
		return AuthenticatedSession{}, err
	}
	if err := service.users.Save(ctx, user); err != nil {
		return AuthenticatedSession{}, err
	}

	session, err := service.issueSession(ctx, user)
	if err != nil {
		return AuthenticatedSession{}, err
	}
	service.logger.InfoContext(ctx, "sso user provisioned",
		"user_id", userID,
		"session_id", session.SessionID,
	)
	return session, nil
}
