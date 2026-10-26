package application

import (
	"context"
	"errors"
	"strings"

	"opentoggl/backend/apps/backend/internal/identity/domain"
)

var (
	ErrSSOIdentity             = errors.New("invalid SAML identity")
	ErrSSOAccountExists        = errors.New("account exists; sign in locally and link SSO")
	ErrSSOConfigurationChanged = errors.New("SSO configuration changed")
	ErrSSOBindingTaken         = errors.New("SSO identity is already linked")
	ErrSSOVerificationRequired = errors.New("complete local registration and email verification before linking SSO")
	ErrSSOMembershipRequired   = errors.New("active workspace membership is required")
)

// SSOIdentity contains a protocol-verified, workspace-scoped subject. Email is
// profile data for a new account, never an authorization key for an existing one.
type SSOIdentity struct {
	WorkspaceID      int64
	Revision         int64
	IdentityRevision int64
	SubjectKey       string
	Email            string
	FullName         string
	Timezone         string
}

type SSOLoginResult struct {
	Session     AuthenticatedSession
	Provisioned bool
}

type SSOLoginWrite struct {
	Identity  SSOIdentity
	NewUser   *domain.User
	SessionID string
}

type SSOStoredLogin struct {
	User        *domain.User
	Provisioned bool
}

type SSOLinkWrite struct {
	Identity  SSOIdentity
	UserID    int64
	SessionID string
}

type SSOUnlinkWrite struct {
	WorkspaceID int64
	UserID      int64
	SessionID   string
	Password    string
}

type SSOBinding struct {
	WorkspaceID   int64
	WorkspaceName string
	ProfileName   string
	Enabled       bool
}

// SSORepository owns a single transaction for each authorization-sensitive write.
type SSORepository interface {
	Bound(context.Context, SSOIdentity) (bool, error)
	Login(context.Context, SSOLoginWrite) (SSOStoredLogin, error)
	Link(context.Context, SSOLinkWrite) error
	Unlink(context.Context, SSOUnlinkWrite) error
	List(context.Context, int64) ([]SSOBinding, error)
}

func (service *Service) LoginOrProvisionSSO(ctx context.Context, identity SSOIdentity) (SSOLoginResult, error) {
	if service.sso == nil || identity.WorkspaceID <= 0 || identity.Revision <= 0 || identity.IdentityRevision <= 0 || len(identity.SubjectKey) != 64 {
		return SSOLoginResult{}, ErrSSOIdentity
	}
	bound, err := service.sso.Bound(ctx, identity)
	if err != nil {
		return SSOLoginResult{}, err
	}
	var candidate *domain.User
	if !bound {
		candidate, err = service.newSSOUser(identity)
		if err != nil {
			return SSOLoginResult{}, err
		}
	}
	sid, err := service.ids.NextSessionID()
	if err != nil {
		return SSOLoginResult{}, err
	}
	stored, err := service.sso.Login(ctx, SSOLoginWrite{Identity: identity, NewUser: candidate, SessionID: sid})
	if err != nil {
		return SSOLoginResult{}, err
	}
	return SSOLoginResult{Session: AuthenticatedSession{SessionID: sid, User: snapshotFromUser(stored.User)}, Provisioned: stored.Provisioned}, nil
}

func (service *Service) newSSOUser(identity SSOIdentity) (*domain.User, error) {
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
	email := strings.ToLower(strings.TrimSpace(identity.Email))
	name := strings.TrimSpace(identity.FullName)
	if name == "" {
		name, _, _ = strings.Cut(email, "@")
	}
	return domain.RegisterUser(domain.RegisterParams{ID: id, Email: email, FullName: name, Password: password, APIToken: apiToken, Timezone: identity.Timezone})
}

func (service *Service) LinkSSO(ctx context.Context, input SSOLinkWrite) error {
	if service.sso == nil {
		return ErrSSOIdentity
	}
	return service.sso.Link(ctx, input)
}

func (service *Service) UnlinkSSO(ctx context.Context, input SSOUnlinkWrite) error {
	if service.sso == nil {
		return ErrSSOIdentity
	}
	return service.sso.Unlink(ctx, input)
}

func (service *Service) ListSSO(ctx context.Context, userID int64) ([]SSOBinding, error) {
	if service.sso == nil {
		return nil, ErrSSOIdentity
	}
	return service.sso.List(ctx, userID)
}
