package domain

import (
	"errors"
	"time"

	"opentoggl/backend/apps/backend/internal/xptr"
)

type OrganizationRole string

const (
	OrganizationRoleOwner  OrganizationRole = "owner"
	OrganizationRoleAdmin  OrganizationRole = "admin"
	OrganizationRoleMember OrganizationRole = "member"
)

type OrganizationMemberState string

const (
	OrganizationMemberStateJoined   OrganizationMemberState = "joined"
	OrganizationMemberStateInactive OrganizationMemberState = "inactive"
)

type WorkspaceRole string

const (
	WorkspaceRoleAdmin       WorkspaceRole = "admin"
	WorkspaceRoleMember      WorkspaceRole = "member"
	WorkspaceRoleProjectLead WorkspaceRole = "projectlead"
	WorkspaceRoleTeamLead    WorkspaceRole = "teamlead"
)

type WorkspaceMemberState string

const (
	WorkspaceMemberStateInvited  WorkspaceMemberState = "invited"
	WorkspaceMemberStateJoined   WorkspaceMemberState = "joined"
	WorkspaceMemberStateDisabled WorkspaceMemberState = "disabled"
	WorkspaceMemberStateRestored WorkspaceMemberState = "restored"
	WorkspaceMemberStateRemoved  WorkspaceMemberState = "removed"
)

var (
	ErrInvalidWorkspaceRole                  = errors.New("invalid workspace role")
	ErrInvalidWorkspaceMemberState           = errors.New("invalid workspace member state")
	ErrNegativeWorkspaceMemberHourlyRate     = errors.New("workspace member hourly rate must be zero or positive")
	ErrNegativeWorkspaceMemberLaborCost      = errors.New("workspace member labor cost must be zero or positive")
	ErrWorkspaceMemberNotInvited             = errors.New("workspace member not invited")
	ErrWorkspaceMemberCannotDisableFromState = errors.New("workspace member cannot be disabled from current state")
	ErrWorkspaceMemberAlreadyDisabled        = errors.New("workspace member already disabled")
	ErrWorkspaceMemberNotDisabled            = errors.New("workspace member not disabled")
	ErrWorkspaceMemberRemoved                = errors.New("workspace member already removed")
	ErrWorkspaceMemberAlreadyRemoved         = errors.New("workspace member already removed")
	ErrWorkspaceMemberInviteTokenExpired     = errors.New("workspace member invite token expired")
	ErrWorkspaceMemberInviteTokenInvalid     = errors.New("workspace member invite token invalid")
	ErrWorkspaceMemberEmailMismatch          = errors.New("workspace member email does not match invite")
)

type WorkspaceMemberLifecycleFact struct {
	State WorkspaceMemberState
}

type WorkspaceMember struct {
	ID                    int64
	Email                 string
	FullName              string
	Role                  WorkspaceRole
	State                 WorkspaceMemberState
	HourlyRate            *float64
	LaborCost             *float64
	InviteToken           *string
	InviteTokenExpiresAt  *time.Time
	facts                 []WorkspaceMemberLifecycleFact
}

/*
NewWorkspaceMember constructs a workspace membership aggregate and records the
initial lifecycle fact so lifecycle transitions remain queryable in-memory.
*/
func NewWorkspaceMember(
	id int64,
	email, fullName string,
	role WorkspaceRole,
	state WorkspaceMemberState,
	hourlyRate, laborCost *float64,
) (*WorkspaceMember, error) {
	if !isValidWorkspaceRole(role) {
		return nil, ErrInvalidWorkspaceRole
	}
	if !isValidWorkspaceMemberState(state) {
		return nil, ErrInvalidWorkspaceMemberState
	}
	if err := ValidateWorkspaceMemberRateCost(hourlyRate, laborCost); err != nil {
		return nil, err
	}

	member := &WorkspaceMember{
		ID:         id,
		Email:      email,
		FullName:   fullName,
		Role:       role,
		State:      state,
		HourlyRate: xptr.Clone(hourlyRate),
		LaborCost:  xptr.Clone(laborCost),
	}
	member.recordLifecycleFact(state)
	return member, nil
}

/*
ValidateWorkspaceMemberRateCost enforces the documented non-negative member
rate and cost constraints while still allowing unset values for precedence
fallback.
*/
func ValidateWorkspaceMemberRateCost(hourlyRate, laborCost *float64) error {
	if hourlyRate != nil && *hourlyRate < 0 {
		return ErrNegativeWorkspaceMemberHourlyRate
	}
	if laborCost != nil && *laborCost < 0 {
		return ErrNegativeWorkspaceMemberLaborCost
	}
	return nil
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
SetInviteToken stores a plaintext invite token and its expiry on an invited
workspace member. The operation is only valid while the member is still in the
invited state; other states either already represent an accepted membership or
a revoked lifecycle and must not receive a new token.
*/
func (m *WorkspaceMember) SetInviteToken(token string, expiresAt time.Time) error {
	if m.State != WorkspaceMemberStateInvited {
		return ErrWorkspaceMemberNotInvited
	}
	tokenCopy := token
	expiryCopy := expiresAt
	m.InviteToken = &tokenCopy
	m.InviteTokenExpiresAt = &expiryCopy
	return nil
}

/*
AcceptInvite transitions an invited member into joined state and clears the
invite token material so it can no longer be used. Callers are responsible for
persisting the user_id on the membership row alongside this transition.
*/
func (m *WorkspaceMember) AcceptInvite() error {
	if err := m.Join(); err != nil {
		return err
	}
	m.InviteToken = nil
	m.InviteTokenExpiresAt = nil
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
	return m.Role == WorkspaceRoleAdmin
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
UpdateRateCost sets the current member-specific billable rate and labor cost.
Nil keeps the setting explicitly unset so downstream precedence can fall back.
*/
func (m *WorkspaceMember) UpdateRateCost(hourlyRate, laborCost *float64) error {
	if err := ValidateWorkspaceMemberRateCost(hourlyRate, laborCost); err != nil {
		return err
	}

	m.HourlyRate = xptr.Clone(hourlyRate)
	m.LaborCost = xptr.Clone(laborCost)
	return nil
}

/*
Clone returns a deep copy safe for cross-layer read/write isolation.
*/
func (m *WorkspaceMember) Clone() *WorkspaceMember {
	if m == nil {
		return nil
	}

	copyMember := *m
	copyMember.HourlyRate = xptr.Clone(m.HourlyRate)
	copyMember.LaborCost = xptr.Clone(m.LaborCost)
	copyMember.InviteToken = xptr.Clone(m.InviteToken)
	if m.InviteTokenExpiresAt != nil {
		expiry := *m.InviteTokenExpiresAt
		copyMember.InviteTokenExpiresAt = &expiry
	}
	copyMember.facts = append([]WorkspaceMemberLifecycleFact(nil), m.facts...)
	return &copyMember
}

func (m *WorkspaceMember) recordLifecycleFact(state WorkspaceMemberState) {
	m.facts = append(m.facts, WorkspaceMemberLifecycleFact{State: state})
}

func isValidWorkspaceRole(role WorkspaceRole) bool {
	switch role {
	case WorkspaceRoleAdmin, WorkspaceRoleMember, WorkspaceRoleProjectLead, WorkspaceRoleTeamLead:
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
