package domain

import "errors"

type WorkspaceRole string

const (
	WorkspaceRoleOwner  WorkspaceRole = "owner"
	WorkspaceRoleAdmin  WorkspaceRole = "admin"
	WorkspaceRoleMember WorkspaceRole = "member"
)

type WorkspaceMemberState string

const (
	WorkspaceMemberStateInvited  WorkspaceMemberState = "invited"
	WorkspaceMemberStateActive   WorkspaceMemberState = "active"
	WorkspaceMemberStateDisabled WorkspaceMemberState = "disabled"
)

var (
	ErrInvalidWorkspaceRole           = errors.New("invalid workspace role")
	ErrInvalidWorkspaceMemberState    = errors.New("invalid workspace member state")
	ErrWorkspaceMemberAlreadyDisabled = errors.New("workspace member already disabled")
	ErrWorkspaceMemberNotDisabled     = errors.New("workspace member not disabled")
)

type WorkspaceMember struct {
	ID         int64
	Email      string
	FullName   string
	Role       WorkspaceRole
	State      WorkspaceMemberState
	HourlyRate float64
	LaborCost  float64
}

func NewWorkspaceMember(id int64, email, fullName string, role WorkspaceRole, state WorkspaceMemberState, hourlyRate, laborCost float64) (*WorkspaceMember, error) {
	if !isValidWorkspaceRole(role) {
		return nil, ErrInvalidWorkspaceRole
	}
	if !isValidWorkspaceMemberState(state) {
		return nil, ErrInvalidWorkspaceMemberState
	}

	return &WorkspaceMember{
		ID:         id,
		Email:      email,
		FullName:   fullName,
		Role:       role,
		State:      state,
		HourlyRate: hourlyRate,
		LaborCost:  laborCost,
	}, nil
}

func (m *WorkspaceMember) Disable() error {
	if m.State == WorkspaceMemberStateDisabled {
		return ErrWorkspaceMemberAlreadyDisabled
	}
	m.State = WorkspaceMemberStateDisabled
	return nil
}

func (m *WorkspaceMember) Restore() error {
	if m.State != WorkspaceMemberStateDisabled {
		return ErrWorkspaceMemberNotDisabled
	}
	m.State = WorkspaceMemberStateActive
	return nil
}

func isValidWorkspaceRole(role WorkspaceRole) bool {
	switch role {
	case WorkspaceRoleOwner, WorkspaceRoleAdmin, WorkspaceRoleMember:
		return true
	default:
		return false
	}
}

func isValidWorkspaceMemberState(state WorkspaceMemberState) bool {
	switch state {
	case WorkspaceMemberStateInvited, WorkspaceMemberStateActive, WorkspaceMemberStateDisabled:
		return true
	default:
		return false
	}
}
