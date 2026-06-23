package saml

import (
	"encoding/base64"
	"encoding/pem"
	"strings"
	"testing"

	"github.com/crewjam/saml"
)

func TestConfigUsable(t *testing.T) {
	cases := []struct {
		name string
		cfg  Config
		want bool
	}{
		{"metadata url only", Config{IDPMetadataURL: "https://idp.example/meta"}, true},
		{"full manual triple", Config{IDPEntityID: "e", IDPSSOURL: "https://idp/sso", IDPCertificate: "cert"}, true},
		{"missing certificate", Config{IDPEntityID: "e", IDPSSOURL: "https://idp/sso"}, false},
		{"empty", Config{}, false},
	}
	for _, tc := range cases {
		if got := tc.cfg.Usable(); got != tc.want {
			t.Errorf("%s: Usable() = %v, want %v", tc.name, got, tc.want)
		}
	}
}

func TestKeypairRoundTrip(t *testing.T) {
	keypair, err := GenerateKeypair()
	if err != nil {
		t.Fatalf("GenerateKeypair: %v", err)
	}
	if keypair.Key == nil || keypair.Certificate == nil {
		t.Fatal("expected key and certificate to be populated")
	}

	parsed, err := ParseKeypair(keypair.PrivateKeyPEM, keypair.CertificatePEM)
	if err != nil {
		t.Fatalf("ParseKeypair: %v", err)
	}
	if !parsed.Key.Equal(keypair.Key) {
		t.Error("round-tripped private key does not match")
	}
	if !parsed.Certificate.Equal(keypair.Certificate) {
		t.Error("round-tripped certificate does not match")
	}
}

func TestCertificateBase64DERAcceptsPEMAndBareBase64(t *testing.T) {
	keypair, err := GenerateKeypair()
	if err != nil {
		t.Fatalf("GenerateKeypair: %v", err)
	}
	wantDER := base64.StdEncoding.EncodeToString(keypair.Certificate.Raw)

	fromPEM, err := certificateBase64DER(keypair.CertificatePEM)
	if err != nil {
		t.Fatalf("from PEM: %v", err)
	}
	if fromPEM != wantDER {
		t.Error("PEM did not decode to expected DER")
	}

	block, _ := pem.Decode([]byte(keypair.CertificatePEM))
	bareBase64 := base64.StdEncoding.EncodeToString(block.Bytes)
	fromBare, err := certificateBase64DER(bareBase64)
	if err != nil {
		t.Fatalf("from bare base64: %v", err)
	}
	if fromBare != wantDER {
		t.Error("bare base64 did not normalize to expected DER")
	}

	if _, err := certificateBase64DER("not a certificate"); err == nil {
		t.Error("expected error for invalid certificate")
	}
}

func TestEmailFromAssertion(t *testing.T) {
	t.Run("from email attribute", func(t *testing.T) {
		assertion := &saml.Assertion{
			AttributeStatements: []saml.AttributeStatement{{
				Attributes: []saml.Attribute{{
					Name:   "urn:oid:0.9.2342.19200300.100.1.3",
					Values: []saml.AttributeValue{{Value: "Alice@Example.com"}},
				}},
			}},
		}
		if got := EmailFromAssertion(assertion); got != "alice@example.com" {
			t.Errorf("EmailFromAssertion() = %q, want lowercased alice@example.com", got)
		}
	})

	t.Run("falls back to NameID when it is an email", func(t *testing.T) {
		assertion := &saml.Assertion{
			Subject: &saml.Subject{NameID: &saml.NameID{Value: "Bob@Example.com"}},
		}
		if got := EmailFromAssertion(assertion); got != "bob@example.com" {
			t.Errorf("EmailFromAssertion() = %q, want bob@example.com", got)
		}
	})

	t.Run("empty when no email present", func(t *testing.T) {
		assertion := &saml.Assertion{
			Subject: &saml.Subject{NameID: &saml.NameID{Value: "not-an-email"}},
		}
		if got := EmailFromAssertion(assertion); got != "" {
			t.Errorf("EmailFromAssertion() = %q, want empty", got)
		}
	})
}

func TestNameFromAssertion(t *testing.T) {
	assertion := &saml.Assertion{
		AttributeStatements: []saml.AttributeStatement{{
			Attributes: []saml.Attribute{{
				Name:   "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
				Values: []saml.AttributeValue{{Value: "Alice Anders"}},
			}},
		}},
	}
	if got := NameFromAssertion(assertion); got != "Alice Anders" {
		t.Errorf("NameFromAssertion() = %q, want Alice Anders", got)
	}
}

func TestSPMetadataURLs(t *testing.T) {
	keypair, err := GenerateKeypair()
	if err != nil {
		t.Fatalf("GenerateKeypair: %v", err)
	}
	metadata, err := SPMetadata(keypair, "https://app.example.com/", 2)
	if err != nil {
		t.Fatalf("SPMetadata: %v", err)
	}
	wantEntityID := "https://app.example.com/auth/saml2/metadata/2"
	if metadata.EntityID != wantEntityID {
		t.Errorf("EntityID = %q, want %q", metadata.EntityID, wantEntityID)
	}
	if len(metadata.SPSSODescriptors) == 0 {
		t.Fatal("expected an SPSSODescriptor")
	}
	acs := metadata.SPSSODescriptors[0].AssertionConsumerServices
	if len(acs) == 0 || acs[0].Location != "https://app.example.com/auth/saml2/acs/2" {
		t.Errorf("ACS location = %+v, want .../auth/saml2/acs/2", acs)
	}
}

func TestManualIDPMetadata(t *testing.T) {
	keypair, err := GenerateKeypair()
	if err != nil {
		t.Fatalf("GenerateKeypair: %v", err)
	}
	descriptor, err := manualIDPMetadata(Config{
		IDPEntityID:    "https://idp.example/entity",
		IDPSSOURL:      "https://idp.example/sso",
		IDPCertificate: keypair.CertificatePEM,
	})
	if err != nil {
		t.Fatalf("manualIDPMetadata: %v", err)
	}
	if descriptor.EntityID != "https://idp.example/entity" {
		t.Errorf("EntityID = %q", descriptor.EntityID)
	}
	if len(descriptor.IDPSSODescriptors) != 1 {
		t.Fatalf("expected 1 IDPSSODescriptor, got %d", len(descriptor.IDPSSODescriptors))
	}
	idp := descriptor.IDPSSODescriptors[0]
	if len(idp.SingleSignOnServices) == 0 || idp.SingleSignOnServices[0].Location != "https://idp.example/sso" {
		t.Error("missing or wrong SingleSignOnService location")
	}
	if len(idp.KeyDescriptors) == 0 || !strings.Contains(idp.KeyDescriptors[0].KeyInfo.X509Data.X509Certificates[0].Data, "MII") {
		t.Error("expected an X.509 signing certificate in key descriptor")
	}
}
