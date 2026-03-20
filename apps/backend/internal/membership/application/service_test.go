package application

import (
	"testing"

	"opentoggl/backend/apps/backend/internal/membership/domain"
)

func TestMembershipLifecycleInviteJoinDisableRestoreRemove(t *testing.T) {
	// Story 6: admin-managed lifecycle invite -> join -> disable -> restore -> remove.
	service := NewMembershipService()

	owner, _ := domain.NewWorkspaceMember(
		10,
		"owner@example.com",
		"Owner",
		domain.WorkspaceRoleOwner,
		domain.WorkspaceMemberStateJoined,
		0,
		0,
	)
	if err := service.SeedWorkspaceMember(100, owner); err != nil {
		t.Fatalf("owner seed failed: %v", err)
	}

	invitee, _ := domain.NewWorkspaceMember(
		20,
		"invitee@example.com",
		"Invitee",
		domain.WorkspaceRoleMember,
		domain.WorkspaceMemberStateInvited,
		70,
		40,
	)
	if err := service.InviteWorkspaceMember(100, 10, invitee); err != nil {
		t.Fatalf("unexpected error inviting member: %v", err)
	}

	members := service.ListWorkspaceMembers(100)
	if len(members) != 2 {
		t.Fatalf("expected 2 active members (owner + invitee), got %d", len(members))
	}
	if err := service.JoinWorkspaceMember(100, 20); err != nil {
		t.Fatalf("join failed: %v", err)
	}

	if err := service.DisableWorkspaceMember(100, 10, 20); err != nil {
		t.Fatalf("disable failed: %v", err)
	}
	canChange, err := service.CanCreateBusinessChange(100, 20)
	if err != nil {
		t.Fatalf("expected disabled member access check to succeed, got %v", err)
	}
	if canChange {
		t.Fatal("expected disabled member to be blocked from business changes")
	}

	if err := service.RestoreWorkspaceMember(100, 10, 20); err != nil {
		t.Fatalf("restore failed: %v", err)
	}
	canChange, err = service.CanCreateBusinessChange(100, 20)
	if err != nil {
		t.Fatalf("expected restored member access check to succeed, got %v", err)
	}
	if !canChange {
		t.Fatal("expected restored member to be allowed to create business changes")
	}

	if err := service.RemoveWorkspaceMember(100, 10, 20); err != nil {
		t.Fatalf("remove failed: %v", err)
	}

	if active := service.ListWorkspaceMembers(100); len(active) != 1 {
		t.Fatalf("expected only owner in active list after remove, got %d", len(active))
	}

	// Historical-fact-safe semantics: even without persistence/projection yet,
	// lifecycle facts must survive remove so downstream reports/audit integrations
	// can continue to resolve past membership transitions.
	canChange, err = service.CanCreateBusinessChange(100, 20)
	if err != nil {
		t.Fatalf("expected removed member access check to succeed, got %v", err)
	}
	if canChange {
		t.Fatal("expected removed member to lose subsequent access")
	}

	facts, err := service.LifecycleFacts(100, 20)
	if err != nil {
		t.Fatalf("expected lifecycle facts for removed member, got %v", err)
	}
	assertLifecycleStates(t, facts, []domain.WorkspaceMemberState{
		domain.WorkspaceMemberStateInvited,
		domain.WorkspaceMemberStateJoined,
		domain.WorkspaceMemberStateDisabled,
		domain.WorkspaceMemberStateRestored,
		domain.WorkspaceMemberStateRemoved,
	})
}

func TestInviteRequiresAdminOrOwnerActor(t *testing.T) {
	// Story 6 + product role rules: only owner/admin can manage membership lifecycle.
	service := NewMembershipService()
	owner := mustMember(t, 10, "owner@example.com", domain.WorkspaceRoleOwner, domain.WorkspaceMemberStateJoined)
	admin := mustMember(t, 11, "admin@example.com", domain.WorkspaceRoleAdmin, domain.WorkspaceMemberStateJoined)
	regular := mustMember(t, 12, "member@example.com", domain.WorkspaceRoleMember, domain.WorkspaceMemberStateJoined)
	if err := service.SeedWorkspaceMember(101, owner); err != nil {
		t.Fatalf("owner seed failed: %v", err)
	}
	if err := service.SeedWorkspaceMember(101, admin); err != nil {
		t.Fatalf("admin seed failed: %v", err)
	}
	if err := service.SeedWorkspaceMember(101, regular); err != nil {
		t.Fatalf("member seed failed: %v", err)
	}

	memberInvitee := mustMember(t, 20, "invitee@example.com", domain.WorkspaceRoleMember, domain.WorkspaceMemberStateInvited)
	if err := service.InviteWorkspaceMember(101, 12, memberInvitee); err != ErrPermissionDenied {
		t.Fatalf("expected ErrPermissionDenied for non-admin invite, got %v", err)
	}

	if err := service.InviteWorkspaceMember(101, 11, memberInvitee); err != nil {
		t.Fatalf("expected admin invite to succeed, got %v", err)
	}
}

func TestDisableRestoreRemoveRequireAdminOrOwnerActor(t *testing.T) {
	service := NewMembershipService()
	owner := mustMember(t, 10, "owner@example.com", domain.WorkspaceRoleOwner, domain.WorkspaceMemberStateJoined)
	admin := mustMember(t, 11, "admin@example.com", domain.WorkspaceRoleAdmin, domain.WorkspaceMemberStateJoined)
	regular := mustMember(t, 12, "member@example.com", domain.WorkspaceRoleMember, domain.WorkspaceMemberStateJoined)
	target := mustMember(t, 30, "target@example.com", domain.WorkspaceRoleMember, domain.WorkspaceMemberStateJoined)

	for _, member := range []*domain.WorkspaceMember{owner, admin, regular, target} {
		if err := service.SeedWorkspaceMember(100, member); err != nil {
			t.Fatalf("seed failed for member %d: %v", member.ID, err)
		}
	}

	if err := service.DisableWorkspaceMember(100, 12, 30); err != ErrPermissionDenied {
		t.Fatalf("expected ErrPermissionDenied for member disable, got %v", err)
	}
	if err := service.DisableWorkspaceMember(100, 11, 30); err != nil {
		t.Fatalf("expected admin disable to succeed, got %v", err)
	}

	if err := service.RestoreWorkspaceMember(100, 12, 30); err != ErrPermissionDenied {
		t.Fatalf("expected ErrPermissionDenied for member restore, got %v", err)
	}
	if err := service.RestoreWorkspaceMember(100, 10, 30); err != nil {
		t.Fatalf("expected owner restore to succeed, got %v", err)
	}

	if err := service.RemoveWorkspaceMember(100, 12, 30); err != ErrPermissionDenied {
		t.Fatalf("expected ErrPermissionDenied for member remove, got %v", err)
	}
	if err := service.RemoveWorkspaceMember(100, 10, 30); err != nil {
		t.Fatalf("expected owner remove to succeed, got %v", err)
	}
}

func TestInviteLifecycleValidation(t *testing.T) {
	service := NewMembershipService()
	owner := mustMember(t, 10, "owner@example.com", domain.WorkspaceRoleOwner, domain.WorkspaceMemberStateJoined)
	if err := service.SeedWorkspaceMember(100, owner); err != nil {
		t.Fatalf("owner seed failed: %v", err)
	}

	joinedInvitee := mustMember(t, 20, "joined@example.com", domain.WorkspaceRoleMember, domain.WorkspaceMemberStateJoined)
	if err := service.InviteWorkspaceMember(100, 10, joinedInvitee); err != ErrInviteRequiresInvitedState {
		t.Fatalf("expected ErrInviteRequiresInvitedState, got %v", err)
	}

	invitee := mustMember(t, 21, "invitee@example.com", domain.WorkspaceRoleMember, domain.WorkspaceMemberStateInvited)
	if err := service.InviteWorkspaceMember(100, 10, invitee); err != nil {
		t.Fatalf("expected invite to succeed, got %v", err)
	}
	if err := service.DisableWorkspaceMember(100, 10, 21); err != domain.ErrWorkspaceMemberCannotDisableFromState {
		t.Fatalf("expected ErrWorkspaceMemberCannotDisableFromState, got %v", err)
	}
}

func TestInviteDuplicateWorkspaceMember(t *testing.T) {
	service := NewMembershipService()
	owner := mustMember(t, 10, "owner@example.com", domain.WorkspaceRoleOwner, domain.WorkspaceMemberStateJoined)
	invitee := mustMember(t, 1, "user@example.com", domain.WorkspaceRoleMember, domain.WorkspaceMemberStateInvited)
	if err := service.SeedWorkspaceMember(100, owner); err != nil {
		t.Fatalf("owner seed failed: %v", err)
	}

	if err := service.InviteWorkspaceMember(100, 10, invitee); err != nil {
		t.Fatalf("unexpected error inviting first member: %v", err)
	}
	if err := service.InviteWorkspaceMember(100, 10, invitee); err != ErrMemberAlreadyExists {
		t.Fatalf("expected ErrMemberAlreadyExists, got %v", err)
	}
}

func TestLifecycleOperationsNonexistentMember(t *testing.T) {
	service := NewMembershipService()
	owner := mustMember(t, 10, "owner@example.com", domain.WorkspaceRoleOwner, domain.WorkspaceMemberStateJoined)
	if err := service.SeedWorkspaceMember(100, owner); err != nil {
		t.Fatalf("owner seed failed: %v", err)
	}

	if err := service.DisableWorkspaceMember(100, 10, 1); err != ErrMemberNotFound {
		t.Fatalf("expected ErrMemberNotFound, got %v", err)
	}
	if err := service.RestoreWorkspaceMember(100, 10, 1); err != ErrMemberNotFound {
		t.Fatalf("expected ErrMemberNotFound, got %v", err)
	}
	if err := service.RemoveWorkspaceMember(100, 10, 1); err != ErrMemberNotFound {
		t.Fatalf("expected ErrMemberNotFound, got %v", err)
	}
}

func mustMember(
	t *testing.T,
	id int64,
	email string,
	role domain.WorkspaceRole,
	state domain.WorkspaceMemberState,
) *domain.WorkspaceMember {
	t.Helper()

	member, err := domain.NewWorkspaceMember(id, email, email, role, state, 0, 0)
	if err != nil {
		t.Fatalf("expected member construction to succeed: %v", err)
	}
	return member
}

func assertLifecycleStates(
	t *testing.T,
	facts []domain.WorkspaceMemberLifecycleFact,
	want []domain.WorkspaceMemberState,
) {
	t.Helper()

	if len(facts) != len(want) {
		t.Fatalf("expected %d lifecycle facts, got %d", len(want), len(facts))
	}

	for idx, expected := range want {
		if facts[idx].State != expected {
			t.Fatalf("expected lifecycle state[%d]=%s, got %s", idx, expected, facts[idx].State)
		}
	}
}
