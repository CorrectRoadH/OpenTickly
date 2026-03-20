package domain

// ProjectAccessAction represents a project-scoped operation gated by access rules.
type ProjectAccessAction string

const (
	ProjectAccessActionView      ProjectAccessAction = "view"
	ProjectAccessActionTrackTime ProjectAccessAction = "track_time"
)

// ProjectAuthorizationFacts represents the caller's current membership facts.
type ProjectAuthorizationFacts struct {
	ActorID                 int64
	IsWorkspaceMember       bool
	IsWorkspaceMemberActive bool
}

// CanAccess evaluates whether the caller can execute action on the project.
func (p Project) CanAccess(facts ProjectAuthorizationFacts, isProjectMember bool, action ProjectAccessAction) bool {
	if !facts.IsWorkspaceMember || !facts.IsWorkspaceMemberActive {
		return false
	}

	visible := !p.Private || isProjectMember
	if !visible {
		return false
	}

	switch action {
	case ProjectAccessActionView:
		return true
	case ProjectAccessActionTrackTime:
		return !p.Archived
	default:
		return false
	}
}
