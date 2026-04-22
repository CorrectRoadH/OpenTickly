package domain

import (
	"go/ast"
	"go/parser"
	"go/token"
	"testing"
	"time"

	"github.com/samber/lo"
)

func TestNewWorkspaceMemberAcceptsDocumentedRolesAndStates(t *testing.T) {
	member, err := NewWorkspaceMember(
		1,
		"owner@example.com",
		"Owner",
		WorkspaceRoleAdmin,
		WorkspaceMemberStateInvited,
		lo.ToPtr(100.0),
		lo.ToPtr(80.0),
	)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if member.Role != WorkspaceRoleAdmin {
		t.Fatalf("expected role %s got %s", WorkspaceRoleAdmin, member.Role)
	}
	if member.State != WorkspaceMemberStateInvited {
		t.Fatalf("expected state %s got %s", WorkspaceMemberStateInvited, member.State)
	}
}

func TestNewWorkspaceMemberInvalidRole(t *testing.T) {
	_, err := NewWorkspaceMember(
		1,
		"user@example.com",
		"User Example",
		WorkspaceRole("superuser"),
		WorkspaceMemberStateInvited,
		lo.ToPtr(100.0),
		lo.ToPtr(80.0),
	)
	if err == nil {
		t.Fatal("expected error for invalid role, got nil")
	}
}

func TestNewWorkspaceMemberInvalidState(t *testing.T) {
	_, err := NewWorkspaceMember(
		1,
		"user@example.com",
		"User Example",
		WorkspaceRoleAdmin,
		WorkspaceMemberState("pending"),
		lo.ToPtr(100.0),
		lo.ToPtr(80.0),
	)
	if err == nil {
		t.Fatal("expected error for invalid state, got nil")
	}
}

func TestWorkspaceMemberLifecycleInvitedJoinedDisabledRestoredRemoved(t *testing.T) {
	member, _ := NewWorkspaceMember(
		1,
		"member@example.com",
		"Member",
		WorkspaceRoleMember,
		WorkspaceMemberStateInvited,
		lo.ToPtr(100.0),
		lo.ToPtr(80.0),
	)

	if err := member.Join(); err != nil {
		t.Fatalf("expected join to succeed, got %v", err)
	}
	if member.State != WorkspaceMemberStateJoined {
		t.Fatalf("expected state %s got %s", WorkspaceMemberStateJoined, member.State)
	}
	if !member.CanCreateBusinessChange() {
		t.Fatal("expected joined member to create business changes")
	}

	if err := member.Disable(); err != nil {
		t.Fatalf("expected disable to succeed, got %v", err)
	}
	if member.State != WorkspaceMemberStateDisabled {
		t.Fatalf("expected state %s got %s", WorkspaceMemberStateDisabled, member.State)
	}
	if member.CanCreateBusinessChange() {
		t.Fatal("expected disabled member to be blocked from business changes")
	}

	if err := member.Restore(); err != nil {
		t.Fatalf("expected restore to succeed, got %v", err)
	}
	if member.State != WorkspaceMemberStateRestored {
		t.Fatalf("expected state %s got %s", WorkspaceMemberStateRestored, member.State)
	}
	if !member.CanCreateBusinessChange() {
		t.Fatal("expected restored member to create business changes")
	}

	if err := member.Remove(); err != nil {
		t.Fatalf("expected remove to succeed, got %v", err)
	}
	if member.State != WorkspaceMemberStateRemoved {
		t.Fatalf("expected state %s got %s", WorkspaceMemberStateRemoved, member.State)
	}
	if member.CanCreateBusinessChange() {
		t.Fatal("expected removed member to be blocked from business changes")
	}

	facts := member.LifecycleFacts()
	assertLifecycleStateSequence(t, facts, []WorkspaceMemberState{
		WorkspaceMemberStateInvited,
		WorkspaceMemberStateJoined,
		WorkspaceMemberStateDisabled,
		WorkspaceMemberStateRestored,
		WorkspaceMemberStateRemoved,
	})
}

func TestWorkspaceMemberRoleCapabilities(t *testing.T) {
	owner, _ := NewWorkspaceMember(1, "owner@example.com", "Owner", WorkspaceRoleAdmin, WorkspaceMemberStateJoined, lo.ToPtr(0.0), lo.ToPtr(0.0))
	admin, _ := NewWorkspaceMember(2, "admin@example.com", "Admin", WorkspaceRoleAdmin, WorkspaceMemberStateJoined, lo.ToPtr(0.0), lo.ToPtr(0.0))
	member, _ := NewWorkspaceMember(3, "member@example.com", "Member", WorkspaceRoleMember, WorkspaceMemberStateJoined, lo.ToPtr(0.0), lo.ToPtr(0.0))

	if !owner.CanManageMembers() {
		t.Fatal("expected owner to manage members")
	}
	if !admin.CanManageMembers() {
		t.Fatal("expected admin to manage members")
	}
	if member.CanManageMembers() {
		t.Fatal("expected non-admin member not to manage members")
	}
}

func TestWorkspaceMemberTransitionValidation(t *testing.T) {
	invited, _ := NewWorkspaceMember(1, "a@example.com", "A", WorkspaceRoleMember, WorkspaceMemberStateInvited, lo.ToPtr(0.0), lo.ToPtr(0.0))
	if err := invited.Disable(); err != ErrWorkspaceMemberCannotDisableFromState {
		t.Fatalf("expected ErrWorkspaceMemberCannotDisableFromState, got %v", err)
	}
	if err := invited.Restore(); err != ErrWorkspaceMemberNotDisabled {
		t.Fatalf("expected ErrWorkspaceMemberNotDisabled, got %v", err)
	}

	joined, _ := NewWorkspaceMember(2, "b@example.com", "B", WorkspaceRoleMember, WorkspaceMemberStateJoined, lo.ToPtr(0.0), lo.ToPtr(0.0))
	if err := joined.Join(); err != ErrWorkspaceMemberNotInvited {
		t.Fatalf("expected ErrWorkspaceMemberNotInvited, got %v", err)
	}

	removed, _ := NewWorkspaceMember(3, "c@example.com", "C", WorkspaceRoleMember, WorkspaceMemberStateRemoved, lo.ToPtr(0.0), lo.ToPtr(0.0))
	if err := removed.Join(); err != ErrWorkspaceMemberRemoved {
		t.Fatalf("expected ErrWorkspaceMemberRemoved, got %v", err)
	}
	if err := removed.Disable(); err != ErrWorkspaceMemberRemoved {
		t.Fatalf("expected ErrWorkspaceMemberRemoved, got %v", err)
	}
	if err := removed.Restore(); err != ErrWorkspaceMemberRemoved {
		t.Fatalf("expected ErrWorkspaceMemberRemoved, got %v", err)
	}
	if err := removed.Remove(); err != ErrWorkspaceMemberAlreadyRemoved {
		t.Fatalf("expected ErrWorkspaceMemberAlreadyRemoved, got %v", err)
	}
}

func TestNewWorkspaceMemberRejectsNegativeRateCost(t *testing.T) {
	_, err := NewWorkspaceMember(
		1,
		"user@example.com",
		"User Example",
		WorkspaceRoleMember,
		WorkspaceMemberStateInvited,
		lo.ToPtr(-1.0),
		nil,
	)
	if err != ErrNegativeWorkspaceMemberHourlyRate {
		t.Fatalf("expected ErrNegativeWorkspaceMemberHourlyRate, got %v", err)
	}

	_, err = NewWorkspaceMember(
		1,
		"user@example.com",
		"User Example",
		WorkspaceRoleMember,
		WorkspaceMemberStateInvited,
		nil,
		lo.ToPtr(-1.0),
	)
	if err != ErrNegativeWorkspaceMemberLaborCost {
		t.Fatalf("expected ErrNegativeWorkspaceMemberLaborCost, got %v", err)
	}
}

func TestWorkspaceMemberInviteTokenRequiresInvitedState(t *testing.T) {
	invited, _ := NewWorkspaceMember(1, "a@example.com", "A", WorkspaceRoleMember, WorkspaceMemberStateInvited, nil, nil)
	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	if err := invited.SetInviteToken("abc", expiresAt); err != nil {
		t.Fatalf("expected SetInviteToken to succeed on invited, got %v", err)
	}
	if invited.InviteToken == nil || *invited.InviteToken != "abc" {
		t.Fatalf("expected invite token to be stored, got %#v", invited.InviteToken)
	}
	if invited.InviteTokenExpiresAt == nil {
		t.Fatalf("expected invite token expiry to be stored, got nil")
	}

	joined, _ := NewWorkspaceMember(2, "b@example.com", "B", WorkspaceRoleMember, WorkspaceMemberStateJoined, nil, nil)
	if err := joined.SetInviteToken("zzz", expiresAt); err != ErrWorkspaceMemberNotInvited {
		t.Fatalf("expected SetInviteToken to reject joined state, got %v", err)
	}
}

func TestWorkspaceMemberAcceptInviteTransitionsAndClearsToken(t *testing.T) {
	member, _ := NewWorkspaceMember(1, "a@example.com", "A", WorkspaceRoleMember, WorkspaceMemberStateInvited, nil, nil)
	if err := member.SetInviteToken("abc", time.Now().Add(7*24*time.Hour)); err != nil {
		t.Fatalf("set invite token: %v", err)
	}

	if err := member.AcceptInvite(); err != nil {
		t.Fatalf("expected AcceptInvite to succeed, got %v", err)
	}
	if member.State != WorkspaceMemberStateJoined {
		t.Fatalf("expected state %s, got %s", WorkspaceMemberStateJoined, member.State)
	}
	if member.InviteToken != nil {
		t.Fatalf("expected invite token cleared, got %#v", member.InviteToken)
	}
	if member.InviteTokenExpiresAt != nil {
		t.Fatalf("expected invite token expiry cleared, got %#v", member.InviteTokenExpiresAt)
	}

	// AcceptInvite again on joined state should return ErrWorkspaceMemberNotInvited.
	if err := member.AcceptInvite(); err != ErrWorkspaceMemberNotInvited {
		t.Fatalf("expected ErrWorkspaceMemberNotInvited, got %v", err)
	}
}

func TestWorkspaceMemberSourceDoesNotExposeActiveAlias(t *testing.T) {
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, "workspace_member.go", nil, 0)
	if err != nil {
		t.Fatalf("ParseFile error: %v", err)
	}

	ast.Inspect(file, func(node ast.Node) bool {
		valueSpec, ok := node.(*ast.ValueSpec)
		if !ok {
			return true
		}

		for _, name := range valueSpec.Names {
			if name.Name == "WorkspaceMemberStateActive" {
				t.Fatalf("expected canonical workspace member states only, found internal alias %s", name.Name)
			}
		}

		return true
	})
}

func assertLifecycleStateSequence(
	t *testing.T,
	facts []WorkspaceMemberLifecycleFact,
	want []WorkspaceMemberState,
) {
	t.Helper()

	if len(facts) != len(want) {
		t.Fatalf("expected %d lifecycle facts, got %d", len(want), len(facts))
	}

	for i, state := range want {
		if facts[i].State != state {
			t.Fatalf("expected lifecycle fact at index %d to be %s, got %s", i, state, facts[i].State)
		}
	}
}
