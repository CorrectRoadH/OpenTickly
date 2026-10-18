package application

import (
	"strings"
	"testing"
)

func TestAuditPayloadRedactsNestedCredentialsAndPreservesBusinessData(t *testing.T) {
	input := `{"name":"O'Reilly; DROP TABLE projects; --","nested":[{"PASSWORD":"password-value","api-token":"token-value","client_secret":"secret-value","Authorization":"bearer-value","Cookie":"cookie-value","rate":12}]}`
	actual := SanitizeAuditPayload([]byte(input))
	for _, secret := range []string{"password-value", "token-value", "secret-value", "bearer-value", "cookie-value"} {
		if strings.Contains(actual, secret) {
			t.Errorf("leaked %s", secret)
		}
	}
	if !strings.Contains(actual, "O'Reilly; DROP TABLE projects; --") || !strings.Contains(actual, `"rate":12`) {
		t.Fatalf("business data lost: %s", actual)
	}
}

func TestAuditPayloadOmitsIncompleteOversizedAndScalarData(t *testing.T) {
	for _, input := range []string{`"raw-token"`, `{"password":"incomplete`, `{"name":"` + strings.Repeat("x", AuditPayloadMaxSize) + `"}`, `not-json`, `null`} {
		if actual := SanitizeAuditPayload([]byte(input)); actual != "" {
			t.Fatalf("unsafe payload retained: %.30s", actual)
		}
	}
}
