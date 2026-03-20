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
	WorkspaceMemberStateJoined   WorkspaceMemberState = "joined"
	WorkspaceMemberStateDisabled WorkspaceMemberState = "disabled"
	WorkspaceMemberStateRestored WorkspaceMemberState = "restored"
	WorkspaceMemberStateRemoved  WorkspaceMemberState = "removed"
	// Backward-compatible alias for older code/tests that still reference "active".
	WorkspaceMemberStateActive WorkspaceMemberState = WorkspaceMemberStateJoined
)

var (
	ErrInvalidWorkspaceRole                  = errors.New("invalid workspace role")
	ErrInvalidWorkspaceMemberState           = errors.New("invalid workspace member state")
	ErrWorkspaceMemberNotInvited             = errors.New("workspace member not invited")
	ErrWorkspaceMemberCannotDisableFromState = errors.New("workspace member cannot be disabled from current state")
	ErrWorkspaceMemberAlreadyDisabled        = errors.New("workspace member already disabled")
	ErrWorkspaceMemberNotDisabled            = errors.New("workspace member not disabled")
	ErrWorkspaceMemberRemoved                = errors.New("workspace member already removed")
	ErrWorkspaceMemberAlreadyRemoved         = errors.New("workspace member already removed")
)

type WorkspaceMemberLifecycleFact struct {
	State WorkspaceMemberState
}

type WorkspaceMember struct {
	ID         int64
	Email      string
	FullName   string
	Role       WorkspaceRole
	State      WorkspaceMemberState
	HourlyRate float64
	LaborCost  float64
	facts      []WorkspaceMemberLifecycleFact
}

/*
NewWorkspaceMember constructs a workspace membership aggregate and records the
initial lifecycle fact so lifecycle transitions remain queryable in-memory.
*/
func NewWorkspaceMember(id int64, email, fullName string, role WorkspaceRole, state WorkspaceMemberState, hourlyRate, laborCost float64) (*WorkspaceMember, error) {
	if !isValidWorkspaceRole(role) {
		return nil, ErrInvalidWorkspaceRole
	}
	if !isValidWorkspaceMemberState(state) {
		return nil, ErrInvalidWorkspaceMemberState
	}

	member := &WorkspaceMember{
		ID:         id,
		Email:      email,
		FullName:   fullName,
		Role:       role,
		State:      state,
		HourlyRate: hourlyRate,
		LaborCost:  laborCost,
	}
	member.recordLifecycleFact(state)
	return member, nil
}

/*
Join moves an invited member into joined state.
*/
func (m *WorkspaceMember) Join() error {
	if m.State == WorkspaceMemberStateRemoved {
		return ErrWorkspaceMemberRemoved
	}
	if m.State != WorkspaceMemberStateInvited {
		return ErrWorkspaceMemberNotInvited
	}

	m.State = WorkspaceMemberStateJoined
	m.recordLifecycleFact(m.State)
	return nil
}

/*
Disable moves a joined/restored member into disabled state.
*/
func (m *WorkspaceMember) Disable() error {
	if m.State == WorkspaceMemberStateRemoved {
		return ErrWorkspaceMemberRemoved
	}
	if m.State == WorkspaceMemberStateDisabled {
		return ErrWorkspaceMemberAlreadyDisabled
	}
	if m.State != WorkspaceMemberStateJoined && m.State != WorkspaceMemberStateRestored {
		return ErrWorkspaceMemberCannotDisableFromState
	}

	m.State = WorkspaceMemberStateDisabled
	m.recordLifecycleFact(m.State)
	return nil
}

/*
Restore moves a disabled member into restored state.
*/
func (m *WorkspaceMember) Restore() error {
	if m.State == WorkspaceMemberStateRemoved {
		return ErrWorkspaceMemberRemoved
	}
	if m.State != WorkspaceMemberStateDisabled {
		return ErrWorkspaceMemberNotDisabled
	}

	m.State = WorkspaceMemberStateRestored
	m.recordLifecycleFact(m.State)
	return nil
}

/*
Remove marks a member as removed to terminate future access while preserving
historical lifecycle facts for downstream projections/audit use.
*/
func (m *WorkspaceMember) Remove() error {
	if m.State == WorkspaceMemberStateRemoved {
		return ErrWorkspaceMemberAlreadyRemoved
	}

	m.State = WorkspaceMemberStateRemoved
	m.recordLifecycleFact(m.State)
	return nil
}

/*
CanManageMembers reports whether the member role is allowed to manage
membership lifecycle operations.
*/
func (m WorkspaceMember) CanManageMembers() bool {
	return m.Role == WorkspaceRoleOwner || m.Role == WorkspaceRoleAdmin
}

/*
CanCreateBusinessChange reports whether current lifecycle state permits new
business mutations.
*/
func (m WorkspaceMember) CanCreateBusinessChange() bool {
	return m.State == WorkspaceMemberStateJoined || m.State == WorkspaceMemberStateRestored
}

/*
LifecycleFacts returns a copy of recorded lifecycle facts in transition order.
*/
func (m WorkspaceMember) LifecycleFacts() []WorkspaceMemberLifecycleFact {
	return append([]WorkspaceMemberLifecycleFact(nil), m.facts...)
}

/*
Clone returns a deep copy safe for cross-layer read/write isolation.
*/
func (m *WorkspaceMember) Clone() *WorkspaceMember {
	if m == nil {
		return nil
	}

	copyMember := *m
	copyMember.facts = append([]WorkspaceMemberLifecycleFact(nil), m.facts...)
	return &copyMember
}

func (m *WorkspaceMember) recordLifecycleFact(state WorkspaceMemberState) {
	m.facts = append(m.facts, WorkspaceMemberLifecycleFact{State: state})
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
	case WorkspaceMemberStateInvited,
		WorkspaceMemberStateJoined,
		WorkspaceMemberStateDisabled,
		WorkspaceMemberStateRestored,
		WorkspaceMemberStateRemoved:
		return true
	default:
		return false
	}
}
