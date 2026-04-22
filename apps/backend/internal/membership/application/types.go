package application

import (
	"context"
	"time"

	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"
)

type OrganizationMemberView struct {
	ID             int64
	OrganizationID int64
	UserID         int64
	Role           membershipdomain.OrganizationRole
	State          membershipdomain.OrganizationMemberState
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type EnsureOrganizationMemberCommand struct {
	OrganizationID int64
	UserID         int64
	Role           membershipdomain.OrganizationRole
}

type WorkspaceMemberView struct {
	ID                   int64
	WorkspaceID          int64
	UserID               *int64
	Email                string
	FullName             string
	Role                 membershipdomain.WorkspaceRole
	State                membershipdomain.WorkspaceMemberState
	IsDirect             bool
	GroupIDs             []int64
	HourlyRate           *float64
	LaborCost            *float64
	InviteToken          *string
	InviteTokenExpiresAt *time.Time
}

type EnsureWorkspaceOwnerCommand struct {
	WorkspaceID int64
	UserID      int64
}

type InviteWorkspaceMemberCommand struct {
	WorkspaceID          int64
	RequestedBy          int64
	Email                string
	Role                 *membershipdomain.WorkspaceRole
	InviteToken          string
	InviteTokenExpiresAt time.Time
}

// ReinviteWorkspaceMemberCommand rotates the invite token on an existing
// member row whose state permits re-issuing an invite (currently "invited" or
// "removed"). It is the idempotent variant of InviteWorkspaceMember used when a
// second Invite call targets an email that is already present on the row.
type ReinviteWorkspaceMemberCommand struct {
	WorkspaceID          int64
	MemberID             int64
	InvitedBy            int64
	Role                 *membershipdomain.WorkspaceRole
	InviteToken          string
	InviteTokenExpiresAt time.Time
}

// ResendWorkspaceInviteCommand refreshes an invited member's invite token and
// expiry. It is separate from InviteWorkspaceMemberCommand because invite
// creation flows through a different store path with a unique conflict
// fingerprint.
type ResendWorkspaceInviteCommand struct {
	WorkspaceID          int64
	MemberID             int64
	RequestedBy          int64
	InviteToken          string
	InviteTokenExpiresAt time.Time
}

// AcceptInviteCommand claims a workspace invite for an already-authenticated
// user. Callers supply the session user's email so the store can enforce the
// invite email match before performing the state transition.
type AcceptInviteCommand struct {
	Token     string
	UserID    int64
	UserEmail string
}

// AcceptInviteSignupCommand carries the signup fields required when a
// recipient accepts their invite without an existing account.
type AcceptInviteSignupCommand struct {
	Token    string
	FullName string
	Password string
	Timezone string
}

// AcceptedInviteView is the summary returned after a successful claim.
type AcceptedInviteView struct {
	WorkspaceID      int64
	WorkspaceName    string
	OrganizationID   int64
	OrganizationName string
}

// InviteTokenStatus captures the lookup outcome for a potentially unknown,
// expired, or already-consumed invite token.
type InviteTokenStatus string

const (
	InviteTokenStatusPending  InviteTokenStatus = "pending"
	InviteTokenStatusExpired  InviteTokenStatus = "expired"
	InviteTokenStatusConsumed InviteTokenStatus = "consumed"
	InviteTokenStatusNotFound InviteTokenStatus = "not_found"
)

// InviteTokenInfoView is the public projection returned by the invite lookup
// endpoint. It contains only the fields required to render the accept page
// and never leaks unrelated membership data.
type InviteTokenInfoView struct {
	WorkspaceID      int64
	WorkspaceName    string
	OrganizationID   int64
	OrganizationName string
	Email            string
	InviterName      string
	ExpiresAt        *time.Time
	Status           InviteTokenStatus
}

type UpdateWorkspaceMemberRateCostCommand struct {
	WorkspaceID int64
	MemberID    int64
	RequestedBy int64
	HourlyRate  *float64
	LaborCost   *float64
}

type UpdateWorkspaceMemberCommand struct {
	WorkspaceID int64
	MemberID    int64
	RequestedBy int64
	Role        *membershipdomain.WorkspaceRole
	HourlyRate  *float64
	LaborCost   *float64
}

type InvitationStatus string

const (
	InvitationStatusPending  InvitationStatus = "pending"
	InvitationStatusAccepted InvitationStatus = "accepted"
	InvitationStatusRejected InvitationStatus = "rejected"
)

type OrganizationInvitationWorkspaceView struct {
	WorkspaceID     int64
	UserID          *int64
	WorkspaceUserID *int64
}

type OrganizationInvitationView struct {
	ID               int64
	OrganizationID   int64
	OrganizationName string
	Code             string
	Email            string
	SenderUserID     int64
	SenderName       string
	SenderEmail      string
	RecipientUserID  *int64
	Status           InvitationStatus
	Workspaces       []OrganizationInvitationWorkspaceView
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type InvitationWorkspaceAssignment struct {
	WorkspaceID int64
}

type OrganizationInvitationDraft struct {
	Email string
	Code  string
}

type CreateOrganizationInvitationsCommand struct {
	OrganizationID   int64
	OrganizationName string
	SenderUserID     int64
	SenderName       string
	SenderEmail      string
	Emails           []string
	Invitations      []OrganizationInvitationDraft
	Workspaces       []InvitationWorkspaceAssignment
}

type Store interface {
	EnsureOrganizationMember(context.Context, EnsureOrganizationMemberCommand) (OrganizationMemberView, error)
	ListOrganizationMembers(context.Context, int64) ([]OrganizationMemberView, error)
	FindOrganizationMemberByUserID(context.Context, int64, int64) (OrganizationMemberView, bool, error)

	EnsureWorkspaceOwner(context.Context, EnsureWorkspaceOwnerCommand) (WorkspaceMemberView, error)
	ListWorkspaceMembers(context.Context, int64) ([]WorkspaceMemberView, error)
	FindWorkspaceMemberByID(context.Context, int64, int64) (WorkspaceMemberView, bool, error)
	FindWorkspaceMemberByUserID(context.Context, int64, int64) (WorkspaceMemberView, bool, error)
	FindWorkspaceMemberByEmail(context.Context, int64, string) (WorkspaceMemberView, bool, error)
	InviteWorkspaceMember(context.Context, InviteWorkspaceMemberCommand) (WorkspaceMemberView, error)
	ReinviteWorkspaceMember(context.Context, ReinviteWorkspaceMemberCommand) (WorkspaceMemberView, error)
	ResendWorkspaceInvite(context.Context, ResendWorkspaceInviteCommand) (WorkspaceMemberView, error)
	FindInviteByToken(context.Context, string) (InviteTokenInfoView, bool, error)
	AcceptInvite(context.Context, AcceptInviteCommand) (AcceptedInviteView, error)
	SaveWorkspaceMember(context.Context, WorkspaceMemberView) error
	CreateOrganizationInvitations(context.Context, CreateOrganizationInvitationsCommand) ([]OrganizationInvitationView, error)
	GetOrganizationInvitationByCode(context.Context, string) (OrganizationInvitationView, bool, error)
	GetOrganizationInvitationByID(context.Context, int64, int64) (OrganizationInvitationView, bool, error)
	UpdateOrganizationInvitationStatus(context.Context, string, InvitationStatus) (OrganizationInvitationView, bool, error)
	TouchOrganizationInvitation(context.Context, int64, int64) (OrganizationInvitationView, bool, error)
}
