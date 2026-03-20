package domain

import "testing"

func TestNewOrganizationIDRejectsNonPositiveValues(t *testing.T) {
	if _, err := NewOrganizationID(0); err == nil {
		t.Fatal("expected zero organization id to be rejected")
	}

	if _, err := NewOrganizationID(-7); err == nil {
		t.Fatal("expected negative organization id to be rejected")
	}

	id, err := NewOrganizationID(42)
	if err != nil {
		t.Fatalf("expected positive organization id to be accepted: %v", err)
	}

	if got := id.String(); got != "42" {
		t.Fatalf("expected string form to be 42, got %q", got)
	}
}
