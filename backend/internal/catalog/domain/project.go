package domain

import "errors"

var (
	ErrProjectAlreadyArchived = errors.New("project already archived")
	ErrProjectNotArchived     = errors.New("project is not archived")
)

// Project represents a workspace project with visibility and archival state.
type Project struct {
	ID          int64
	WorkspaceID int64
	Name        string
	Private     bool
	Archived    bool
}

// NewProject constructs a new Project with the provided values.
func NewProject(id, workspaceID int64, name string, private bool, archived bool) Project {
	return Project{
		ID:          id,
		WorkspaceID: workspaceID,
		Name:        name,
		Private:     private,
		Archived:    archived,
	}
}

// Archive marks the project as archived.
func (p *Project) Archive() error {
	if p.Archived {
		return ErrProjectAlreadyArchived
	}

	p.Archived = true
	return nil
}

// Restore marks the project as active.
func (p *Project) Restore() error {
	if !p.Archived {
		return ErrProjectNotArchived
	}

	p.Archived = false
	return nil
}
