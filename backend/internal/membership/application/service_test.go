package application

import (
	"testing"

	"opentoggl/backend/backend/internal/membership/domain"
)

func TestInviteAndListWorkspaceMembers(t *testing.T) {
	service := NewMembershipService()
	member := &domain.WorkspaceMember{ID: 1}

	if err := service.InviteWorkspaceMember(100, member); err != nil {
		t.Fatalf("unexpected error inviting member: %v", err)
	}

	members := service.ListWorkspaceMembers(100)
	if len(members) != 1 {
		t.Fatalf("expected 1 member, got %d", len(members))
	}
	if members[0].ID != member.ID {
		t.Fatalf("expected member ID %d, got %d", member.ID, members[0].ID)
	}
}

func TestInviteDuplicateWorkspaceMember(t *testing.T) {
	service := NewMembershipService()
	member := &domain.WorkspaceMember{ID: 1}

	if err := service.InviteWorkspaceMember(100, member); err != nil {
		t.Fatalf("unexpected error inviting first member: %v", err)
	}
	if err := service.InviteWorkspaceMember(100, member); err != ErrMemberAlreadyExists {
		t.Fatalf("expected ErrMemberAlreadyExists, got %v", err)
	}
}

func TestDisableAndRestoreWorkspaceMember(t *testing.T) {
	service := NewMembershipService()
	member := &domain.WorkspaceMember{ID: 1}

	if err := service.InviteWorkspaceMember(100, member); err != nil {
		t.Fatalf("invite failed: %v", err)
	}

	if err := service.DisableWorkspaceMember(100, 1); err != nil {
		t.Fatalf("disable failed: %v", err)
	}
	members := service.ListWorkspaceMembers(100)
	if members[0].State != domain.WorkspaceMemberStateDisabled {
		t.Fatalf("expected member to be disabled, got %s", members[0].State)
	}

	if err := service.RestoreWorkspaceMember(100, 1); err != nil {
		t.Fatalf("restore failed: %v", err)
	}
	members = service.ListWorkspaceMembers(100)
	if members[0].State != domain.WorkspaceMemberStateActive {
		t.Fatalf("expected member to be restored, got %s", members[0].State)
	}
}

func TestDisableRestoreNonexistentMember(t *testing.T) {
	service := NewMembershipService()

	if err := service.DisableWorkspaceMember(100, 1); err != ErrMemberNotFound {
		t.Fatalf("expected ErrMemberNotFound, got %v", err)
	}
	if err := service.RestoreWorkspaceMember(100, 1); err != ErrMemberNotFound {
		t.Fatalf("expected ErrMemberNotFound, got %v", err)
	}
}

func TestRemoveWorkspaceMember(t *testing.T) {
	service := NewMembershipService()
	member := &domain.WorkspaceMember{ID: 1}

	if err := service.InviteWorkspaceMember(100, member); err != nil {
		t.Fatalf("invite failed: %v", err)
	}

	if err := service.RemoveWorkspaceMember(100, 1); err != nil {
		t.Fatalf("remove failed: %v", err)
	}

	if got := len(service.ListWorkspaceMembers(100)); got != 0 {
		t.Fatalf("expected 0 members after removal, got %d", got)
	}
}

func TestRemoveNonexistentMember(t *testing.T) {
	service := NewMembershipService()

	if err := service.RemoveWorkspaceMember(100, 1); err != ErrMemberNotFound {
		t.Fatalf("expected ErrMemberNotFound, got %v", err)
	}
}
