package domain

import (
	"testing"
	"time"
)

func TestParseRegistrationMode(t *testing.T) {
	tests := []struct {
		input   string
		want    RegistrationMode
		wantErr bool
	}{
		{"open", RegistrationModeOpen, false},
		{"closed", RegistrationModeClosed, false},
		{"invite_only", RegistrationModeInviteOnly, false},
		{"invalid", "", true},
		{"", "", true},
	}
	for _, tt := range tests {
		got, err := ParseRegistrationMode(tt.input)
		if (err != nil) != tt.wantErr {
			t.Errorf("ParseRegistrationMode(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
			continue
		}
		if got != tt.want {
			t.Errorf("ParseRegistrationMode(%q) = %v, want %v", tt.input, got, tt.want)
		}
	}
}

func TestNewDefaultPolicy(t *testing.T) {
	now := time.Date(2026, 3, 28, 12, 0, 0, 0, time.UTC)
	policy := NewDefaultPolicy(now)
	if policy.Mode != RegistrationModeClosed {
		t.Fatalf("default policy should be closed, got: %v", policy.Mode)
	}
	if !policy.UpdatedAt.Equal(now) {
		t.Fatalf("updated_at should be set, got: %v", policy.UpdatedAt)
	}
}

func TestRegistrationPolicy_SetMode(t *testing.T) {
	now := time.Date(2026, 3, 28, 12, 0, 0, 0, time.UTC)
	policy := NewDefaultPolicy(now)

	later := now.Add(time.Hour)
	policy.SetMode(RegistrationModeOpen, later)

	if policy.Mode != RegistrationModeOpen {
		t.Fatalf("mode should be open, got: %v", policy.Mode)
	}
	if !policy.UpdatedAt.Equal(later) {
		t.Fatalf("updated_at should be updated, got: %v", policy.UpdatedAt)
	}
}
