package application

import (
	"context"
	"errors"
	"strings"

	"opentoggl/backend/apps/backend/internal/identity/domain"
)

var (
	ErrOIDCIdentity        = errors.New("invalid OpenID Connect identity")
	ErrOIDCEmailUnverified = errors.New("the identity provider did not verify this email")
	ErrOIDCEmailNotAllowed = errors.New("this email domain is not allowed to sign in")
	ErrOIDCAccountNotFound = errors.New("no account matches this identity and provisioning is disabled")
)

// OIDCIdentity is a verified ID token projected to what the login needs. The
// (Issuer, Subject) pair is the identity key; Email is profile data that may
// link to an existing local account only when the provider verified it.
type OIDCIdentity struct {
	Issuer        string
	Subject       string
	Email         string
	EmailVerified bool
	FullName      string
	Timezone      string
}

// OIDCPolicy is the instance administrator's decision about who may enter.
type OIDCPolicy struct {
	AutoProvision       bool
	AllowedEmailDomains []string
}

// OIDCLoginWrite carries the application's decisions into the transaction:
// AllowEmailLink is true only for a verified email on an allowed domain, and
// NewUser is present only when provisioning is enabled on top of that.
type OIDCLoginWrite struct {
	Identity       OIDCIdentity
	AllowEmailLink bool
	NewUser        *domain.User
	SessionID      string
}

type OIDCStoredLogin struct {
	User        *domain.User
	Provisioned bool
	Linked      bool
}

// OIDCRepository owns the single transaction that resolves an identity to a
// user (existing binding, verified-email link, or provisioning) and issues the
// session.
type OIDCRepository interface {
	Login(context.Context, OIDCLoginWrite) (OIDCStoredLogin, error)
}

// OIDCLoginResult reports how the identity was resolved.
type OIDCLoginResult struct {
	Session     AuthenticatedSession
	Provisioned bool
	Linked      bool
}

// LoginOrProvisionOIDC turns a verified instance-level OIDC identity into a
// session. Linking by email and provisioning both require a verified email and
// an allowed domain; an existing binding needs neither.
func (service *Service) LoginOrProvisionOIDC(ctx context.Context, identity OIDCIdentity, policy OIDCPolicy) (OIDCLoginResult, error) {
	if service.oidc == nil || strings.TrimSpace(identity.Issuer) == "" || strings.TrimSpace(identity.Subject) == "" {
		return OIDCLoginResult{}, ErrOIDCIdentity
	}
	identity.Email = strings.ToLower(strings.TrimSpace(identity.Email))
	allowEmailLink := identity.Email != "" && identity.EmailVerified && emailDomainAllowed(identity.Email, policy.AllowedEmailDomains)
	var candidate *domain.User
	if allowEmailLink && policy.AutoProvision {
		user, err := service.newOIDCUser(identity)
		if err != nil {
			return OIDCLoginResult{}, err
		}
		candidate = user
	}
	sid, err := service.ids.NextSessionID()
	if err != nil {
		return OIDCLoginResult{}, err
	}
	stored, err := service.oidc.Login(ctx, OIDCLoginWrite{Identity: identity, AllowEmailLink: allowEmailLink, NewUser: candidate, SessionID: sid})
	if err != nil {
		if errors.Is(err, ErrOIDCAccountNotFound) {
			return OIDCLoginResult{}, service.explainOIDCRejection(identity, policy)
		}
		return OIDCLoginResult{}, err
	}
	return OIDCLoginResult{
		Session:     AuthenticatedSession{SessionID: sid, User: snapshotFromUser(stored.User)},
		Provisioned: stored.Provisioned,
		Linked:      stored.Linked,
	}, nil
}

// explainOIDCRejection picks the most specific reason a new identity could not
// be linked or provisioned, so the login page can tell the user what to do.
func (service *Service) explainOIDCRejection(identity OIDCIdentity, policy OIDCPolicy) error {
	switch {
	case identity.Email == "" || !identity.EmailVerified:
		return ErrOIDCEmailUnverified
	case !emailDomainAllowed(identity.Email, policy.AllowedEmailDomains):
		return ErrOIDCEmailNotAllowed
	default:
		return ErrOIDCAccountNotFound
	}
}

func (service *Service) newOIDCUser(identity OIDCIdentity) (*domain.User, error) {
	id, err := service.ids.NextUserID()
	if err != nil {
		return nil, err
	}
	apiToken, err := service.ids.NextAPIToken()
	if err != nil {
		return nil, err
	}
	password, err := newPasswordResetToken()
	if err != nil {
		return nil, err
	}
	name := strings.TrimSpace(identity.FullName)
	if name == "" {
		name, _, _ = strings.Cut(identity.Email, "@")
	}
	return domain.RegisterUser(domain.RegisterParams{ID: id, Email: identity.Email, FullName: name, Password: password, APIToken: apiToken, Timezone: identity.Timezone})
}

func emailDomainAllowed(email string, allowed []string) bool {
	if len(allowed) == 0 {
		return true
	}
	at := strings.LastIndex(email, "@")
	if at < 0 || at == len(email)-1 {
		return false
	}
	domain := email[at+1:]
	for _, candidate := range allowed {
		if strings.EqualFold(domain, candidate) {
			return true
		}
	}
	return false
}
