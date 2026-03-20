package application

import (
	"errors"
	"testing"

	"opentoggl/backend/apps/backend/internal/catalog/domain"
)

func TestCatalogService_CreateAndGetProject(t *testing.T) {
	svc := NewCatalogService()
	project := domain.NewProject(1, 10, "Proj", false, false)

	if err := svc.CreateProject(project); err != nil {
		t.Fatalf("CreateProject error: %v", err)
	}

	got, err := svc.GetProject(1)
	if err != nil {
		t.Fatalf("GetProject error: %v", err)
	}

	if got != project {
		t.Fatalf("expected %v, got %v", project, got)
	}
}

func TestCatalogService_CreateDuplicate(t *testing.T) {
	svc := NewCatalogService()
	project := domain.NewProject(1, 10, "Proj", false, false)

	if err := svc.CreateProject(project); err != nil {
		t.Fatalf("CreateProject first call error: %v", err)
	}

	if err := svc.CreateProject(project); !errors.Is(err, ErrProjectAlreadyExists) {
		t.Fatalf("expected ErrProjectAlreadyExists, got %v", err)
	}
}

func TestCatalogService_ArchiveAndRestore(t *testing.T) {
	svc := NewCatalogService()
	project := domain.NewProject(2, 10, "Proj2", false, false)

	if err := svc.CreateProject(project); err != nil {
		t.Fatalf("CreateProject error: %v", err)
	}

	if err := svc.ArchiveProject(2); err != nil {
		t.Fatalf("ArchiveProject error: %v", err)
	}

	got, err := svc.GetProject(2)
	if err != nil {
		t.Fatalf("GetProject error after archive: %v", err)
	}
	if !got.Archived {
		t.Fatalf("expected project archived flag true after archive")
	}

	if err := svc.ArchiveProject(2); !errors.Is(err, domain.ErrProjectAlreadyArchived) {
		t.Fatalf("expected ErrProjectAlreadyArchived, got %v", err)
	}

	if err := svc.RestoreProject(2); err != nil {
		t.Fatalf("RestoreProject error: %v", err)
	}

	got, err = svc.GetProject(2)
	if err != nil {
		t.Fatalf("GetProject error after restore: %v", err)
	}
	if got.Archived {
		t.Fatalf("expected project archived flag false after restore")
	}

	if err := svc.RestoreProject(2); !errors.Is(err, domain.ErrProjectNotArchived) {
		t.Fatalf("expected ErrProjectNotArchived, got %v", err)
	}
}

func TestCatalogService_GrantAndRemovePrivateProjectMembers(t *testing.T) {
	svc := NewCatalogService()
	privateProject := domain.NewProject(3, 10, "Private", true, false)
	publicProject := domain.NewProject(4, 10, "Public", false, false)

	if err := svc.CreateProject(privateProject); err != nil {
		t.Fatalf("CreateProject private error: %v", err)
	}
	if err := svc.CreateProject(publicProject); err != nil {
		t.Fatalf("CreateProject public error: %v", err)
	}

	if err := svc.GrantProjectMember(4, 200); !errors.Is(err, ErrProjectMembershipRequiresPrivateProject) {
		t.Fatalf("expected ErrProjectMembershipRequiresPrivateProject, got %v", err)
	}

	if err := svc.GrantProjectMember(3, 101); err != nil {
		t.Fatalf("GrantProjectMember error: %v", err)
	}
	if err := svc.GrantProjectMember(3, 102); err != nil {
		t.Fatalf("GrantProjectMember error: %v", err)
	}

	members := svc.ListProjectMembers(3)
	if len(members) != 2 {
		t.Fatalf("expected 2 members, got %d", len(members))
	}

	if err := svc.RemoveProjectMember(3, 101); err != nil {
		t.Fatalf("RemoveProjectMember error: %v", err)
	}

	if err := svc.RemoveProjectMember(3, 101); !errors.Is(err, ErrProjectMemberNotFound) {
		t.Fatalf("expected ErrProjectMemberNotFound, got %v", err)
	}

	if err := svc.RemoveProjectMember(4, 200); !errors.Is(err, ErrProjectMembershipRequiresPrivateProject) {
		t.Fatalf("expected ErrProjectMembershipRequiresPrivateProject, got %v", err)
	}
}

func TestCatalogService_AccessChecksForPublicAndPrivateProjects(t *testing.T) {
	svc := NewCatalogService()
	privateProject := domain.NewProject(5, 10, "Private", true, false)
	publicProject := domain.NewProject(6, 10, "Public", false, false)

	if err := svc.CreateProject(privateProject); err != nil {
		t.Fatalf("CreateProject private error: %v", err)
	}
	if err := svc.CreateProject(publicProject); err != nil {
		t.Fatalf("CreateProject public error: %v", err)
	}
	if err := svc.GrantProjectMember(5, 101); err != nil {
		t.Fatalf("GrantProjectMember error: %v", err)
	}

	activeWorkspaceMember := domain.ProjectAuthorizationFacts{
		ActorID:                 101,
		IsWorkspaceMember:       true,
		IsWorkspaceMemberActive: true,
	}
	nonWorkspaceMember := domain.ProjectAuthorizationFacts{
		ActorID:                 101,
		IsWorkspaceMember:       false,
		IsWorkspaceMemberActive: false,
	}
	disabledWorkspaceMember := domain.ProjectAuthorizationFacts{
		ActorID:                 101,
		IsWorkspaceMember:       true,
		IsWorkspaceMemberActive: false,
	}

	if !svc.CanAccessProject(6, activeWorkspaceMember, domain.ProjectAccessActionView) {
		t.Fatalf("expected active workspace member to view public project")
	}
	if svc.CanAccessProject(6, nonWorkspaceMember, domain.ProjectAccessActionView) {
		t.Fatalf("expected non-workspace member cannot view public project")
	}
	if svc.CanAccessProject(6, disabledWorkspaceMember, domain.ProjectAccessActionView) {
		t.Fatalf("expected disabled workspace member cannot view public project")
	}

	if !svc.CanAccessProject(5, activeWorkspaceMember, domain.ProjectAccessActionView) {
		t.Fatalf("expected granted member can view private project")
	}
	if !svc.CanAccessProject(5, activeWorkspaceMember, domain.ProjectAccessActionTrackTime) {
		t.Fatalf("expected granted member can track time in active private project")
	}
	if svc.CanAccessProject(5, domain.ProjectAuthorizationFacts{
		ActorID:                 999,
		IsWorkspaceMember:       true,
		IsWorkspaceMemberActive: true,
	}, domain.ProjectAccessActionView) {
		t.Fatalf("expected non-granted workspace member cannot view private project")
	}
}

func TestCatalogService_AccessChecksRespectArchiveLifecycle(t *testing.T) {
	svc := NewCatalogService()
	privateProject := domain.NewProject(7, 10, "Private", true, false)
	if err := svc.CreateProject(privateProject); err != nil {
		t.Fatalf("CreateProject error: %v", err)
	}
	if err := svc.GrantProjectMember(7, 101); err != nil {
		t.Fatalf("GrantProjectMember error: %v", err)
	}

	facts := domain.ProjectAuthorizationFacts{
		ActorID:                 101,
		IsWorkspaceMember:       true,
		IsWorkspaceMemberActive: true,
	}

	if !svc.CanAccessProject(7, facts, domain.ProjectAccessActionTrackTime) {
		t.Fatalf("expected active private project to allow time tracking")
	}

	if err := svc.ArchiveProject(7); err != nil {
		t.Fatalf("ArchiveProject error: %v", err)
	}

	if !svc.CanAccessProject(7, facts, domain.ProjectAccessActionView) {
		t.Fatalf("expected archived project to remain viewable for authorized member")
	}
	if svc.CanAccessProject(7, facts, domain.ProjectAccessActionTrackTime) {
		t.Fatalf("expected archived project to block time tracking")
	}

	if err := svc.RestoreProject(7); err != nil {
		t.Fatalf("RestoreProject error: %v", err)
	}
	if !svc.CanAccessProject(7, facts, domain.ProjectAccessActionTrackTime) {
		t.Fatalf("expected restored project to allow time tracking again")
	}
}

func TestCatalogService_AccessChecksRequireWorkspaceMembershipEvenWithProjectGrant(t *testing.T) {
	svc := NewCatalogService()
	privateProject := domain.NewProject(8, 10, "Private", true, false)
	if err := svc.CreateProject(privateProject); err != nil {
		t.Fatalf("CreateProject error: %v", err)
	}
	if err := svc.GrantProjectMember(8, 101); err != nil {
		t.Fatalf("GrantProjectMember error: %v", err)
	}

	facts := domain.ProjectAuthorizationFacts{
		ActorID:                 101,
		IsWorkspaceMember:       false,
		IsWorkspaceMemberActive: false,
	}

	if svc.CanAccessProject(8, facts, domain.ProjectAccessActionView) {
		t.Fatalf("expected project grant not to bypass missing workspace membership")
	}
}
