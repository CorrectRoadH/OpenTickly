package bootstrap

import (
	"context"
	"net/http"
	"testing"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestPublicTrackOrganizationWorkspacesAndWorkspaceScopedReads(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("org-owner")

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
		"email":    uniqueEmail,
		"fullname": "Org Owner",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}

	var registerBody struct {
		User struct {
			ID int64 `json:"id"`
		} `json:"user"`
		CurrentOrganizationID *int64 `json:"current_organization_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &registerBody)
	organizationID := *registerBody.CurrentOrganizationID

	resetToken := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/me/reset_token",
		nil,
		basicAuthorization(uniqueEmail, "secret1"),
	)
	if resetToken.Code != http.StatusOK {
		t.Fatalf("expected reset token status 200, got %d body=%s", resetToken.Code, resetToken.Body.String())
	}
	var rotatedToken string
	mustDecodeJSON(t, resetToken.Body.Bytes(), &rotatedToken)
	tokenAuthorization := basicAuthorization(rotatedToken, "api_token")

	createWorkspace := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/organizations/"+intToString(organizationID)+"/workspaces",
		map[string]any{"name": "Ops Workspace"},
		tokenAuthorization,
	)
	if createWorkspace.Code != http.StatusOK {
		t.Fatalf("expected organization workspace create status 200, got %d body=%s", createWorkspace.Code, createWorkspace.Body.String())
	}

	var workspaceBody map[string]any
	mustDecodeJSON(t, createWorkspace.Body.Bytes(), &workspaceBody)
	workspaceID := int64(workspaceBody["id"].(float64))
	if int64(workspaceBody["organization_id"].(float64)) != organizationID {
		t.Fatalf("expected organization id %d, got %#v", organizationID, workspaceBody["organization_id"])
	}

	if _, err := database.Pool.Exec(
		context.Background(),
		"insert into catalog_groups (workspace_id, name, created_by) values ($1, $2, $3)",
		workspaceID,
		"Ops Group",
		registerBody.User.ID,
	); err != nil {
		t.Fatalf("seed workspace group: %v", err)
	}

	organizationWorkspaceGroups := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/organizations/"+intToString(organizationID)+"/workspaces/"+intToString(workspaceID)+"/groups",
		nil,
		tokenAuthorization,
	)
	if organizationWorkspaceGroups.Code != http.StatusOK {
		t.Fatalf("expected organization workspace groups status 200, got %d body=%s", organizationWorkspaceGroups.Code, organizationWorkspaceGroups.Body.String())
	}
	var groupsBody []map[string]any
	mustDecodeJSON(t, organizationWorkspaceGroups.Body.Bytes(), &groupsBody)
	if len(groupsBody) != 1 || groupsBody[0]["name"] != "Ops Group" {
		t.Fatalf("expected one organization workspace group, got %#v", groupsBody)
	}

	organizationWorkspaceUsers := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/organizations/"+intToString(organizationID)+"/workspaces/"+intToString(workspaceID)+"/workspace_users",
		nil,
		tokenAuthorization,
	)
	if organizationWorkspaceUsers.Code != http.StatusOK {
		t.Fatalf("expected organization workspace users status 200, got %d body=%s", organizationWorkspaceUsers.Code, organizationWorkspaceUsers.Body.String())
	}
	var usersBody []map[string]any
	mustDecodeJSON(t, organizationWorkspaceUsers.Body.Bytes(), &usersBody)
	if len(usersBody) != 1 {
		t.Fatalf("expected one organization workspace user, got %#v", usersBody)
	}
	if usersBody[0]["email"] != uniqueEmail {
		t.Fatalf("expected organization workspace user email %s, got %#v", uniqueEmail, usersBody[0]["email"])
	}

	organizationGroups := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/organizations/"+intToString(organizationID)+"/groups",
		nil,
		tokenAuthorization,
	)
	if organizationGroups.Code != http.StatusOK {
		t.Fatalf("expected organization groups status 200, got %d body=%s", organizationGroups.Code, organizationGroups.Body.String())
	}
	mustDecodeJSON(t, organizationGroups.Body.Bytes(), &groupsBody)
	if len(groupsBody) != 1 {
		t.Fatalf("expected one organization group, got %#v", groupsBody)
	}

	organizationUsers := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/organizations/"+intToString(organizationID)+"/users",
		nil,
		tokenAuthorization,
	)
	if organizationUsers.Code != http.StatusOK {
		t.Fatalf("expected organization users status 200, got %d body=%s", organizationUsers.Code, organizationUsers.Body.String())
	}
	var orgUsersBody []map[string]any
	mustDecodeJSON(t, organizationUsers.Body.Bytes(), &orgUsersBody)
	if len(orgUsersBody) != 1 {
		t.Fatalf("expected one organization user, got %#v", orgUsersBody)
	}
	if int64(orgUsersBody[0]["workspace_count"].(float64)) != 2 {
		t.Fatalf("expected organization user workspace_count 2, got %#v", orgUsersBody[0]["workspace_count"])
	}

	organizationUsersDetailed := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/organizations/"+intToString(organizationID)+"/users/detailed",
		nil,
		tokenAuthorization,
	)
	if organizationUsersDetailed.Code != http.StatusOK {
		t.Fatalf("expected organization users detailed status 200, got %d body=%s", organizationUsersDetailed.Code, organizationUsersDetailed.Body.String())
	}

	organizationOwner := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/organizations/"+intToString(organizationID)+"/owner",
		nil,
		tokenAuthorization,
	)
	if organizationOwner.Code != http.StatusOK {
		t.Fatalf("expected organization owner status 200, got %d body=%s", organizationOwner.Code, organizationOwner.Body.String())
	}

	organizationRoles := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/organizations/"+intToString(organizationID)+"/roles",
		nil,
		tokenAuthorization,
	)
	if organizationRoles.Code != http.StatusOK {
		t.Fatalf("expected organization roles status 200, got %d body=%s", organizationRoles.Code, organizationRoles.Body.String())
	}

	organizationSubscription := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/organizations/"+intToString(organizationID)+"/subscription",
		nil,
		tokenAuthorization,
	)
	if organizationSubscription.Code != http.StatusOK {
		t.Fatalf("expected organization subscription status 200, got %d body=%s", organizationSubscription.Code, organizationSubscription.Body.String())
	}

	organizationWorkspaceStatistics := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/organizations/"+intToString(organizationID)+"/workspaces/statistics",
		nil,
		tokenAuthorization,
	)
	if organizationWorkspaceStatistics.Code != http.StatusOK {
		t.Fatalf("expected organization workspace statistics status 200, got %d body=%s", organizationWorkspaceStatistics.Code, organizationWorkspaceStatistics.Body.String())
	}
	var statisticsBody map[string]map[string]any
	mustDecodeJSON(t, organizationWorkspaceStatistics.Body.Bytes(), &statisticsBody)
	if len(statisticsBody) != 2 {
		t.Fatalf("expected two organization workspace statistics entries, got %#v", statisticsBody)
	}
}
