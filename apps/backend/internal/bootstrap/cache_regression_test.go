package bootstrap

import (
	"context"
	"net/http"
	"testing"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestArchivedClientDetailInvalidatesCachedClient(t *testing.T) {
	database := pgtest.Open(t)
	app, err := NewApp(Config{
		ServiceName: "opentoggl-api",
		Server: ServerConfig{
			ListenAddress: ":0",
		},
		Database: DatabaseConfig{
			PrimaryDSN: database.ConnString(),
		},
		Redis: RedisConfig{
			Address: "redis://127.0.0.1:6379/0",
		},
	})
	if err != nil {
		t.Fatalf("NewApp returned error: %v", err)
	}
	t.Cleanup(app.Platform.Database.Close)
	t.Cleanup(func() { _ = app.Platform.Cache.FlushDB(context.Background()) })

	email := uniqueTestEmail("cached-client")
	password := "secret1"
	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", struct {
		Email    string `json:"email"`
		Fullname string `json:"fullname"`
		Password string `json:"password"`
	}{
		Email:    email,
		Fullname: "Cached Token",
		Password: password,
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}
	var registerBody struct {
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &registerBody)
	if registerBody.CurrentWorkspaceID == nil {
		t.Fatalf("expected current workspace id, got %#v", registerBody)
	}
	workspaceID := *registerBody.CurrentWorkspaceID

	authorization := basicAuthorization(email, password)
	createClient := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients",
		struct {
			Name string `json:"name"`
		}{Name: "Cached Client"},
		authorization,
	)
	if createClient.Code != http.StatusOK {
		t.Fatalf("expected client create status 200, got %d body=%s", createClient.Code, createClient.Body.String())
	}
	var clientBody struct {
		ID int64 `json:"id"`
	}
	mustDecodeJSON(t, createClient.Body.Bytes(), &clientBody)
	if clientBody.ID == 0 {
		t.Fatalf("expected client id, got %#v", clientBody)
	}

	archiveClient := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients/"+intToString(clientBody.ID)+"/archive",
		nil,
		authorization,
	)
	if archiveClient.Code != http.StatusOK {
		t.Fatalf("expected client archive status 200, got %d body=%s", archiveClient.Code, archiveClient.Body.String())
	}

	getClient := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients/"+intToString(clientBody.ID),
		nil,
		authorization,
	)
	if getClient.Code != http.StatusOK {
		t.Fatalf("expected client detail status 200, got %d body=%s", getClient.Code, getClient.Body.String())
	}
	var archivedClient struct {
		Archived bool `json:"archived"`
	}
	mustDecodeJSON(t, getClient.Body.Bytes(), &archivedClient)
	if !archivedClient.Archived {
		t.Fatalf(
			"expected archived client detail to show archived=true, got body=%s",
			getClient.Body.String(),
		)
	}
}
