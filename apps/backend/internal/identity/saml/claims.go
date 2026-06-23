package saml

import (
	"strings"

	"github.com/crewjam/saml"
)

// Common SAML attribute names for email and display name across IdPs.
var emailAttributeNames = []string{
	"urn:oid:0.9.2342.19200300.100.1.3", // mail
	"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
	"emailaddress",
	"email",
	"mail",
}

var nameAttributeNames = []string{
	"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
	"urn:oid:2.16.840.1.113730.3.1.241", // displayName
	"displayName",
	"name",
}

// EmailFromAssertion extracts the user's email: a known email attribute first,
// then the NameID when it carries an email-format value.
func EmailFromAssertion(assertion *saml.Assertion) string {
	for _, name := range emailAttributeNames {
		if value := attributeValue(assertion, name); value != "" {
			return strings.ToLower(value)
		}
	}
	if assertion.Subject != nil && assertion.Subject.NameID != nil {
		value := strings.TrimSpace(assertion.Subject.NameID.Value)
		if strings.Contains(value, "@") {
			return strings.ToLower(value)
		}
	}
	return ""
}

// NameFromAssertion extracts a display name, falling back to first+last name.
func NameFromAssertion(assertion *saml.Assertion) string {
	for _, name := range nameAttributeNames {
		if value := attributeValue(assertion, name); value != "" {
			return value
		}
	}
	first := attributeValue(assertion, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname")
	last := attributeValue(assertion, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname")
	return strings.TrimSpace(first + " " + last)
}

func attributeValue(assertion *saml.Assertion, name string) string {
	for _, statement := range assertion.AttributeStatements {
		for _, attribute := range statement.Attributes {
			if !strings.EqualFold(attribute.Name, name) && !strings.EqualFold(attribute.FriendlyName, name) {
				continue
			}
			for _, value := range attribute.Values {
				if trimmed := strings.TrimSpace(value.Value); trimmed != "" {
					return trimmed
				}
			}
		}
	}
	return ""
}
