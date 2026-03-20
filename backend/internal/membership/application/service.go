package application

import (
	"errors"
	"sync"

	"opentoggl/backend/backend/internal/membership/domain"
)

var (
	ErrMemberAlreadyExists = errors.New("workspace member already exists")
	ErrMemberNotFound      = errors.New("workspace member not found")
)

// MembershipService provides in-memory membership management per workspace.
type MembershipService struct {
	mu               sync.RWMutex
	workspaceMembers map[int64]map[int64]*domain.WorkspaceMember
}

// NewMembershipService constructs a new in-memory membership service.
func NewMembershipService() *MembershipService {
	return &MembershipService{
		workspaceMembers: make(map[int64]map[int64]*domain.WorkspaceMember),
	}
}

// InviteWorkspaceMember adds a member to a workspace if it does not already exist.
func (s *MembershipService) InviteWorkspaceMember(workspaceID int64, member *domain.WorkspaceMember) error {
	if member == nil {
		return errors.New("member is nil")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.workspaceMembers[workspaceID]; !ok {
		s.workspaceMembers[workspaceID] = make(map[int64]*domain.WorkspaceMember)
	}

	if _, exists := s.workspaceMembers[workspaceID][member.ID]; exists {
		return ErrMemberAlreadyExists
	}

	// store a copy to avoid external mutation
	copyMember := *member
	s.workspaceMembers[workspaceID][member.ID] = &copyMember
	return nil
}

// ListWorkspaceMembers returns all members for a workspace.
func (s *MembershipService) ListWorkspaceMembers(workspaceID int64) []*domain.WorkspaceMember {
	s.mu.RLock()
	defer s.mu.RUnlock()

	membersMap, ok := s.workspaceMembers[workspaceID]
	if !ok {
		return nil
	}

	result := make([]*domain.WorkspaceMember, 0, len(membersMap))
	for _, member := range membersMap {
		copyMember := *member
		result = append(result, &copyMember)
	}
	return result
}

// DisableWorkspaceMember marks a member as disabled.
func (s *MembershipService) DisableWorkspaceMember(workspaceID, memberID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	member, err := s.getMemberLocked(workspaceID, memberID)
	if err != nil {
		return err
	}
	return member.Disable()
}

// RestoreWorkspaceMember re-enables a disabled member.
func (s *MembershipService) RestoreWorkspaceMember(workspaceID, memberID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	member, err := s.getMemberLocked(workspaceID, memberID)
	if err != nil {
		return err
	}
	return member.Restore()
}

// RemoveWorkspaceMember deletes a member from a workspace.
func (s *MembershipService) RemoveWorkspaceMember(workspaceID, memberID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	membersMap, ok := s.workspaceMembers[workspaceID]
	if !ok {
		return ErrMemberNotFound
	}
	if _, ok := membersMap[memberID]; !ok {
		return ErrMemberNotFound
	}
	delete(membersMap, memberID)
	if len(membersMap) == 0 {
		delete(s.workspaceMembers, workspaceID)
	}
	return nil
}

func (s *MembershipService) getMemberLocked(workspaceID, memberID int64) (*domain.WorkspaceMember, error) {
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
