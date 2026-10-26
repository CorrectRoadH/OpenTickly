package bootstrap

import (
	"testing"

	identitysaml "opentoggl/backend/apps/backend/internal/identity/saml"
)

func TestEmailDomainPattern(t *testing.T) {
	valid := []string{"example.com", "sub.acme.io", "a-b.co.uk"}
	invalid := []string{"example", "@example.com", "exa mple.com", "-bad.com", ""}
	for _, d := range valid {
		if !emailDomainPattern.MatchString(d) {
			t.Errorf("expected %q to be a valid domain", d)
		}
	}
	for _, d := range invalid {
		if emailDomainPattern.MatchString(d) {
			t.Errorf("expected %q to be an invalid domain", d)
		}
	}
}

func TestCertificateCheck(t *testing.T) {
	keypair, err := identitysaml.GenerateKeypair()
	if err != nil {
		t.Fatalf("GenerateKeypair: %v", err)
	}
	if got := certificateCheck(keypair.CertificatePEM); got.Status != "ok" {
		t.Errorf("valid certificate: status = %q, want ok (detail %q)", got.Status, got.Detail)
	}
	if got := certificateCheck("not a certificate"); got.Status != "error" {
		t.Errorf("garbage certificate: status = %q, want error", got.Status)
	}
}
