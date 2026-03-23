package bootstrap

import (
	"net/http"
	"testing"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestPublicTrackWorkspaceLogoLifecycle(t *testing.T) {
	database := pgtest.Open(t)

	app, err := NewApp(Config{
		ServiceName: "opentoggl-api",
		Server:      ServerConfig{ListenAddress: ":0"},
		Database:    DatabaseConfig{PrimaryDSN: database.ConnString()},
		Redis:       RedisConfig{Address: "redis://127.0.0.1:6379/0"},
	})
	if err != nil {
		t.Fatalf("NewApp returned error: %v", err)
	}
	t.Cleanup(app.Platform.Database.Close)

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    "logo-owner@example.com",
		"fullname": "Logo Owner",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}

	var registerBody struct {
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &registerBody)
	if registerBody.CurrentWorkspaceID == nil {
		t.Fatalf("expected current workspace id in register response, got %#v", registerBody)
	}

	resetToken := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/me/reset_token",
		nil,
		basicAuthorization("logo-owner@example.com", "secret1"),
	)
	if resetToken.Code != http.StatusOK {
		t.Fatalf("expected reset token status 200, got %d body=%s", resetToken.Code, resetToken.Body.String())
	}
	var rotatedToken string
	mustDecodeJSON(t, resetToken.Body.Bytes(), &rotatedToken)
	tokenAuthorization := basicAuthorization(rotatedToken, "api_token")

	workspaceID := *registerBody.CurrentWorkspaceID
	postLogo := performAuthorizedMultipartRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/logo",
		nil,
		"file",
		"workspace-logo.png",
		[]byte("png-bytes"),
		tokenAuthorization,
	)
	if postLogo.Code != http.StatusOK {
		t.Fatalf("expected post workspace logo status 200, got %d body=%s", postLogo.Code, postLogo.Body.String())
	}

	var postedLogo publictrackapi.ModelsLogo
	mustDecodeJSON(t, postLogo.Body.Bytes(), &postedLogo)
	if postedLogo.Logo == nil || *postedLogo.Logo == "" {
		t.Fatalf("expected non-empty logo URL, got %#v", postedLogo)
	}
	logoURL := *postedLogo.Logo

	getLogo := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/logo",
		nil,
		tokenAuthorization,
	)
	if getLogo.Code != http.StatusOK {
		t.Fatalf("expected get workspace logo status 200, got %d body=%s", getLogo.Code, getLogo.Body.String())
	}

	var fetchedLogo publictrackapi.ModelsLogo
	mustDecodeJSON(t, getLogo.Body.Bytes(), &fetchedLogo)
	if fetchedLogo.Logo == nil || *fetchedLogo.Logo != logoURL {
		t.Fatalf("expected fetched logo %q, got %#v", logoURL, fetchedLogo)
	}

	deleteLogo := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodDelete,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/logo",
		nil,
		tokenAuthorization,
	)
	if deleteLogo.Code != http.StatusOK {
		t.Fatalf("expected delete workspace logo status 200, got %d body=%s", deleteLogo.Code, deleteLogo.Body.String())
	}

	var deletedLogo publictrackapi.ModelsLogo
	mustDecodeJSON(t, deleteLogo.Body.Bytes(), &deletedLogo)
	if deletedLogo.Logo == nil || *deletedLogo.Logo != "" {
		t.Fatalf("expected deleted logo payload to be blank, got %#v", deletedLogo)
	}

	getDeletedLogo := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/logo",
		nil,
		tokenAuthorization,
	)
	if getDeletedLogo.Code != http.StatusOK {
		t.Fatalf("expected get deleted workspace logo status 200, got %d body=%s", getDeletedLogo.Code, getDeletedLogo.Body.String())
	}

	mustDecodeJSON(t, getDeletedLogo.Body.Bytes(), &fetchedLogo)
	if fetchedLogo.Logo == nil || *fetchedLogo.Logo != "" {
		t.Fatalf("expected blank logo after delete, got %#v", fetchedLogo)
	}
}
