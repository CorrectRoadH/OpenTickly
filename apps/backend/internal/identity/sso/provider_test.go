package sso

import "testing"

func TestProviderNameFallsBackToSSO(t *testing.T) {
	if got := NewProvider(Config{}).ProviderName(); got != "SSO" {
		t.Fatalf("expected default provider name SSO, got %q", got)
	}
	if got := NewProvider(Config{ProviderName: "  Okta  "}).ProviderName(); got != "Okta" {
		t.Fatalf("expected trimmed provider name Okta, got %q", got)
	}
}

func TestNewAuthRequestMintsDistinctSecrets(t *testing.T) {
	req := NewAuthRequest()
	if req.State == "" || req.Nonce == "" || req.CodeVerifier == "" {
		t.Fatalf("expected all auth-request secrets to be populated, got %+v", req)
	}
	if req.State == req.Nonce || req.State == req.CodeVerifier || req.Nonce == req.CodeVerifier {
		t.Fatalf("expected state/nonce/verifier to differ, got %+v", req)
	}

	other := NewAuthRequest()
	if other.State == req.State {
		t.Fatalf("expected distinct state across requests")
	}
}
