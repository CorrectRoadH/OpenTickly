package application

import (
	"context"
	"time"

	"opentoggl/backend/apps/backend/internal/instance-admin/domain"
)

// BootstrapStore persists and queries the instance bootstrap state.
type BootstrapStore interface {
	GetBootstrapState(ctx context.Context) (domain.BootstrapState, error)
	CompleteBootstrap(ctx context.Context, adminEmail string, completedAt time.Time) error
}

// RegistrationPolicyStore persists and queries the registration policy.
type RegistrationPolicyStore interface {
	GetRegistrationPolicy(ctx context.Context) (domain.RegistrationPolicy, error)
	SetRegistrationPolicy(ctx context.Context, mode domain.RegistrationMode, updatedAt time.Time) error
}

// InstanceUserStore queries and mutates instance-level user state.
type InstanceUserStore interface {
	ListUsers(ctx context.Context, filter InstanceUserFilter) (InstanceUserPage, error)
	DisableUser(ctx context.Context, userID int64) error
	RestoreUser(ctx context.Context, userID int64) error
	CountUsers(ctx context.Context) (int, error)
}

// InstanceUserFilter defines query filters for the user list.
type InstanceUserFilter struct {
	Status  string
	Query   string
	Page    int
	PerPage int
}

// InstanceUserPage is a paginated user list result.
type InstanceUserPage struct {
	Users      []InstanceUserView
	TotalCount int
	Page       int
	PerPage    int
}

// InstanceUserView is a read model for an instance user.
type InstanceUserView struct {
	ID              int64
	Email           string
	Name            string
	Status          string
	IsInstanceAdmin bool
	CreatedAt       time.Time
	LastActiveAt    *time.Time
}

// InstanceConfigStore persists and queries instance-level configuration.
type InstanceConfigStore interface {
	GetConfig(ctx context.Context) (InstanceConfigView, error)
	UpdateConfig(ctx context.Context, update InstanceConfigUpdate) (InstanceConfigView, error)
}

// InstanceConfigView is the read model for instance config.
type InstanceConfigView struct {
	SiteURL                   string
	SenderEmail               string
	SenderName                string
	SMTPHost                  string
	SMTPPort                  int
	SMTPConfigured            bool
	EmailVerificationRequired bool
	RegistrationMode          string
	UpdatedAt                 time.Time
}

// InstanceConfigUpdate is the write model for config changes.
type InstanceConfigUpdate struct {
	SiteURL          *string
	SenderEmail      *string
	SenderName       *string
	SMTPHost         *string
	SMTPPort         *int
	SMTPUsername               *string
	SMTPPassword               *string
	EmailVerificationRequired *bool
	RegistrationMode           *string
}

// OrganizationLister lists all organizations for admin overview.
type OrganizationLister interface {
	ListOrganizations(ctx context.Context) ([]AdminOrganizationView, error)
}

// AdminOrganizationView is a read model for the admin org listing.
type AdminOrganizationView struct {
	ID             int64
	Name           string
	WorkspaceCount int
	MemberCount    int
}

// UserCreator creates a user account and optionally marks it as instance admin.
// This is a cross-module port fulfilled by the identity module.
type UserCreator interface {
	CreateUser(ctx context.Context, email string, password string, fullName string) (int64, error)
	MarkInstanceAdmin(ctx context.Context, userID int64) error
}

// EmailSender sends emails. Fulfilled by platform.EmailSender.
type EmailSender interface {
	IsConfigured() bool
	Send(ctx context.Context, to string, subject string, bodyHTML string) error
	SendTest(ctx context.Context, to string, siteURL string) error
}

// Clock provides the current time for testability.
type Clock interface {
	Now() time.Time
}
