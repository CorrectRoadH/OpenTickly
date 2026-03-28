package domain

import (
	"testing"
	"time"
)

func TestBootstrapState_Complete(t *testing.T) {
	state := NewBootstrapState()
	now := time.Date(2026, 3, 28, 12, 0, 0, 0, time.UTC)

	if state.Completed {
		t.Fatal("new bootstrap state should not be completed")
	}

	err := state.Complete("admin@example.com", now)
	if err != nil {
		t.Fatalf("first complete should succeed, got: %v", err)
	}
	if !state.Completed {
		t.Fatal("state should be completed after Complete()")
	}
	if state.AdminEmail != "admin@example.com" {
		t.Fatalf("admin email should be set, got: %q", state.AdminEmail)
	}
	if state.CompletedAt == nil || !state.CompletedAt.Equal(now) {
		t.Fatalf("completed_at should be set to now, got: %v", state.CompletedAt)
	}
}

func TestBootstrapState_Complete_RejectsSecondAttempt(t *testing.T) {
	state := NewBootstrapState()
	now := time.Date(2026, 3, 28, 12, 0, 0, 0, time.UTC)

	_ = state.Complete("admin@example.com", now)

	err := state.Complete("other@example.com", now.Add(time.Hour))
	if err != ErrBootstrapAlreadyCompleted {
		t.Fatalf("second complete should return ErrBootstrapAlreadyCompleted, got: %v", err)
	}
	if state.AdminEmail != "admin@example.com" {
		t.Fatal("admin email should not change on rejected second attempt")
	}
}
