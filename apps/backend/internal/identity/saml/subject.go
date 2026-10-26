package saml

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/crewjam/saml"
)

// SubjectKey accepts only an audience-bound, SP-initiated bearer assertion with
// a stable NameID. It runs after signature and protocol verification.
func SubjectKey(assertion *saml.Assertion, sp *saml.ServiceProvider, requestID string) (string, error) {
	if assertion == nil || assertion.Subject == nil || assertion.Subject.NameID == nil || assertion.Conditions == nil || len(assertion.Conditions.AudienceRestrictions) == 0 {
		return "", errors.New("missing SAML subject or audience")
	}
	if assertion.Issuer.Value != sp.IDPMetadata.EntityID {
		return "", errors.New("SAML issuer mismatch")
	}
	for _, restriction := range assertion.Conditions.AudienceRestrictions {
		if restriction.Audience.Value != sp.EntityID {
			return "", errors.New("SAML audience mismatch")
		}
	}
	confirmed := false
	for _, confirmation := range assertion.Subject.SubjectConfirmations {
		data := confirmation.SubjectConfirmationData
		if confirmation.Method == "urn:oasis:names:tc:SAML:2.0:cm:bearer" && data != nil && data.InResponseTo == requestID && data.Recipient == sp.AcsURL.String() && time.Now().Before(data.NotOnOrAfter) && (data.NotBefore.IsZero() || !time.Now().Before(data.NotBefore)) {
			confirmed = true
		}
	}
	if !confirmed {
		return "", errors.New("missing SAML bearer confirmation")
	}
	name := assertion.Subject.NameID
	if strings.TrimSpace(name.Value) == "" || name.Format == string(saml.TransientNameIDFormat) {
		return "", errors.New("SAML NameID must be stable")
	}
	format := name.Format
	if format == "" {
		format = string(saml.UnspecifiedNameIDFormat)
	}
	parts := [5]string{assertion.Issuer.Value, format, name.NameQualifier, name.SPNameQualifier, name.Value}
	for _, part := range parts {
		if len(part) > 2048 || !utf8.ValidString(part) || strings.IndexFunc(part, unicode.IsControl) >= 0 {
			return "", errors.New("invalid SAML subject")
		}
	}
	encoded, err := json.Marshal(parts)
	if err != nil {
		return "", err
	}
	hash := sha256.Sum256(encoded)
	return hex.EncodeToString(hash[:]), nil
}
