package domain

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
func (p *Project) Archive() {
	p.Archived = true
}

// Restore marks the project as active.
func (p *Project) Restore() {
	p.Archived = false
}
