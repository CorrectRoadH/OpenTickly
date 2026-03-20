package application

import (
    "errors"
    "sync"

    "opentoggl/backend/backend/internal/catalog/domain"
)

// CatalogService provides an in-memory implementation for managing projects.
// It is intentionally minimal and not concurrency-safe beyond a single process.
type CatalogService struct {
    mu              sync.RWMutex
    projects        map[int64]domain.Project
    archived        map[int64]bool
    projectMembers  map[int64]map[int64]struct{}
}

// NewCatalogService constructs a new CatalogService.
func NewCatalogService() *CatalogService {
    return &CatalogService{
        projects:       make(map[int64]domain.Project),
        archived:       make(map[int64]bool),
        projectMembers: make(map[int64]map[int64]struct{}),
    }
}

// CreateProject stores the provided project.
func (s *CatalogService) CreateProject(project domain.Project) error {
    s.mu.Lock()
    defer s.mu.Unlock()

    if _, exists := s.projects[project.ID]; exists {
        return errors.New("project already exists")
    }

    s.projects[project.ID] = project
    if project.Private {
        s.projectMembers[project.ID] = make(map[int64]struct{})
    }

    if project.Archived {
        s.archived[project.ID] = true
    }

    return nil
}

// GetProject returns the project by id.
func (s *CatalogService) GetProject(projectID int64) (domain.Project, error) {
    s.mu.RLock()
    defer s.mu.RUnlock()

    project, ok := s.projects[projectID]
    if !ok {
        return domain.Project{}, errors.New("project not found")
    }

    if archived := s.archived[projectID]; archived {
        project.Archived = true
    }

    return project, nil
}

// ArchiveProject marks a project as archived.
func (s *CatalogService) ArchiveProject(projectID int64) error {
    s.mu.Lock()
    defer s.mu.Unlock()

    if _, ok := s.projects[projectID]; !ok {
        return errors.New("project not found")
    }

    s.archived[projectID] = true
    return nil
}

// RestoreProject removes the archived flag.
func (s *CatalogService) RestoreProject(projectID int64) error {
    s.mu.Lock()
    defer s.mu.Unlock()

    if _, ok := s.projects[projectID]; !ok {
        return errors.New("project not found")
    }

    delete(s.archived, projectID)
    return nil
}

// AddProjectMember adds a member to a project.
func (s *CatalogService) AddProjectMember(projectID int64, memberID int64) error {
    s.mu.Lock()
    defer s.mu.Unlock()

    project, ok := s.projects[projectID]
    if !ok {
        return errors.New("project not found")
    }

    if !project.Private {
        return nil
    }

    if _, exists := s.projectMembers[projectID]; !exists {
        s.projectMembers[projectID] = make(map[int64]struct{})
    }

    s.projectMembers[projectID][memberID] = struct{}{}
    return nil
}

// RemoveProjectMember removes a member from a project.
func (s *CatalogService) RemoveProjectMember(projectID int64, memberID int64) error {
    s.mu.Lock()
    defer s.mu.Unlock()

    project, ok := s.projects[projectID]
    if !ok {
        return errors.New("project not found")
    }

    if !project.Private {
        return nil
    }

    members, exists := s.projectMembers[projectID]
    if !exists {
        return nil
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
    return ids
}

// CanViewProject returns true if the member can view the project.
func (s *CatalogService) CanViewProject(projectID int64, memberID int64) bool {
    s.mu.RLock()
    defer s.mu.RUnlock()

    project, ok := s.projects[projectID]
    if !ok {
        return false
    }

    if !project.Private {
        return true
    }

    members := s.projectMembers[projectID]
    _, ok = members[memberID]
    return ok
}
