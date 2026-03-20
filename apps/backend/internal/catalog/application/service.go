package application

import (
	"errors"
	"sort"
	"sync"

	"opentoggl/backend/apps/backend/internal/catalog/domain"
)

var (
	ErrProjectAlreadyExists                    = errors.New("project already exists")
	ErrProjectNotFound                         = errors.New("project not found")
	ErrProjectMembershipRequiresPrivateProject = errors.New("project membership requires private project")
	ErrProjectMemberNotFound                   = errors.New("project member not found")
)

// CatalogService provides an in-memory implementation for managing projects.
// It is intentionally minimal and not concurrency-safe beyond a single process.
type CatalogService struct {
	mu             sync.RWMutex
	projects       map[int64]domain.Project
	projectMembers map[int64]map[int64]struct{}
}

// NewCatalogService constructs a new CatalogService.
func NewCatalogService() *CatalogService {
	return &CatalogService{
		projects:       make(map[int64]domain.Project),
		projectMembers: make(map[int64]map[int64]struct{}),
	}
}

// CreateProject stores the provided project.
func (s *CatalogService) CreateProject(project domain.Project) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.projects[project.ID]; exists {
		return ErrProjectAlreadyExists
	}

	s.projects[project.ID] = project
	if project.Private {
		s.projectMembers[project.ID] = make(map[int64]struct{})
	}

	return nil
}

// GetProject returns the project by id.
func (s *CatalogService) GetProject(projectID int64) (domain.Project, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	project, ok := s.projects[projectID]
	if !ok {
		return domain.Project{}, ErrProjectNotFound
	}

	return project, nil
}

// ArchiveProject marks a project as archived.
func (s *CatalogService) ArchiveProject(projectID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	project, ok := s.projects[projectID]
	if !ok {
		return ErrProjectNotFound
	}

	if err := project.Archive(); err != nil {
		return err
	}

	s.projects[projectID] = project
	return nil
}

// RestoreProject removes the archived flag.
func (s *CatalogService) RestoreProject(projectID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	project, ok := s.projects[projectID]
	if !ok {
		return ErrProjectNotFound
	}

	if err := project.Restore(); err != nil {
		return err
	}

	s.projects[projectID] = project
	return nil
}

// GrantProjectMember grants explicit membership to a private project.
func (s *CatalogService) GrantProjectMember(projectID int64, memberID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	project, ok := s.projects[projectID]
	if !ok {
		return ErrProjectNotFound
	}

	if !project.Private {
		return ErrProjectMembershipRequiresPrivateProject
	}

	if _, exists := s.projectMembers[projectID]; !exists {
		s.projectMembers[projectID] = make(map[int64]struct{})
	}

	s.projectMembers[projectID][memberID] = struct{}{}
	return nil
}

// AddProjectMember is a backward-compatible alias for GrantProjectMember.
func (s *CatalogService) AddProjectMember(projectID int64, memberID int64) error {
	return s.GrantProjectMember(projectID, memberID)
}

// RemoveProjectMember removes a member from a project.
func (s *CatalogService) RemoveProjectMember(projectID int64, memberID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	project, ok := s.projects[projectID]
	if !ok {
		return ErrProjectNotFound
	}

	if !project.Private {
		return ErrProjectMembershipRequiresPrivateProject
	}

	members, exists := s.projectMembers[projectID]
	if !exists {
		return ErrProjectMemberNotFound
	}

	if _, ok := members[memberID]; !ok {
		return ErrProjectMemberNotFound
	}

	delete(members, memberID)
	return nil
}

// ListProjectMembers returns the list of member IDs associated with the project.
func (s *CatalogService) ListProjectMembers(projectID int64) []int64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	members := s.projectMembers[projectID]
	ids := make([]int64, 0, len(members))
	for id := range members {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool {
		return ids[i] < ids[j]
	})
	return ids
}

// CanAccessProject returns whether facts can perform action on the project.
func (s *CatalogService) CanAccessProject(projectID int64, facts domain.ProjectAuthorizationFacts, action domain.ProjectAccessAction) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	project, ok := s.projects[projectID]
	if !ok {
		return false
	}

	_, isProjectMember := s.projectMembers[projectID][facts.ActorID]
	return project.CanAccess(facts, isProjectMember, action)
}

// CanViewProject is a backward-compatible helper for simple view checks.
func (s *CatalogService) CanViewProject(projectID int64, memberID int64) bool {
	facts := domain.ProjectAuthorizationFacts{
		ActorID:                 memberID,
		IsWorkspaceMember:       true,
		IsWorkspaceMemberActive: true,
	}

	return s.CanAccessProject(projectID, facts, domain.ProjectAccessActionView)
}
