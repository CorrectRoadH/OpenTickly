package domain

import "testing"

func TestNewPushServiceTokenRejectsBlankValues(t *testing.T) {
	if _, err := NewPushServiceToken("   "); err != ErrPushServiceTokenRequired {
		t.Fatalf("expected ErrPushServiceTokenRequired, got %v", err)
	}
}

func TestNewPushServiceNormalizesToken(t *testing.T) {
	pushService, err := NewPushService(12, "  device-token-1  ")
	if err != nil {
		t.Fatalf("expected push service to be valid: %v", err)
	}
	if pushService.UserID() != 12 {
		t.Fatalf("expected user id 12, got %d", pushService.UserID())
	}
	if pushService.Token().String() != "device-token-1" {
		t.Fatalf("expected normalized token, got %q", pushService.Token().String())
	}
}
