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
	ID          int64
	WorkspaceID int64
	UserID      *int64
	Email       string
	FullName    string
	Role        membershipdomain.WorkspaceRole
	State       membershipdomain.WorkspaceMemberState
	IsDirect    bool
	GroupIDs    []int64
	HourlyRate  *float64
	LaborCost   *float64
}

type EnsureWorkspaceOwnerCommand struct {
	WorkspaceID int64
	UserID      int64
}

type InviteWorkspaceMemberCommand struct {
	WorkspaceID int64
	RequestedBy int64
	Email       string
	Role        *membershipdomain.WorkspaceRole
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
	InviteWorkspaceMember(context.Context, InviteWorkspaceMemberCommand) (WorkspaceMemberView, error)
	SaveWorkspaceMember(context.Context, WorkspaceMemberView) error
	CreateOrganizationInvitations(context.Context, CreateOrganizationInvitationsCommand) ([]OrganizationInvitationView, error)
	GetOrganizationInvitationByCode(context.Context, string) (OrganizationInvitationView, bool, error)
	GetOrganizationInvitationByID(context.Context, int64, int64) (OrganizationInvitationView, bool, error)
	UpdateOrganizationInvitationStatus(context.Context, string, InvitationStatus) (OrganizationInvitationView, bool, error)
	TouchOrganizationInvitation(context.Context, int64, int64) (OrganizationInvitationView, bool, error)
}
