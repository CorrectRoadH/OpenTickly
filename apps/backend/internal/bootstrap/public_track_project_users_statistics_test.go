package bootstrap

import (
	"context"
	"net/http"
	"testing"

	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestPublicTrackProjectUsersAndStatistics(t *testing.T) {
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
		"email":    "owner@example.com",
		"fullname": "Owner User",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}

	var registerBody struct {
		User struct {
			ID int64 `json:"id"`
		} `json:"user"`
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &registerBody)
	workspaceID := *registerBody.CurrentWorkspaceID

	passwordAuthorization := basicAuthorization("owner@example.com", "secret1")

	resetToken := performAuthorizedJSONRequest(t, app, http.MethodPost, "/api/v9/me/reset_token", nil, passwordAuthorization)
	if resetToken.Code != http.StatusOK {
		t.Fatalf("expected reset token status 200, got %d body=%s", resetToken.Code, resetToken.Body.String())
	}
	var rotatedToken string
	mustDecodeJSON(t, resetToken.Body.Bytes(), &rotatedToken)
	tokenAuthorization := basicAuthorization(rotatedToken, "api_token")

	createProject := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects",
		map[string]any{"name": "Stats Project"},
		tokenAuthorization,
	)
	if createProject.Code != http.StatusOK {
		t.Fatalf("expected project create status 200, got %d body=%s", createProject.Code, createProject.Body.String())
	}
	var projectBody map[string]any
	mustDecodeJSON(t, createProject.Body.Bytes(), &projectBody)
	projectID := int64(projectBody["id"].(float64))

	seedProjectUserIdentity(t, database, 902, "project-user@example.com")

	createProjectUser := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/project_users",
		map[string]any{"project_id": projectID, "user_id": 902, "manager": true},
		tokenAuthorization,
	)
	if createProjectUser.Code != http.StatusOK {
		t.Fatalf("expected project user create status 200, got %d body=%s", createProjectUser.Code, createProjectUser.Body.String())
	}

	projectUsers := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/project_users?project_ids="+intToString(projectID),
		nil,
		tokenAuthorization,
	)
	if projectUsers.Code != http.StatusOK {
		t.Fatalf("expected project users status 200, got %d body=%s", projectUsers.Code, projectUsers.Body.String())
	}
	var projectUsersBody []map[string]any
	mustDecodeJSON(t, projectUsers.Body.Bytes(), &projectUsersBody)
	if len(projectUsersBody) != 1 {
		t.Fatalf("expected one project user, got %#v", projectUsersBody)
	}
	projectUserID := int64(projectUsersBody[0]["id"].(float64))

	updateProjectUser := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPut,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/project_users/"+intToString(projectUserID),
		map[string]any{"manager": false},
		tokenAuthorization,
	)
	if updateProjectUser.Code != http.StatusOK {
		t.Fatalf("expected project user update status 200, got %d body=%s", updateProjectUser.Code, updateProjectUser.Body.String())
	}

	firstEntry := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries",
		map[string]any{
			"description":  "First project entry",
			"created_with": "project-user-statistics-test",
			"pid":          projectID,
			"start":        "2026-03-01T09:00:00Z",
			"stop":         "2026-03-01T10:00:00Z",
		},
		tokenAuthorization,
	)
	if firstEntry.Code != http.StatusOK {
		t.Fatalf("expected first time entry status 200, got %d body=%s", firstEntry.Code, firstEntry.Body.String())
	}

	secondEntry := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries",
		map[string]any{
			"description":  "Second project entry",
			"created_with": "project-user-statistics-test",
			"pid":          projectID,
			"start":        "2026-03-03T14:30:00Z",
			"stop":         "2026-03-03T15:00:00Z",
		},
		tokenAuthorization,
	)
	if secondEntry.Code != http.StatusOK {
		t.Fatalf("expected second time entry status 200, got %d body=%s", secondEntry.Code, secondEntry.Body.String())
	}

	projectStatistics := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects/"+intToString(projectID)+"/statistics",
		nil,
		tokenAuthorization,
	)
	if projectStatistics.Code != http.StatusOK {
		t.Fatalf("expected project statistics status 200, got %d body=%s", projectStatistics.Code, projectStatistics.Body.String())
	}

	deleteProjectUser := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodDelete,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/project_users/"+intToString(projectUserID),
		nil,
		tokenAuthorization,
	)
	if deleteProjectUser.Code != http.StatusOK {
		t.Fatalf("expected project user delete status 200, got %d body=%s", deleteProjectUser.Code, deleteProjectUser.Body.String())
	}
}

func seedProjectUserIdentity(t *testing.T, database *pgtest.Database, userID int64, email string) {
	t.Helper()

	user, err := identitydomain.RegisterUser(identitydomain.RegisterParams{
		ID:       userID,
		Email:    email,
		FullName: "Project User",
		Password: "secret1",
		APIToken: email + "-token",
	})
	if err != nil {
		t.Fatalf("register project user: %v", err)
	}
	if err := identitypostgres.NewUserRepository(database.Pool).Save(context.Background(), user); err != nil {
		t.Fatalf("save project user: %v", err)
	}
}
