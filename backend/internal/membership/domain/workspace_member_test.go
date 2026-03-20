package domain

import "testing"

func TestNewWorkspaceMemberValid(t *testing.T) {
	member, err := NewWorkspaceMember(1, "user@example.com", "User Example", WorkspaceRoleOwner, WorkspaceMemberStateActive, 100, 80)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if member.Role != WorkspaceRoleOwner {
		t.Fatalf("expected role %s got %s", WorkspaceRoleOwner, member.Role)
	}
	if member.State != WorkspaceMemberStateActive {
		t.Fatalf("expected state %s got %s", WorkspaceMemberStateActive, member.State)
	}
}

func TestNewWorkspaceMemberInvalidRole(t *testing.T) {
	_, err := NewWorkspaceMember(1, "user@example.com", "User Example", WorkspaceRole("superuser"), WorkspaceMemberStateActive, 100, 80)
	if err == nil {
		t.Fatal("expected error for invalid role, got nil")
	}
}

func TestNewWorkspaceMemberInvalidState(t *testing.T) {
	_, err := NewWorkspaceMember(1, "user@example.com", "User Example", WorkspaceRoleOwner, WorkspaceMemberState("pending"), 100, 80)
	if err == nil {
		t.Fatal("expected error for invalid state, got nil")
	}
}

func TestWorkspaceMemberDisable(t *testing.T) {
	member, _ := NewWorkspaceMember(1, "user@example.com", "User Example", WorkspaceRoleMember, WorkspaceMemberStateActive, 100, 80)
	if err := member.Disable(); err != nil {
		t.Fatalf("expected disable to succeed, got %v", err)
	}
	if member.State != WorkspaceMemberStateDisabled {
		t.Fatalf("expected state %s got %s", WorkspaceMemberStateDisabled, member.State)
	}
}

func TestWorkspaceMemberRestore(t *testing.T) {
	member, _ := NewWorkspaceMember(1, "user@example.com", "User Example", WorkspaceRoleAdmin, WorkspaceMemberStateDisabled, 100, 80)
	if err := member.Restore(); err != nil {
		t.Fatalf("expected restore to succeed, got %v", err)
	}
	if member.State != WorkspaceMemberStateActive {
		t.Fatalf("expected state %s got %s", WorkspaceMemberStateActive, member.State)
	}
}
