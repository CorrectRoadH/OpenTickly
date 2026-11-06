package domain

import (
	"errors"
	"testing"
)

func validOIDC() OIDCConfig {
	return OIDCConfig{
		Enabled:      true,
		ProviderName: "Google",
		IssuerURL:    "https://accounts.google.com",
		ClientID:     "client",
		ClientSecret: "secret",
	}
}

func TestOIDCConfigValidateEnabledRequiresEverything(t *testing.T) {
	cases := map[string]func(c *OIDCConfig){
		"issuer_url":    func(c *OIDCConfig) { c.IssuerURL = "" },
		"client_id":     func(c *OIDCConfig) { c.ClientID = "" },
		"client_secret": func(c *OIDCConfig) { c.ClientSecret = "" },
	}
	for field, mutate := range cases {
		cfg := validOIDC()
		mutate(&cfg)
		err := cfg.Validate("https://track.example.com")
		var validation *OIDCValidationError
		if !errors.As(err, &validation) || validation.Field != field {
			t.Fatalf("%s: expected validation error on that field, got %v", field, err)
		}
		if !errors.Is(err, ErrOIDCConfigInvalid) {
			t.Fatalf("%s: expected ErrOIDCConfigInvalid, got %v", field, err)
		}
	}
}

func TestOIDCConfigValidateRequiresHTTPSSiteURLWhenEnabled(t *testing.T) {
	cfg := validOIDC()
	if err := cfg.Validate("http://localhost:8080"); err == nil {
		t.Fatal("expected http site url to be rejected when enabling")
	}
	cfg.Enabled = false
	if err := cfg.Validate(""); err != nil {
		t.Fatalf("a disabled draft must not require a site url: %v", err)
	}
}

func TestOIDCConfigValidateRejectsNonHTTPSIssuer(t *testing.T) {
	cfg := validOIDC()
	cfg.IssuerURL = "http://accounts.google.com"
	if err := cfg.Validate("https://track.example.com"); err == nil {
		t.Fatal("expected http issuer to be rejected")
	}
}

func TestOIDCConfigNormalizeAndAllowsEmail(t *testing.T) {
	cfg := OIDCConfig{
		IssuerURL:           " https://accounts.google.com/ ",
		AllowedEmailDomains: []string{" @Example.COM ", "", "example.com", "Niitsuma.net"},
	}.Normalize()
	if cfg.IssuerURL != "https://accounts.google.com" {
		t.Fatalf("issuer not normalized: %q", cfg.IssuerURL)
	}
	if len(cfg.AllowedEmailDomains) != 2 || cfg.AllowedEmailDomains[0] != "example.com" || cfg.AllowedEmailDomains[1] != "niitsuma.net" {
		t.Fatalf("domains not normalized: %v", cfg.AllowedEmailDomains)
	}
	if !cfg.AllowsEmail("Yuri@Example.com") || cfg.AllowsEmail("someone@gmail.com") || cfg.AllowsEmail("broken@") {
		t.Fatal("allow-list evaluation is wrong")
	}
	if !(OIDCConfig{}).AllowsEmail("anyone@anywhere.io") {
		t.Fatal("empty allow-list must allow any email")
	}
}

func TestOIDCConfigValidateRejectsInvalidDomain(t *testing.T) {
	cfg := validOIDC()
	cfg.AllowedEmailDomains = []string{"nodot"}
	if err := cfg.Validate("https://track.example.com"); err == nil {
		t.Fatal("expected invalid domain to be rejected")
	}
}

func TestOIDCConfigTrustChanged(t *testing.T) {
	current := validOIDC()
	next := current
	next.ProviderName = "Renamed"
	next.ClientSecret = "rotated"
	if current.TrustChanged(next) {
		t.Fatal("name or secret rotation must not drop bindings")
	}
	next.ClientID = "other"
	if !current.TrustChanged(next) {
		t.Fatal("a new client id must drop bindings")
	}
}

func TestOIDCConfigDisplayName(t *testing.T) {
	if (OIDCConfig{IssuerURL: "https://accounts.google.com"}).DisplayName() != "accounts.google.com" {
		t.Fatal("expected issuer host fallback")
	}
	if (OIDCConfig{ProviderName: "Google"}).DisplayName() != "Google" {
		t.Fatal("expected provider name")
	}
}
