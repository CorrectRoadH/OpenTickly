package application

import (
	"errors"
	"sort"
	"sync"

	"opentoggl/backend/apps/backend/internal/membership/domain"
)

var (
	ErrMemberAlreadyExists        = errors.New("workspace member already exists")
	ErrMemberNotFound             = errors.New("workspace member not found")
	ErrPermissionDenied           = errors.New("permission denied")
	ErrInviteRequiresInvitedState = errors.New("workspace invite requires invited state")
)

// MembershipService provides in-memory membership lifecycle management.
type MembershipService struct {
	mu               sync.RWMutex
	workspaceMembers map[int64]map[int64]*domain.WorkspaceMember
	removedMembers   map[int64]map[int64]*domain.WorkspaceMember
}

// NewMembershipService constructs a new in-memory membership service.
func NewMembershipService() *MembershipService {
	return &MembershipService{
		workspaceMembers: make(map[int64]map[int64]*domain.WorkspaceMember),
		removedMembers:   make(map[int64]map[int64]*domain.WorkspaceMember),
	}
}

/*
SeedWorkspaceMember inserts a pre-existing membership snapshot without actor
authorization checks. This keeps bootstrap and integration tests explicit while
transport/session wiring is not yet in place for membership.
*/
func (s *MembershipService) SeedWorkspaceMember(workspaceID int64, member *domain.WorkspaceMember) error {
	if member == nil {
		return errors.New("member is nil")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	return s.insertActiveMemberLocked(workspaceID, member.Clone())
}

/*
InviteWorkspaceMember adds an invited member to a workspace when the actor has
admin-level lifecycle permissions.
*/
func (s *MembershipService) InviteWorkspaceMember(
	workspaceID int64,
	actorID int64,
	member *domain.WorkspaceMember,
) error {
	if member == nil {
		return errors.New("member is nil")
	}
	if member.State != domain.WorkspaceMemberStateInvited {
		return ErrInviteRequiresInvitedState
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.requireLifecycleAdminLocked(workspaceID, actorID); err != nil {
		return err
	}
	return s.insertActiveMemberLocked(workspaceID, member.Clone())
}

/*
JoinWorkspaceMember transitions an invited member into joined state.
*/
func (s *MembershipService) JoinWorkspaceMember(workspaceID, memberID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	member, err := s.getActiveMemberLocked(workspaceID, memberID)
	if err != nil {
		return err
	}
	return member.Join()
}

/*
ListWorkspaceMembers returns active members for a workspace.
*/
func (s *MembershipService) ListWorkspaceMembers(workspaceID int64) []*domain.WorkspaceMember {
	s.mu.RLock()
	defer s.mu.RUnlock()

	membersMap, ok := s.workspaceMembers[workspaceID]
	if !ok {
		return nil
	}

	result := make([]*domain.WorkspaceMember, 0, len(membersMap))
	for _, member := range membersMap {
		result = append(result, member.Clone())
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].ID < result[j].ID
	})
	return result
}

/*
DisableWorkspaceMember marks a joined/restored member as disabled.
*/
func (s *MembershipService) DisableWorkspaceMember(workspaceID, actorID, memberID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.requireLifecycleAdminLocked(workspaceID, actorID); err != nil {
		return err
	}

	member, err := s.getActiveMemberLocked(workspaceID, memberID)
	if err != nil {
		return err
	}
	return member.Disable()
}

/*
RestoreWorkspaceMember restores a disabled member to restored state.
*/
func (s *MembershipService) RestoreWorkspaceMember(workspaceID, actorID, memberID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.requireLifecycleAdminLocked(workspaceID, actorID); err != nil {
		return err
	}

	member, err := s.getActiveMemberLocked(workspaceID, memberID)
	if err != nil {
		return err
	}
	return member.Restore()
}

/*
RemoveWorkspaceMember removes a member from active membership while preserving
a removed snapshot for historical lifecycle reads.
*/
func (s *MembershipService) RemoveWorkspaceMember(workspaceID, actorID, memberID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.requireLifecycleAdminLocked(workspaceID, actorID); err != nil {
		return err
	}

	member, err := s.getActiveMemberLocked(workspaceID, memberID)
	if err != nil {
		return err
	}
	if err := member.Remove(); err != nil {
		return err
	}

	s.storeRemovedMemberLocked(workspaceID, member.Clone())

	members := s.workspaceMembers[workspaceID]
	delete(members, memberID)
	if len(members) == 0 {
		delete(s.workspaceMembers, workspaceID)
	}
	return nil
}

/*
CanCreateBusinessChange reports whether the member currently has mutation
capability. Removed members return false without error so callers can keep
historical references while enforcing current access.
*/
func (s *MembershipService) CanCreateBusinessChange(workspaceID, memberID int64) (bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	member, err := s.getActiveMemberLocked(workspaceID, memberID)
	if err == nil {
		return member.CanCreateBusinessChange(), nil
	}
	if s.memberInRemovedSetLocked(workspaceID, memberID) {
		return false, nil
	}
	return false, ErrMemberNotFound
}

/*
LifecycleFacts returns lifecycle history for active or removed members.
*/
func (s *MembershipService) LifecycleFacts(
	workspaceID int64,
	memberID int64,
) ([]domain.WorkspaceMemberLifecycleFact, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	member, err := s.getActiveMemberLocked(workspaceID, memberID)
	if err == nil {
		return member.LifecycleFacts(), nil
	}

	removed, err := s.getRemovedMemberLocked(workspaceID, memberID)
	if err == nil {
		return removed.LifecycleFacts(), nil
	}
	return nil, ErrMemberNotFound
}

func (s *MembershipService) requireLifecycleAdminLocked(workspaceID, actorID int64) error {
	actor, err := s.getActiveMemberLocked(workspaceID, actorID)
	if err != nil {
		return ErrPermissionDenied
	}
	if !actor.CanCreateBusinessChange() {
		return ErrPermissionDenied
	}
	if !actor.CanManageMembers() {
		return ErrPermissionDenied
	}
	return nil
}

func (s *MembershipService) insertActiveMemberLocked(workspaceID int64, member *domain.WorkspaceMember) error {
	if _, ok := s.workspaceMembers[workspaceID]; !ok {
		s.workspaceMembers[workspaceID] = make(map[int64]*domain.WorkspaceMember)
	}
	if _, exists := s.workspaceMembers[workspaceID][member.ID]; exists {
		return ErrMemberAlreadyExists
	}
	if s.memberInRemovedSetLocked(workspaceID, member.ID) {
		return ErrMemberAlreadyExists
	}

	s.workspaceMembers[workspaceID][member.ID] = member.Clone()
	return nil
}

func (s *MembershipService) storeRemovedMemberLocked(workspaceID int64, member *domain.WorkspaceMember) {
	if _, ok := s.removedMembers[workspaceID]; !ok {
		s.removedMembers[workspaceID] = make(map[int64]*domain.WorkspaceMember)
	}
	s.removedMembers[workspaceID][member.ID] = member.Clone()
}

func (s *MembershipService) memberInRemovedSetLocked(workspaceID, memberID int64) bool {
	members, ok := s.removedMembers[workspaceID]
	if !ok {
		return false
	}
	_, ok = members[memberID]
	return ok
}

func (s *MembershipService) getRemovedMemberLocked(
	workspaceID int64,
	memberID int64,
) (*domain.WorkspaceMember, error) {
	members, ok := s.removedMembers[workspaceID]
	if !ok {
		return nil, ErrMemberNotFound
	}

	member, ok := members[memberID]
	if !ok {
		return nil, ErrMemberNotFound
	}
	return member, nil
}

func (s *MembershipService) getActiveMemberLocked(
	workspaceID int64,
	memberID int64,
) (*domain.WorkspaceMember, error) {
	membersMap, ok := s.workspaceMembers[workspaceID]
	if !ok {
		return nil, ErrMemberNotFound
	}
	member, ok := membersMap[memberID]
	if !ok {
		return nil, ErrMemberNotFound
	}
	return member, nil
}
