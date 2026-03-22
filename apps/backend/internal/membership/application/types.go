package application

import (
	"context"

	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"
)

type WorkspaceMemberView struct {
	ID          int64
	WorkspaceID int64
	UserID      *int64
	Email       string
	FullName    string
	Role        membershipdomain.WorkspaceRole
	State       membershipdomain.WorkspaceMemberState
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

type Store interface {
	EnsureWorkspaceOwner(context.Context, EnsureWorkspaceOwnerCommand) (WorkspaceMemberView, error)
	ListWorkspaceMembers(context.Context, int64) ([]WorkspaceMemberView, error)
	FindWorkspaceMemberByID(context.Context, int64, int64) (WorkspaceMemberView, bool, error)
	FindWorkspaceMemberByUserID(context.Context, int64, int64) (WorkspaceMemberView, bool, error)
	InviteWorkspaceMember(context.Context, InviteWorkspaceMemberCommand) (WorkspaceMemberView, error)
	SaveWorkspaceMember(context.Context, WorkspaceMemberView) error
}
