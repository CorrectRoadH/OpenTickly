package domain

import "testing"

func TestNewWorkspaceIDRejectsZero(t *testing.T) {
	if _, err := NewWorkspaceID(0); err == nil {
		t.Fatal("expected zero workspace id to be rejected")
	}

	id, err := NewWorkspaceID(42)
	if err != nil {
		t.Fatalf("expected positive workspace id to be accepted: %v", err)
	}

	if got := id.String(); got != "42" {
		t.Fatalf("expected id string to be 42, got %q", got)
	}
}
