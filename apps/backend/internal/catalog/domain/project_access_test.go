package domain

import "testing"

func TestProjectCanAccess_ViewRequiresWorkspaceMembershipFacts(t *testing.T) {
	project := NewProject(1, 10, "Public", false, false)

	if project.CanAccess(ProjectAuthorizationFacts{
		ActorID:                 1,
		IsWorkspaceMember:       false,
		IsWorkspaceMemberActive: false,
	}, false, ProjectAccessActionView) {
		t.Fatalf("expected non-workspace member to be denied")
	}

	if project.CanAccess(ProjectAuthorizationFacts{
		ActorID:                 1,
		IsWorkspaceMember:       true,
		IsWorkspaceMemberActive: false,
	}, false, ProjectAccessActionView) {
		t.Fatalf("expected disabled workspace member to be denied")
	}
}

func TestProjectCanAccess_PrivateAndArchivedRules(t *testing.T) {
	project := NewProject(1, 10, "Private", true, false)
	facts := ProjectAuthorizationFacts{
		ActorID:                 101,
		IsWorkspaceMember:       true,
		IsWorkspaceMemberActive: true,
	}

	if project.CanAccess(facts, false, ProjectAccessActionView) {
		t.Fatalf("expected private project without grant to be denied")
	}

	if !project.CanAccess(facts, true, ProjectAccessActionView) {
		t.Fatalf("expected granted member to view private project")
	}

	if !project.CanAccess(facts, true, ProjectAccessActionTrackTime) {
		t.Fatalf("expected granted member to track time in active private project")
	}

	if err := project.Archive(); err != nil {
		t.Fatalf("expected archive to succeed: %v", err)
	}

	if !project.CanAccess(facts, true, ProjectAccessActionView) {
		t.Fatalf("expected archived project to stay viewable")
	}

	if project.CanAccess(facts, true, ProjectAccessActionTrackTime) {
		t.Fatalf("expected archived project to block time tracking")
	}
}
