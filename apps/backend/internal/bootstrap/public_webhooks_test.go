package bootstrap

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestPublicWebhooksValidationAndAuthentication(t *testing.T) {
	database := pgtest.Open(t)
	app, err := NewApp(Config{
		Server:   ServerConfig{ListenAddress: ":0"},
		Database: DatabaseConfig{PrimaryDSN: database.ConnString()},
		Redis:    RedisConfig{Address: "redis://127.0.0.1:6379/0"},
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(app.Platform.Database.Close)

	email := uniqueTestEmail("webhooks-validation")
	registration := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]string{
		"email": email, "fullname": "Webhook Tester", "password": "secret1",
	}, "")
	if registration.Code != http.StatusCreated {
		t.Fatalf("registration failed: %d %s", registration.Code, registration.Body)
	}
	var home struct {
		WorkspaceID int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, registration.Body.Bytes(), &home)
	if home.WorkspaceID == 0 {
		t.Fatal("registration did not return a workspace")
	}

	path := "/webhooks/api/v1/subscriptions/" + intToString(home.WorkspaceID)
	unauthenticated := performJSONRequest(t, app, http.MethodGet, path, nil, "")
	if unauthenticated.Code != http.StatusForbidden {
		t.Fatalf("unauthenticated list returned %d: %s", unauthenticated.Code, unauthenticated.Body)
	}
	var authError struct {
		Message string `json:"message"`
	}
	mustDecodeJSON(t, unauthenticated.Body.Bytes(), &authError)
	if authError.Message != "User does not have access to this resource." {
		t.Fatalf("unexpected authentication error: %q", authError.Message)
	}

	authorization := basicAuthorization(email, "secret1")
	request := httptest.NewRequest(http.MethodPost, path, strings.NewReader(`{"enabled":"invalid"}`))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", authorization)
	response := httptest.NewRecorder()
	app.HTTP.ServeHTTP(response, request)
	var validationError struct {
		Message string `json:"message"`
	}
	if response.Code != http.StatusBadRequest ||
		json.Unmarshal(response.Body.Bytes(), &validationError) != nil ||
		!strings.Contains(validationError.Message, "enabled") {
		t.Fatalf("unexpected validation response: %d %s", response.Code, response.Body)
	}

	authenticated := performAuthorizedJSONRequest(t, app, http.MethodGet, path, nil, authorization)
	if authenticated.Code != http.StatusOK || strings.TrimSpace(authenticated.Body.String()) != "[]" {
		t.Fatalf("authenticated list did not return empty subscriptions: %d %s", authenticated.Code, authenticated.Body)
	}
}
