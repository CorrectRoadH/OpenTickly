package bootstrap

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
	trackingpostgres "opentoggl/backend/apps/backend/internal/tracking/infra/postgres"
)

// uniqueTestEmail generates a unique email for test isolation
func uniqueTestEmail(prefix string) string {
	return fmt.Sprintf("%s-%d@example.com", prefix, time.Now().UnixNano())
}

func TestWebRoutesServeLiveEchoServer(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("web-echo")

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

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    uniqueEmail,
		"fullname": "Test Person",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}

	sessionCookie := register.Header().Get("Set-Cookie")
	if sessionCookie == "" {
		t.Fatal("expected register response to set session cookie")
	}

	var bootstrapResponse struct {
		User struct {
			ID                 int64  `json:"id"`
			Email              string `json:"email"`
			DefaultWorkspaceID int64  `json:"default_workspace_id"`
		} `json:"user"`
		CurrentOrganizationID *int64 `json:"current_organization_id"`
		CurrentWorkspaceID    *int64 `json:"current_workspace_id"`
		Organizations         []struct {
			ID   int64  `json:"id"`
			Name string `json:"name"`
		} `json:"organizations"`
		Workspaces []struct {
			ID              int64  `json:"id"`
			OrganizationID  int64  `json:"organization_id"`
			Name            string `json:"name"`
			DefaultCurrency string `json:"default_currency"`
		} `json:"workspaces"`
		WorkspaceCapabilities map[string]any `json:"workspace_capabilities"`
		WorkspaceQuota        map[string]any `json:"workspace_quota"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &bootstrapResponse)

	if bootstrapResponse.User.Email != uniqueEmail {
		t.Fatalf("expected bootstrap email %s, got %q", uniqueEmail, bootstrapResponse.User.Email)
	}
	if len(bootstrapResponse.Workspaces) == 0 {
		t.Fatal("expected at least one workspace in session bootstrap")
	}
	if len(bootstrapResponse.Organizations) == 0 {
		t.Fatal("expected at least one organization in session bootstrap")
	}
	if bootstrapResponse.CurrentWorkspaceID == nil || *bootstrapResponse.CurrentWorkspaceID <= 0 {
		t.Fatalf("expected current workspace id > 0, got %#v", bootstrapResponse.CurrentWorkspaceID)
	}
	if bootstrapResponse.User.DefaultWorkspaceID != *bootstrapResponse.CurrentWorkspaceID {
		t.Fatalf(
			"expected bootstrap default workspace id %d, got %d",
			*bootstrapResponse.CurrentWorkspaceID,
			bootstrapResponse.User.DefaultWorkspaceID,
		)
	}
	if bootstrapResponse.CurrentOrganizationID == nil || *bootstrapResponse.CurrentOrganizationID <= 0 {
		t.Fatalf("expected current organization id > 0, got %#v", bootstrapResponse.CurrentOrganizationID)
	}
	if bootstrapResponse.WorkspaceCapabilities == nil {
		t.Fatal("expected workspace capabilities in session bootstrap")
	}
	if bootstrapResponse.WorkspaceQuota == nil {
		t.Fatal("expected workspace quota in session bootstrap")
	}

	workspaceID := *bootstrapResponse.CurrentWorkspaceID
	organizationID := *bootstrapResponse.CurrentOrganizationID

	session := performJSONRequest(t, app, http.MethodGet, "/web/v1/session", nil, sessionCookie)
	if session.Code != http.StatusOK {
		t.Fatalf("expected session status 200, got %d body=%s", session.Code, session.Body.String())
	}

	passwordAuthorization := basicAuthorization(uniqueEmail, "secret1")

	profile := performAuthorizedJSONRequest(t, app, http.MethodGet, "/api/v9/me", nil, passwordAuthorization)
	if profile.Code != http.StatusOK {
		t.Fatalf("expected profile status 200, got %d body=%s", profile.Code, profile.Body.String())
	}
	var profileBody map[string]any
	mustDecodeJSON(t, profile.Body.Bytes(), &profileBody)
	originalToken, ok := profileBody["api_token"].(string)
	if !ok || originalToken == "" {
		t.Fatalf("expected profile api_token string, got %#v", profileBody["api_token"])
	}

	resetAPIToken := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/me/reset_token",
		nil,
		passwordAuthorization,
	)
	if resetAPIToken.Code != http.StatusOK {
		t.Fatalf("expected api token reset status 200, got %d body=%s", resetAPIToken.Code, resetAPIToken.Body.String())
	}
	var rotatedToken string
	mustDecodeJSON(t, resetAPIToken.Body.Bytes(), &rotatedToken)
	if rotatedToken == "" {
		t.Fatal("expected reset response api_token string")
	}
	if rotatedToken == originalToken {
		t.Fatalf("expected rotated api_token to differ from %q", originalToken)
	}

	tokenAuthorization := basicAuthorization(rotatedToken, "api_token")

	profileAfterReset := performAuthorizedJSONRequest(t, app, http.MethodGet, "/api/v9/me", nil, tokenAuthorization)
	if profileAfterReset.Code != http.StatusOK {
		t.Fatalf("expected profile status 200 after token reset, got %d body=%s", profileAfterReset.Code, profileAfterReset.Body.String())
	}
	var profileAfterResetBody map[string]any
	mustDecodeJSON(t, profileAfterReset.Body.Bytes(), &profileAfterResetBody)
	if profileAfterResetBody["api_token"] != rotatedToken {
		t.Fatalf("expected profile api_token %q after reset, got %#v", rotatedToken, profileAfterResetBody["api_token"])
	}

	renamedEmail := fmt.Sprintf("renamed-%d@example.com", time.Now().UnixNano())
	updatedProfile := performAuthorizedJSONRequest(t, app, http.MethodPut, "/api/v9/me", map[string]any{
		"email":                renamedEmail,
		"fullname":             "Renamed Person",
		"timezone":             "Asia/Shanghai",
		"beginning_of_week":    1,
		"country_id":           44,
		"default_workspace_id": workspaceID,
	}, tokenAuthorization)
	if updatedProfile.Code != http.StatusOK {
		t.Fatalf("expected profile patch status 200, got %d body=%s", updatedProfile.Code, updatedProfile.Body.String())
	}

	preferences := performAuthorizedJSONRequest(t, app, http.MethodGet, "/api/v9/me/preferences", nil, tokenAuthorization)
	if preferences.Code != http.StatusOK {
		t.Fatalf("expected preferences status 200, got %d body=%s", preferences.Code, preferences.Body.String())
	}

	updatedPreferences := performAuthorizedJSONRequest(t, app, http.MethodPost, "/api/v9/me/preferences", map[string]any{
		"date_format":      "YYYY-MM-DD",
		"timeofday_format": "h:mm A",
	}, tokenAuthorization)
	if updatedPreferences.Code != http.StatusOK {
		t.Fatalf("expected preferences patch status 200, got %d body=%s", updatedPreferences.Code, updatedPreferences.Body.String())
	}

	preferencesAfterUpdate := performAuthorizedJSONRequest(t, app, http.MethodGet, "/api/v9/me/preferences", nil, tokenAuthorization)
	if preferencesAfterUpdate.Code != http.StatusOK {
		t.Fatalf("expected preferences status 200 after update, got %d body=%s", preferencesAfterUpdate.Code, preferencesAfterUpdate.Body.String())
	}
	var updatedPreferencesBody map[string]any
	mustDecodeJSON(t, preferencesAfterUpdate.Body.Bytes(), &updatedPreferencesBody)
	if updatedPreferencesBody["date_format"] != "YYYY-MM-DD" {
		t.Fatalf("expected date_format to round-trip, got %#v", updatedPreferencesBody["date_format"])
	}
	if updatedPreferencesBody["timeofday_format"] != "h:mm A" {
		t.Fatalf("expected timeofday_format to round-trip, got %#v", updatedPreferencesBody["timeofday_format"])
	}

	workspaceSettingsPath := "/web/v1/workspaces/" + intToString(workspaceID) + "/settings"
	workspaceSettings := performJSONRequest(t, app, http.MethodGet, workspaceSettingsPath, nil, sessionCookie)
	if workspaceSettings.Code != http.StatusOK {
		t.Fatalf("expected workspace settings status 200, got %d body=%s", workspaceSettings.Code, workspaceSettings.Body.String())
	}
	var workspaceSettingsBody map[string]any
	mustDecodeJSON(t, workspaceSettings.Body.Bytes(), &workspaceSettingsBody)
	if workspaceSettingsBody["workspace"] == nil {
		t.Fatal("expected workspace settings envelope to include workspace")
	}
	if workspaceSettingsBody["preferences"] == nil {
		t.Fatal("expected workspace settings envelope to include preferences")
	}
	if workspaceSettingsBody["capabilities"] == nil {
		t.Fatal("expected workspace settings envelope to include capabilities facts")
	}
	if workspaceSettingsBody["quota"] == nil {
		t.Fatal("expected workspace settings envelope to include quota facts")
	}

	updatedWorkspaceSettings := performJSONRequest(t, app, http.MethodPatch, workspaceSettingsPath, map[string]any{
		"workspace": map[string]any{
			"name":                            "Delivery West",
			"default_currency":                "EUR",
			"default_hourly_rate":             175.0,
			"rounding":                        1,
			"rounding_minutes":                15,
			"reports_collapse":                true,
			"only_admins_may_create_projects": false,
			"only_admins_may_create_tags":     false,
			"only_admins_see_team_dashboard":  false,
			"projects_billable_by_default":    true,
			"projects_private_by_default":     false,
			"projects_enforce_billable":       false,
			"limit_public_project_data":       false,
		},
		"preferences": map[string]any{
			"hide_start_end_times":       true,
			"report_locked_at":           "2026-03-20T00:00:00Z",
			"show_timesheet_view":        false,
			"required_time_entry_fields": []any{"project", "task"},
		},
	}, sessionCookie)
	if updatedWorkspaceSettings.Code != http.StatusOK {
		t.Fatalf("expected workspace settings patch status 200, got %d body=%s", updatedWorkspaceSettings.Code, updatedWorkspaceSettings.Body.String())
	}
	var updatedWorkspaceSettingsBody map[string]any
	mustDecodeJSON(t, updatedWorkspaceSettings.Body.Bytes(), &updatedWorkspaceSettingsBody)
	preferencesBody, ok := updatedWorkspaceSettingsBody["preferences"].(map[string]any)
	if !ok {
		t.Fatalf("expected workspace settings patch response to include preferences map, got %#v", updatedWorkspaceSettingsBody["preferences"])
	}
	if preferencesBody["hide_start_end_times"] != true {
		t.Fatalf("expected hide_start_end_times to persist, got %#v", preferencesBody["hide_start_end_times"])
	}
	if preferencesBody["report_locked_at"] != "2026-03-20T00:00:00Z" {
		t.Fatalf("expected report_locked_at to persist, got %#v", preferencesBody["report_locked_at"])
	}
	if preferencesBody["show_timesheet_view"] != false {
		t.Fatalf("expected show_timesheet_view to persist, got %#v", preferencesBody["show_timesheet_view"])
	}
	requiredFields, ok := preferencesBody["required_time_entry_fields"].([]any)
	if !ok || len(requiredFields) != 2 || requiredFields[0] != "project" || requiredFields[1] != "task" {
		t.Fatalf("expected required_time_entry_fields to persist, got %#v", preferencesBody["required_time_entry_fields"])
	}

	workspacePermissionsPath := "/web/v1/workspaces/" + intToString(workspaceID) + "/permissions"
	workspacePermissions := performJSONRequest(
		t,
		app,
		http.MethodGet,
		workspacePermissionsPath,
		nil,
		sessionCookie,
	)
	if workspacePermissions.Code != http.StatusOK {
		t.Fatalf("expected workspace permissions status 200, got %d body=%s", workspacePermissions.Code, workspacePermissions.Body.String())
	}
	var workspacePermissionsBody map[string]any
	mustDecodeJSON(t, workspacePermissions.Body.Bytes(), &workspacePermissionsBody)
	if workspacePermissionsBody["only_admins_may_create_projects"] != false {
		t.Fatalf("expected only_admins_may_create_projects to reflect workspace settings state, got %#v", workspacePermissionsBody["only_admins_may_create_projects"])
	}
	if workspacePermissionsBody["only_admins_may_create_tags"] != false {
		t.Fatalf("expected only_admins_may_create_tags to reflect workspace settings state, got %#v", workspacePermissionsBody["only_admins_may_create_tags"])
	}
	if workspacePermissionsBody["only_admins_see_team_dashboard"] != false {
		t.Fatalf("expected only_admins_see_team_dashboard to reflect workspace settings state, got %#v", workspacePermissionsBody["only_admins_see_team_dashboard"])
	}
	if workspacePermissionsBody["limit_public_project_data"] != false {
		t.Fatalf("expected limit_public_project_data to reflect workspace settings state, got %#v", workspacePermissionsBody["limit_public_project_data"])
	}

	updatedWorkspacePermissions := performJSONRequest(t, app, http.MethodPatch, workspacePermissionsPath, map[string]any{
		"only_admins_may_create_projects": true,
		"only_admins_may_create_tags":     true,
		"only_admins_see_team_dashboard":  true,
		"limit_public_project_data":       true,
	}, sessionCookie)
	if updatedWorkspacePermissions.Code != http.StatusOK {
		t.Fatalf("expected workspace permissions patch status 200, got %d body=%s", updatedWorkspacePermissions.Code, updatedWorkspacePermissions.Body.String())
	}
	var updatedWorkspacePermissionsBody map[string]any
	mustDecodeJSON(t, updatedWorkspacePermissions.Body.Bytes(), &updatedWorkspacePermissionsBody)
	if updatedWorkspacePermissionsBody["only_admins_may_create_projects"] != true {
		t.Fatalf("expected only_admins_may_create_projects to persist through permissions patch, got %#v", updatedWorkspacePermissionsBody["only_admins_may_create_projects"])
	}
	if updatedWorkspacePermissionsBody["only_admins_may_create_tags"] != true {
		t.Fatalf("expected only_admins_may_create_tags to persist through permissions patch, got %#v", updatedWorkspacePermissionsBody["only_admins_may_create_tags"])
	}
	if updatedWorkspacePermissionsBody["only_admins_see_team_dashboard"] != true {
		t.Fatalf("expected only_admins_see_team_dashboard to persist through permissions patch, got %#v", updatedWorkspacePermissionsBody["only_admins_see_team_dashboard"])
	}
	if updatedWorkspacePermissionsBody["limit_public_project_data"] != true {
		t.Fatalf("expected limit_public_project_data to persist through permissions patch, got %#v", updatedWorkspacePermissionsBody["limit_public_project_data"])
	}

	workspaceSettingsAfterPermissions := performJSONRequest(
		t,
		app,
		http.MethodGet,
		workspaceSettingsPath,
		nil,
		sessionCookie,
	)
	if workspaceSettingsAfterPermissions.Code != http.StatusOK {
		t.Fatalf("expected workspace settings status 200 after permissions patch, got %d body=%s", workspaceSettingsAfterPermissions.Code, workspaceSettingsAfterPermissions.Body.String())
	}
	var workspaceSettingsAfterPermissionsBody map[string]any
	mustDecodeJSON(t, workspaceSettingsAfterPermissions.Body.Bytes(), &workspaceSettingsAfterPermissionsBody)
	workspaceBody, ok := workspaceSettingsAfterPermissionsBody["workspace"].(map[string]any)
	if !ok {
		t.Fatalf("expected workspace settings response to include workspace map, got %#v", workspaceSettingsAfterPermissionsBody["workspace"])
	}
	if workspaceBody["name"] != "Delivery West" {
		t.Fatalf("expected permissions patch to preserve workspace name, got %#v", workspaceBody["name"])
	}
	if workspaceBody["default_currency"] != "EUR" {
		t.Fatalf("expected permissions patch to preserve default_currency, got %#v", workspaceBody["default_currency"])
	}
	if workspaceBody["only_admins_may_create_projects"] != true {
		t.Fatalf("expected workspace settings to reflect permissions patch, got %#v", workspaceBody["only_admins_may_create_projects"])
	}
	if workspaceBody["only_admins_may_create_tags"] != true {
		t.Fatalf("expected workspace settings to reflect permissions patch, got %#v", workspaceBody["only_admins_may_create_tags"])
	}
	if workspaceBody["only_admins_see_team_dashboard"] != true {
		t.Fatalf("expected workspace settings to reflect permissions patch, got %#v", workspaceBody["only_admins_see_team_dashboard"])
	}
	if workspaceBody["limit_public_project_data"] != true {
		t.Fatalf("expected workspace settings to reflect permissions patch, got %#v", workspaceBody["limit_public_project_data"])
	}

	organizationSettingsPath := "/api/v9/organizations/" + intToString(organizationID)
	organizationSettings := performAuthorizedJSONRequest(t, app, http.MethodGet, organizationSettingsPath, nil, tokenAuthorization)
	if organizationSettings.Code != http.StatusOK {
		t.Fatalf("expected organization settings status 200, got %d body=%s", organizationSettings.Code, organizationSettings.Body.String())
	}

	updatedOrganizationSettings := performAuthorizedJSONRequest(t, app, http.MethodPut, organizationSettingsPath, map[string]any{
		"name": "North Ridge Org",
	}, tokenAuthorization)
	if updatedOrganizationSettings.Code != http.StatusOK {
		t.Fatalf("expected organization settings patch status 200, got %d body=%s", updatedOrganizationSettings.Code, updatedOrganizationSettings.Body.String())
	}

	invalidWorkspacePath := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/workspaces/not-a-number/settings",
		nil,
		sessionCookie,
	)
	if invalidWorkspacePath.Code != http.StatusBadRequest {
		t.Fatalf("expected invalid workspace id status 400, got %d body=%s", invalidWorkspacePath.Code, invalidWorkspacePath.Body.String())
	}
	invalidOrganizationPath := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/organizations/not-a-number",
		nil,
		tokenAuthorization,
	)
	if invalidOrganizationPath.Code != http.StatusBadRequest {
		t.Fatalf("expected invalid organization id status 400, got %d body=%s", invalidOrganizationPath.Code, invalidOrganizationPath.Body.String())
	}

	logout := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/logout", nil, sessionCookie)
	if logout.Code != http.StatusNoContent {
		t.Fatalf("expected logout status 204, got %d body=%s", logout.Code, logout.Body.String())
	}

	loggedOutSession := performJSONRequest(t, app, http.MethodGet, "/web/v1/session", nil, sessionCookie)
	if loggedOutSession.Code != http.StatusUnauthorized {
		t.Fatalf("expected logged out session status 401, got %d body=%s", loggedOutSession.Code, loggedOutSession.Body.String())
	}

	login := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/login", map[string]any{
		"email":    renamedEmail,
		"password": "secret1",
	}, "")
	if login.Code != http.StatusOK {
		t.Fatalf("expected login status 200, got %d body=%s", login.Code, login.Body.String())
	}
}

func TestPublicTrackRegistersUnimplementedSpecRoutes(t *testing.T) {
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

	for _, route := range app.HTTP.Routes() {
		if route.Method == http.MethodGet && route.Path == "/api/v9/countries" {
			return
		}
	}

	t.Fatal("expected GET /api/v9/countries to be registered from public-track OpenAPI surface")
}

func TestWebServerPersistsRegisteredSessionAcrossAppRestart(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("persisted-session")
	cfg := Config{
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
	}

	firstApp, err := NewApp(cfg)
	if err != nil {
		t.Fatalf("first NewApp returned error: %v", err)
	}
	t.Cleanup(firstApp.Platform.Database.Close)

	register := performJSONRequest(t, firstApp, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    uniqueEmail,
		"fullname": "Persisted Person",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}

	sessionCookie := register.Header().Get("Set-Cookie")
	if sessionCookie == "" {
		t.Fatal("expected register response to set session cookie")
	}

	secondApp, err := NewApp(cfg)
	if err != nil {
		t.Fatalf("second NewApp returned error: %v", err)
	}
	t.Cleanup(secondApp.Platform.Database.Close)

	session := performJSONRequest(t, secondApp, http.MethodGet, "/web/v1/session", nil, sessionCookie)
	if session.Code != http.StatusOK {
		t.Fatalf("expected restarted app session status 200, got %d body=%s", session.Code, session.Body.String())
	}
}

func TestWebServerRejectsWritesForDeactivatedUsers(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("deactivated-user")

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

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    uniqueEmail,
		"fullname": "Test Person",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}

	sessionCookie := register.Header().Get("Set-Cookie")
	if sessionCookie == "" {
		t.Fatal("expected register response to set session cookie")
	}

	var registerBody struct {
		User struct {
			ID int64 `json:"id"`
		} `json:"user"`
		CurrentOrganizationID *int64 `json:"current_organization_id"`
		CurrentWorkspaceID    *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &registerBody)
	if registerBody.CurrentOrganizationID == nil || registerBody.CurrentWorkspaceID == nil {
		t.Fatalf("expected bootstrap ids, got %#v", registerBody)
	}

	service := identityapplication.NewService(identityapplication.Config{
		Users:              identitypostgres.NewUserRepository(app.Platform.Database.Pool()),
		Sessions:           identitypostgres.NewSessionRepository(app.Platform.Database.Pool()),
		PushServices:       identitypostgres.NewPushServiceRepository(app.Platform.Database.Pool()),
		JobRecorder:        identitypostgres.NewJobRecorder(app.Platform.Database.Pool()),
		RunningTimerLookup: trackingpostgres.NewRunningTimerLookup(app.Platform.Database.Pool()),
		IDs:                identitypostgres.NewSequence(app.Platform.Database.Pool()),
		KnownAlphaFeatures: []string{"calendar-redesign"},
	})
	if err := service.Deactivate(t.Context(), registerBody.User.ID); err != nil {
		t.Fatalf("expected deactivation to succeed: %v", err)
	}

	session := performJSONRequest(t, app, http.MethodGet, "/web/v1/session", nil, sessionCookie)
	if session.Code != http.StatusForbidden {
		t.Fatalf("expected deactivated session lookup status 403, got %d body=%s", session.Code, session.Body.String())
	}

	login := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/login", map[string]any{
		"email":    uniqueEmail,
		"password": "secret1",
	}, "")
	if login.Code != http.StatusForbidden {
		t.Fatalf("expected deactivated login status 403, got %d body=%s", login.Code, login.Body.String())
	}

	passwordAuthorization := basicAuthorization(uniqueEmail, "secret1")

	updatedProfile := performAuthorizedJSONRequest(t, app, http.MethodPut, "/api/v9/me", map[string]any{
		"email":                uniqueEmail,
		"fullname":             "Blocked Rename",
		"timezone":             "UTC",
		"beginning_of_week":    1,
		"country_id":           44,
		"default_workspace_id": *registerBody.CurrentWorkspaceID,
	}, passwordAuthorization)
	if updatedProfile.Code != http.StatusForbidden {
		t.Fatalf("expected deactivated profile patch status 403, got %d body=%s", updatedProfile.Code, updatedProfile.Body.String())
	}

	updatedPreferences := performAuthorizedJSONRequest(t, app, http.MethodPost, "/api/v9/me/preferences", map[string]any{
		"language_code": "zh-CN",
	}, passwordAuthorization)
	if updatedPreferences.Code != http.StatusForbidden {
		t.Fatalf("expected deactivated preferences patch status 403, got %d body=%s", updatedPreferences.Code, updatedPreferences.Body.String())
	}

	resetToken := performAuthorizedJSONRequest(t, app, http.MethodPost, "/api/v9/me/reset_token", nil, passwordAuthorization)
	if resetToken.Code != http.StatusForbidden {
		t.Fatalf("expected deactivated api token reset status 403, got %d body=%s", resetToken.Code, resetToken.Body.String())
	}

	organizationSettingsPath := "/api/v9/organizations/" + intToString(*registerBody.CurrentOrganizationID)
	updatedOrganizationSettings := performAuthorizedJSONRequest(t, app, http.MethodPut, organizationSettingsPath, map[string]any{
		"name": "Blocked",
	}, passwordAuthorization)
	if updatedOrganizationSettings.Code != http.StatusForbidden {
		t.Fatalf("expected deactivated organization settings patch status 403, got %d body=%s", updatedOrganizationSettings.Code, updatedOrganizationSettings.Body.String())
	}

	workspaceSettingsPath := "/web/v1/workspaces/" + intToString(*registerBody.CurrentWorkspaceID) + "/settings"
	updatedWorkspaceSettings := performJSONRequest(t, app, http.MethodPatch, workspaceSettingsPath, map[string]any{
		"workspace": map[string]any{
			"name":                            "Blocked",
			"default_currency":                "USD",
			"default_hourly_rate":             0,
			"rounding":                        0,
			"rounding_minutes":                0,
			"reports_collapse":                false,
			"only_admins_may_create_projects": false,
			"only_admins_may_create_tags":     false,
			"only_admins_see_team_dashboard":  false,
			"projects_billable_by_default":    false,
			"projects_private_by_default":     false,
			"projects_enforce_billable":       false,
			"limit_public_project_data":       false,
		},
	}, sessionCookie)
	if updatedWorkspaceSettings.Code != http.StatusForbidden {
		t.Fatalf("expected deactivated workspace settings patch status 403, got %d body=%s", updatedWorkspaceSettings.Code, updatedWorkspaceSettings.Body.String())
	}

	workspacePermissionsPath := "/web/v1/workspaces/" + intToString(*registerBody.CurrentWorkspaceID) + "/permissions"
	updatedWorkspacePermissions := performJSONRequest(t, app, http.MethodPatch, workspacePermissionsPath, map[string]any{
		"only_admins_may_create_projects": true,
		"only_admins_may_create_tags":     true,
		"only_admins_see_team_dashboard":  true,
		"limit_public_project_data":       true,
	}, sessionCookie)
	if updatedWorkspacePermissions.Code != http.StatusForbidden {
		t.Fatalf("expected deactivated workspace permissions patch status 403, got %d body=%s", updatedWorkspacePermissions.Code, updatedWorkspacePermissions.Body.String())
	}
}

func TestGeneratedWebRoutesRejectMissingRequiredFields(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("routes")

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

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    uniqueEmail,
		"fullname": "Routes Test",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}
	sessionCookie := register.Header().Get("Set-Cookie")

	for _, tc := range []struct {
		method string
		path   string
		body   any
		cookie string
	}{
		{method: http.MethodPost, path: "/web/v1/auth/login", body: map[string]any{"email": uniqueEmail}},
		{method: http.MethodPatch, path: "/web/v1/workspaces/1/settings", body: map[string]any{"workspace": map[string]any{"name": "Updated"}}, cookie: sessionCookie},
		{method: http.MethodPatch, path: "/web/v1/workspaces/1/permissions", body: map[string]any{"only_admins_may_create_projects": true}, cookie: sessionCookie},
		{method: http.MethodPost, path: "/web/v1/workspaces/1/members/invitations", body: map[string]any{"role": "member"}, cookie: sessionCookie},
		{method: http.MethodPatch, path: "/web/v1/workspaces/1/members/1/rate-cost", body: map[string]any{"hourly_rate": 10}, cookie: sessionCookie},
	} {
		response := performJSONRequest(t, app, tc.method, tc.path, tc.body, tc.cookie)
		if response.Code != http.StatusBadRequest {
			t.Fatalf("expected %s %s to return 400 for missing required fields, got %d body=%s", tc.method, tc.path, response.Code, response.Body.String())
		}
	}
}

func TestWebWorkspaceMemberRoutesPersistLifecycle(t *testing.T) {
	database := pgtest.Open(t)
	ownerEmail := uniqueTestEmail("owner-members")
	invitedEmail := uniqueTestEmail("invited-members")
	joinedEmail := uniqueTestEmail("joined-members")

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

	ownerRegister := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    ownerEmail,
		"fullname": "Owner Members",
		"password": "secret1",
	}, "")
	if ownerRegister.Code != http.StatusCreated {
		t.Fatalf("expected owner register status 201, got %d body=%s", ownerRegister.Code, ownerRegister.Body.String())
	}
	ownerCookie := ownerRegister.Header().Get("Set-Cookie")
	var ownerBody struct {
		User struct {
			ID       int64  `json:"id"`
			Email    string `json:"email"`
			FullName string `json:"fullname"`
		} `json:"user"`
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, ownerRegister.Body.Bytes(), &ownerBody)
	if ownerBody.CurrentWorkspaceID == nil {
		t.Fatalf("expected current workspace id, got %#v", ownerBody)
	}
	workspaceID := *ownerBody.CurrentWorkspaceID

	members := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/workspaces/"+intToString(workspaceID)+"/members",
		nil,
		ownerCookie,
	)
	if members.Code != http.StatusOK {
		t.Fatalf("expected members list status 200, got %d body=%s", members.Code, members.Body.String())
	}
	var membersBody struct {
		Members []map[string]any `json:"members"`
	}
	mustDecodeJSON(t, members.Body.Bytes(), &membersBody)
	if len(membersBody.Members) != 1 {
		t.Fatalf("expected one owner member, got %#v", membersBody.Members)
	}
	if membersBody.Members[0]["role"] != "admin" || membersBody.Members[0]["status"] != "joined" {
		t.Fatalf("expected joined admin membership, got %#v", membersBody.Members[0])
	}

	invite := performJSONRequest(
		t,
		app,
		http.MethodPost,
		"/web/v1/workspaces/"+intToString(workspaceID)+"/members/invitations",
		map[string]any{
			"email": invitedEmail,
			"role":  "admin",
		},
		ownerCookie,
	)
	if invite.Code != http.StatusCreated {
		t.Fatalf("expected invite status 201, got %d body=%s", invite.Code, invite.Body.String())
	}

	var invitedState string
	if err := database.Pool.QueryRow(
		context.Background(),
		"select state from membership_workspace_members where workspace_id = $1 and lower(email) = lower($2)",
		workspaceID,
		invitedEmail,
	).Scan(&invitedState); err != nil {
		t.Fatalf("expected invited member row: %v", err)
	}
	if invitedState != "invited" {
		t.Fatalf("expected invited state, got %q", invitedState)
	}

	joinedRegister := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    joinedEmail,
		"fullname": "Joined Member",
		"password": "secret1",
	}, "")
	if joinedRegister.Code != http.StatusCreated {
		t.Fatalf("expected joined register status 201, got %d body=%s", joinedRegister.Code, joinedRegister.Body.String())
	}
	var joinedBody struct {
		User struct {
			ID       int64  `json:"id"`
			Email    string `json:"email"`
			FullName string `json:"fullname"`
		} `json:"user"`
	}
	mustDecodeJSON(t, joinedRegister.Body.Bytes(), &joinedBody)

	var joinedMemberID int64
	if err := database.Pool.QueryRow(
		context.Background(),
		`insert into membership_workspace_members (workspace_id, user_id, email, full_name, role, state, created_by)
		 values ($1, $2, $3, $4, $5, $6, $7)
		 returning id`,
		workspaceID,
		joinedBody.User.ID,
		joinedBody.User.Email,
		joinedBody.User.FullName,
		"member",
		"joined",
		ownerBody.User.ID,
	).Scan(&joinedMemberID); err != nil {
		t.Fatalf("expected joined member row insert: %v", err)
	}

	updateRateCost := performJSONRequest(
		t,
		app,
		http.MethodPatch,
		"/web/v1/workspaces/"+intToString(workspaceID)+"/members/"+intToString(joinedMemberID)+"/rate-cost",
		map[string]any{
			"hourly_rate": 150.5,
			"labor_cost":  85.25,
		},
		ownerCookie,
	)
	if updateRateCost.Code != http.StatusOK {
		t.Fatalf("expected rate-cost status 200, got %d body=%s", updateRateCost.Code, updateRateCost.Body.String())
	}

	disable := performJSONRequest(
		t,
		app,
		http.MethodPost,
		"/web/v1/workspaces/"+intToString(workspaceID)+"/members/"+intToString(joinedMemberID)+"/disable",
		nil,
		ownerCookie,
	)
	if disable.Code != http.StatusOK {
		t.Fatalf("expected disable status 200, got %d body=%s", disable.Code, disable.Body.String())
	}

	restore := performJSONRequest(
		t,
		app,
		http.MethodPost,
		"/web/v1/workspaces/"+intToString(workspaceID)+"/members/"+intToString(joinedMemberID)+"/restore",
		nil,
		ownerCookie,
	)
	if restore.Code != http.StatusOK {
		t.Fatalf("expected restore status 200, got %d body=%s", restore.Code, restore.Body.String())
	}

	remove := performJSONRequest(
		t,
		app,
		http.MethodDelete,
		"/web/v1/workspaces/"+intToString(workspaceID)+"/members/"+intToString(joinedMemberID),
		nil,
		ownerCookie,
	)
	if remove.Code != http.StatusOK {
		t.Fatalf("expected remove status 200, got %d body=%s", remove.Code, remove.Body.String())
	}

	var persisted struct {
		State      string
		HourlyRate *float64
		LaborCost  *float64
	}
	if err := database.Pool.QueryRow(
		context.Background(),
		"select state, hourly_rate, labor_cost from membership_workspace_members where id = $1",
		joinedMemberID,
	).Scan(&persisted.State, &persisted.HourlyRate, &persisted.LaborCost); err != nil {
		t.Fatalf("expected joined member persisted row: %v", err)
	}
	if persisted.State != "removed" {
		t.Fatalf("expected removed state, got %#v", persisted)
	}
	if persisted.HourlyRate == nil || *persisted.HourlyRate != 150.5 {
		t.Fatalf("expected hourly rate 150.5, got %#v", persisted.HourlyRate)
	}
	if persisted.LaborCost == nil || *persisted.LaborCost != 85.25 {
		t.Fatalf("expected labor cost 85.25, got %#v", persisted.LaborCost)
	}
}

func TestPublicTrackRoutesServeRealCatalogAndAccountData(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("track-catalog")

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

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    uniqueEmail,
		"fullname": "Track User",
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
		CurrentWorkspaceID    *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &registerBody)
	if registerBody.CurrentWorkspaceID == nil || registerBody.CurrentOrganizationID == nil {
		t.Fatalf("expected bootstrap ids, got %#v", registerBody)
	}

	workspaceID := *registerBody.CurrentWorkspaceID
	organizationID := *registerBody.CurrentOrganizationID
	passwordAuthorization := basicAuthorization(uniqueEmail, "secret1")

	me := performAuthorizedJSONRequest(t, app, http.MethodGet, "/api/v9/me", nil, passwordAuthorization)
	if me.Code != http.StatusOK {
		t.Fatalf("expected /api/v9/me status 200, got %d body=%s", me.Code, me.Body.String())
	}

	resetToken := performAuthorizedJSONRequest(t, app, http.MethodPost, "/api/v9/me/reset_token", nil, passwordAuthorization)
	if resetToken.Code != http.StatusOK {
		t.Fatalf("expected /api/v9/me/reset_token status 200, got %d body=%s", resetToken.Code, resetToken.Body.String())
	}
	var rotatedToken string
	mustDecodeJSON(t, resetToken.Body.Bytes(), &rotatedToken)
	if rotatedToken == "" {
		t.Fatal("expected rotated API token string")
	}
	tokenAuthorization := basicAuthorization(rotatedToken, "api_token")

	preferences := performAuthorizedJSONRequest(t, app, http.MethodGet, "/api/v9/me/preferences", nil, tokenAuthorization)
	if preferences.Code != http.StatusOK {
		t.Fatalf("expected /api/v9/me/preferences status 200, got %d body=%s", preferences.Code, preferences.Body.String())
	}

	updateOrganization := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPut,
		"/api/v9/organizations/"+intToString(organizationID),
		map[string]any{"name": "Track Org"},
		tokenAuthorization,
	)
	if updateOrganization.Code != http.StatusOK {
		t.Fatalf("expected organization put status 200, got %d body=%s", updateOrganization.Code, updateOrganization.Body.String())
	}

	createClient := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients",
		map[string]any{"name": "North Ridge Client"},
		tokenAuthorization,
	)
	if createClient.Code != http.StatusOK {
		t.Fatalf("expected client create status 200, got %d body=%s", createClient.Code, createClient.Body.String())
	}
	var clientBody map[string]any
	mustDecodeJSON(t, createClient.Body.Bytes(), &clientBody)
	clientID := int64(clientBody["id"].(float64))

	listClients := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients",
		nil,
		tokenAuthorization,
	)
	if listClients.Code != http.StatusOK {
		t.Fatalf("expected clients list status 200, got %d body=%s", listClients.Code, listClients.Body.String())
	}
	var clientsBody []map[string]any
	mustDecodeJSON(t, listClients.Body.Bytes(), &clientsBody)
	if len(clientsBody) != 1 || clientsBody[0]["name"] != "North Ridge Client" {
		t.Fatalf("expected persisted client, got %#v", clientsBody)
	}

	createTag := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/tags",
		map[string]any{"name": "billable"},
		tokenAuthorization,
	)
	if createTag.Code != http.StatusOK {
		t.Fatalf("expected tag create status 200, got %d body=%s", createTag.Code, createTag.Body.String())
	}
	var tagBody map[string]any
	mustDecodeJSON(t, createTag.Body.Bytes(), &tagBody)
	tagID := int64(tagBody["id"].(float64))

	createGroup := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/groups",
		map[string]any{"name": "Design"},
		tokenAuthorization,
	)
	if createGroup.Code != http.StatusOK {
		t.Fatalf("expected group create status 200, got %d body=%s", createGroup.Code, createGroup.Body.String())
	}
	var groupBody map[string]any
	mustDecodeJSON(t, createGroup.Body.Bytes(), &groupBody)
	groupID := int64(groupBody["id"].(float64))

	createProject := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects",
		map[string]any{"name": "Website Revamp", "client_id": clientID},
		tokenAuthorization,
	)
	if createProject.Code != http.StatusOK {
		t.Fatalf("expected project create status 200, got %d body=%s", createProject.Code, createProject.Body.String())
	}
	var projectBody map[string]any
	mustDecodeJSON(t, createProject.Body.Bytes(), &projectBody)
	projectID := int64(projectBody["id"].(float64))

	getClient := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients/"+intToString(clientID),
		nil,
		tokenAuthorization,
	)
	if getClient.Code != http.StatusOK {
		t.Fatalf("expected client detail status 200, got %d body=%s", getClient.Code, getClient.Body.String())
	}

	updateClient := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPut,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients/"+intToString(clientID),
		map[string]any{"name": "North Ridge Enterprise"},
		tokenAuthorization,
	)
	if updateClient.Code != http.StatusOK {
		t.Fatalf("expected client update status 200, got %d body=%s", updateClient.Code, updateClient.Body.String())
	}

	if _, err := database.Pool.Exec(
		context.Background(),
		"insert into catalog_project_users (project_id, user_id, role) values ($1, $2, $3)",
		projectID,
		registerBody.User.ID,
		"admin",
	); err != nil {
		t.Fatalf("seed project user: %v", err)
	}
	if _, err := database.Pool.Exec(
		context.Background(),
		"insert into catalog_tasks (workspace_id, project_id, name, active, created_by) values ($1, $2, $3, $4, $5)",
		workspaceID,
		projectID,
		"Prep launch brief",
		true,
		registerBody.User.ID,
	); err != nil {
		t.Fatalf("seed task: %v", err)
	}

	listProjects := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects?name=&page=1&sort_field=name&sort_order=ASC&only_templates=false&sort_pinned=true&search=",
		nil,
		tokenAuthorization,
	)
	if listProjects.Code != http.StatusOK {
		t.Fatalf("expected projects list status 200, got %d body=%s", listProjects.Code, listProjects.Body.String())
	}

	getProject := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects/"+intToString(projectID),
		nil,
		tokenAuthorization,
	)
	if getProject.Code != http.StatusOK {
		t.Fatalf("expected project detail status 200, got %d body=%s", getProject.Code, getProject.Body.String())
	}
	var getProjectBody map[string]any
	mustDecodeJSON(t, getProject.Body.Bytes(), &getProjectBody)
	if getProjectBody["client_name"] != "North Ridge Enterprise" {
		t.Fatalf("expected project detail to reflect updated client name, got %#v", getProjectBody)
	}

	pinProject := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects/"+intToString(projectID)+"/pin",
		map[string]any{"pin": true},
		tokenAuthorization,
	)
	if pinProject.Code != http.StatusOK {
		t.Fatalf("expected project pin status 200, got %d body=%s", pinProject.Code, pinProject.Body.String())
	}

	createProjectTask := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects/"+intToString(projectID)+"/tasks",
		map[string]any{"name": "Ship checklist"},
		tokenAuthorization,
	)
	if createProjectTask.Code != http.StatusOK {
		t.Fatalf("expected project task create status 200, got %d body=%s", createProjectTask.Code, createProjectTask.Body.String())
	}
	var projectTaskBody map[string]any
	mustDecodeJSON(t, createProjectTask.Body.Bytes(), &projectTaskBody)
	if projectTaskBody["project_id"] != float64(projectID) {
		t.Fatalf("expected created project task to carry project_id %d, got %#v", projectID, projectTaskBody["project_id"])
	}
	projectTaskID := int64(projectTaskBody["id"].(float64))

	getProjectTask := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects/"+intToString(projectID)+"/tasks/"+intToString(projectTaskID),
		nil,
		tokenAuthorization,
	)
	if getProjectTask.Code != http.StatusOK {
		t.Fatalf("expected project task detail status 200, got %d body=%s", getProjectTask.Code, getProjectTask.Body.String())
	}

	updateProjectTask := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPut,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects/"+intToString(projectID)+"/tasks/"+intToString(projectTaskID),
		map[string]any{"name": "Ship runbook", "active": false},
		tokenAuthorization,
	)
	if updateProjectTask.Code != http.StatusOK {
		t.Fatalf("expected project task update status 200, got %d body=%s", updateProjectTask.Code, updateProjectTask.Body.String())
	}

	archiveProject := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPut,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects/"+intToString(projectID),
		map[string]any{"active": false},
		tokenAuthorization,
	)
	if archiveProject.Code != http.StatusOK {
		t.Fatalf("expected project archive status 200, got %d body=%s", archiveProject.Code, archiveProject.Body.String())
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

	projectTasks := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects/"+intToString(projectID)+"/tasks?active=false",
		nil,
		tokenAuthorization,
	)
	if projectTasks.Code != http.StatusOK {
		t.Fatalf("expected project tasks status 200, got %d body=%s", projectTasks.Code, projectTasks.Body.String())
	}
	var projectTasksBody []map[string]any
	mustDecodeJSON(t, projectTasks.Body.Bytes(), &projectTasksBody)
	if len(projectTasksBody) != 2 {
		t.Fatalf("expected project tasks to include both active and inactive tasks, got %#v", projectTasksBody)
	}

	tasks := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/tasks?page=1&per_page=50&sort_field=name&sort_order=ASC&search=&pid="+intToString(projectID),
		nil,
		tokenAuthorization,
	)
	if tasks.Code != http.StatusOK {
		t.Fatalf("expected tasks status 200, got %d body=%s", tasks.Code, tasks.Body.String())
	}

	tasksBasic := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/tasks/basic?page=1&per_page=200&sort_field=name&sort_order=ASC&search=&project_id="+intToString(projectID),
		nil,
		tokenAuthorization,
	)
	if tasksBasic.Code != http.StatusOK {
		t.Fatalf("expected tasks basic status 200, got %d body=%s", tasksBasic.Code, tasksBasic.Body.String())
	}

	updateGroup := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPut,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/groups/"+intToString(groupID),
		map[string]any{"name": "Design Ops"},
		tokenAuthorization,
	)
	if updateGroup.Code != http.StatusOK {
		t.Fatalf("expected group update status 200, got %d body=%s", updateGroup.Code, updateGroup.Body.String())
	}

	deleteGroup := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodDelete,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/groups/"+intToString(groupID),
		nil,
		tokenAuthorization,
	)
	if deleteGroup.Code != http.StatusOK {
		t.Fatalf("expected group delete status 200, got %d body=%s", deleteGroup.Code, deleteGroup.Body.String())
	}

	createRemovableClient := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients",
		map[string]any{"name": "Delete Me"},
		tokenAuthorization,
	)
	if createRemovableClient.Code != http.StatusOK {
		t.Fatalf("expected removable client create status 200, got %d body=%s", createRemovableClient.Code, createRemovableClient.Body.String())
	}
	var removableClientBody map[string]any
	mustDecodeJSON(t, createRemovableClient.Body.Bytes(), &removableClientBody)
	removableClientID := int64(removableClientBody["id"].(float64))

	clientsData := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients/data",
		[]int64{clientID, removableClientID},
		tokenAuthorization,
	)
	if clientsData.Code != http.StatusOK {
		t.Fatalf("expected clients data status 200, got %d body=%s", clientsData.Code, clientsData.Body.String())
	}
	var clientsDataBody []map[string]any
	mustDecodeJSON(t, clientsData.Body.Bytes(), &clientsDataBody)
	if len(clientsDataBody) != 2 {
		t.Fatalf("expected two clients from clients/data, got %#v", clientsDataBody)
	}

	archiveClient := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients/"+intToString(clientID)+"/archive",
		nil,
		tokenAuthorization,
	)
	if archiveClient.Code != http.StatusOK {
		t.Fatalf("expected client archive status 200, got %d body=%s", archiveClient.Code, archiveClient.Body.String())
	}
	var archiveClientBody []int64
	mustDecodeJSON(t, archiveClient.Body.Bytes(), &archiveClientBody)
	if len(archiveClientBody) != 1 || archiveClientBody[0] != projectID {
		t.Fatalf("expected archived client to return project id %d, got %#v", projectID, archiveClientBody)
	}

	restoreClient := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients/"+intToString(clientID)+"/restore",
		map[string]any{"restore_all_projects": true},
		tokenAuthorization,
	)
	if restoreClient.Code != http.StatusOK {
		t.Fatalf("expected client restore status 200, got %d body=%s", restoreClient.Code, restoreClient.Body.String())
	}
	var restoredClientBody map[string]any
	mustDecodeJSON(t, restoreClient.Body.Bytes(), &restoredClientBody)
	if restoredClientBody["archived"] != false {
		t.Fatalf("expected restored client archived=false, got %#v", restoredClientBody)
	}

	archiveClients := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients/archive",
		[]int64{clientID},
		tokenAuthorization,
	)
	if archiveClients.Code != http.StatusOK {
		t.Fatalf("expected bulk client archive status 200, got %d body=%s", archiveClients.Code, archiveClients.Body.String())
	}
	var archiveClientsBody []map[string]any
	mustDecodeJSON(t, archiveClients.Body.Bytes(), &archiveClientsBody)
	if len(archiveClientsBody) != 1 {
		t.Fatalf("expected one archive response item, got %#v", archiveClientsBody)
	}

	restoreClientProjects := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients/"+intToString(clientID)+"/restore",
		map[string]any{"projects": []int64{projectID}},
		tokenAuthorization,
	)
	if restoreClientProjects.Code != http.StatusOK {
		t.Fatalf("expected client restore by project list status 200, got %d body=%s", restoreClientProjects.Code, restoreClientProjects.Body.String())
	}

	deleteClient := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodDelete,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients/"+intToString(removableClientID),
		nil,
		tokenAuthorization,
	)
	if deleteClient.Code != http.StatusOK {
		t.Fatalf("expected client delete status 200, got %d body=%s", deleteClient.Code, deleteClient.Body.String())
	}

	createBulkDeleteClient := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients",
		map[string]any{"name": "Bulk Delete"},
		tokenAuthorization,
	)
	if createBulkDeleteClient.Code != http.StatusOK {
		t.Fatalf("expected bulk delete client create status 200, got %d body=%s", createBulkDeleteClient.Code, createBulkDeleteClient.Body.String())
	}
	var bulkDeleteClientBody map[string]any
	mustDecodeJSON(t, createBulkDeleteClient.Body.Bytes(), &bulkDeleteClientBody)
	bulkDeleteClientID := int64(bulkDeleteClientBody["id"].(float64))

	deleteClients := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients/delete",
		[]int64{bulkDeleteClientID},
		tokenAuthorization,
	)
	if deleteClients.Code != http.StatusOK {
		t.Fatalf("expected bulk client delete status 200, got %d body=%s", deleteClients.Code, deleteClients.Body.String())
	}

	projectTaskCount := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects/task_count",
		map[string]any{"project_ids": []int64{projectID}},
		tokenAuthorization,
	)
	if projectTaskCount.Code != http.StatusOK {
		t.Fatalf("expected project task count status 200, got %d body=%s", projectTaskCount.Code, projectTaskCount.Body.String())
	}
	var projectTaskCountBody []map[string]int
	mustDecodeJSON(t, projectTaskCount.Body.Bytes(), &projectTaskCountBody)
	if len(projectTaskCountBody) != 1 || projectTaskCountBody[0][intToString(projectID)] != 2 {
		t.Fatalf("expected task count 2 for project %d, got %#v", projectID, projectTaskCountBody)
	}

	projectUserCount := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects/user_count",
		map[string]any{"project_ids": []int64{projectID}},
		tokenAuthorization,
	)
	if projectUserCount.Code != http.StatusOK {
		t.Fatalf("expected project user count status 200, got %d body=%s", projectUserCount.Code, projectUserCount.Body.String())
	}
	var projectUserCountBody []map[string]int
	mustDecodeJSON(t, projectUserCount.Body.Bytes(), &projectUserCountBody)
	if len(projectUserCountBody) != 1 || projectUserCountBody[0][intToString(projectID)] != 1 {
		t.Fatalf("expected user count 1 for project %d, got %#v", projectID, projectUserCountBody)
	}

	updateTag := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPut,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/tags/"+intToString(tagID),
		map[string]any{"name": "internal"},
		tokenAuthorization,
	)
	if updateTag.Code != http.StatusOK {
		t.Fatalf("expected tag update status 200, got %d body=%s", updateTag.Code, updateTag.Body.String())
	}

	deleteProjectTask := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodDelete,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects/"+intToString(projectID)+"/tasks/"+intToString(projectTaskID),
		nil,
		tokenAuthorization,
	)
	if deleteProjectTask.Code != http.StatusOK {
		t.Fatalf("expected project task delete status 200, got %d body=%s", deleteProjectTask.Code, deleteProjectTask.Body.String())
	}

	deleteProject := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodDelete,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects/"+intToString(projectID),
		nil,
		tokenAuthorization,
	)
	if deleteProject.Code != http.StatusOK {
		t.Fatalf("expected project delete status 200, got %d body=%s", deleteProject.Code, deleteProject.Body.String())
	}

	var remainingProjectCount int
	if err := database.Pool.QueryRow(
		context.Background(),
		"select count(*) from catalog_projects where id = $1",
		projectID,
	).Scan(&remainingProjectCount); err != nil {
		t.Fatalf("count deleted project: %v", err)
	}
	if remainingProjectCount != 0 {
		t.Fatalf("expected deleted project row to be removed, got %d", remainingProjectCount)
	}

	var seededTaskProjectID *int64
	if err := database.Pool.QueryRow(
		context.Background(),
		"select project_id from catalog_tasks where name = $1",
		"Prep launch brief",
	).Scan(&seededTaskProjectID); err != nil {
		t.Fatalf("load seeded task project id: %v", err)
	}
	if seededTaskProjectID != nil {
		t.Fatalf("expected remaining seeded task to be unassigned from deleted project, got %v", *seededTaskProjectID)
	}

	deleteTag := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodDelete,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/tags/"+intToString(tagID),
		nil,
		tokenAuthorization,
	)
	if deleteTag.Code != http.StatusOK {
		t.Fatalf("expected tag delete status 200, got %d body=%s", deleteTag.Code, deleteTag.Body.String())
	}

	var remainingTaskCount int
	if err := database.Pool.QueryRow(
		context.Background(),
		"select count(*) from catalog_tasks where id = $1",
		projectTaskID,
	).Scan(&remainingTaskCount); err != nil {
		t.Fatalf("count deleted task: %v", err)
	}
	if remainingTaskCount != 0 {
		t.Fatalf("expected deleted task row to be removed, got %d", remainingTaskCount)
	}

	var remainingTagCount int
	if err := database.Pool.QueryRow(
		context.Background(),
		"select count(*) from catalog_tags where id = $1",
		tagID,
	).Scan(&remainingTagCount); err != nil {
		t.Fatalf("count deleted tag: %v", err)
	}
	if remainingTagCount != 0 {
		t.Fatalf("expected deleted tag row to be removed, got %d", remainingTagCount)
	}
}

func TestPublicTrackRoutesAcceptSessionCookieAuth(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("session-track")

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

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    uniqueEmail,
		"fullname": "Session Track User",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}

	sessionCookie := register.Header().Get("Set-Cookie")
	if sessionCookie == "" {
		t.Fatal("expected register response to set session cookie")
	}

	var registerBody struct {
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &registerBody)
	if registerBody.CurrentWorkspaceID == nil {
		t.Fatalf("expected bootstrap workspace id, got %#v", registerBody)
	}

	me := performJSONRequestWithMetadata(t, app, http.MethodGet, "/api/v9/me", nil, sessionCookie, "")
	if me.Code != http.StatusOK {
		t.Fatalf("expected session-auth /api/v9/me status 200, got %d body=%s", me.Code, me.Body.String())
	}

	var meBody map[string]any
	mustDecodeJSON(t, me.Body.Bytes(), &meBody)
	if meBody["email"] != uniqueEmail {
		t.Fatalf("expected session-auth /api/v9/me email, got %#v", meBody["email"])
	}

	createTag := performJSONRequestWithMetadata(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(*registerBody.CurrentWorkspaceID)+"/tags",
		map[string]any{"name": "session-created"},
		sessionCookie,
		"",
	)
	if createTag.Code != http.StatusOK {
		t.Fatalf("expected session-auth tag create status 200, got %d body=%s", createTag.Code, createTag.Body.String())
	}

	var tagBody map[string]any
	mustDecodeJSON(t, createTag.Body.Bytes(), &tagBody)
	if tagBody["name"] != "session-created" {
		t.Fatalf("expected created tag from session auth, got %#v", tagBody)
	}
}

func TestPublicTrackMeTimeEntriesRemainUserScopedAcrossWorkspaces(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("track-scoped")

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

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    uniqueEmail,
		"fullname": "Track User Scoped User",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}

	sessionCookie := register.Header().Get("Set-Cookie")
	if sessionCookie == "" {
		t.Fatal("expected register response to set session cookie")
	}

	var bootstrapResponse struct {
		CurrentOrganizationID *int64 `json:"current_organization_id"`
		CurrentWorkspaceID    *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &bootstrapResponse)
	if bootstrapResponse.CurrentOrganizationID == nil || bootstrapResponse.CurrentWorkspaceID == nil {
		t.Fatalf("expected bootstrap ids, got %#v", bootstrapResponse)
	}

	createWorkspace := performJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/organizations/"+intToString(*bootstrapResponse.CurrentOrganizationID)+"/workspaces",
		map[string]any{"name": "Second Workspace"},
		sessionCookie,
	)
	if createWorkspace.Code != http.StatusOK {
		t.Fatalf("expected create workspace status 200, got %d body=%s", createWorkspace.Code, createWorkspace.Body.String())
	}

	var createWorkspaceBody struct {
		ID int64 `json:"id"`
	}
	mustDecodeJSON(t, createWorkspace.Body.Bytes(), &createWorkspaceBody)
	secondWorkspaceID := createWorkspaceBody.ID
	if secondWorkspaceID == 0 {
		t.Fatalf("expected second workspace id, got %#v", createWorkspaceBody)
	}

	createTimeEntryRequest := httptest.NewRequest(
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(secondWorkspaceID)+"/time_entries",
		bytes.NewReader(mustJSONBytes(t, map[string]any{
			"created_with": "session-user-scope-test",
			"description":  "User scoped entry",
			"duration":     1800,
			"start":        "2026-03-23T09:00:00Z",
			"stop":         "2026-03-23T09:30:00Z",
			"workspace_id": secondWorkspaceID,
		})),
	)
	createTimeEntryRequest.Header.Set("Content-Type", "application/json")
	createTimeEntryRequest.Header.Set("Cookie", sessionCookie)
	createTimeEntryRecorder := httptest.NewRecorder()
	app.HTTP.ServeHTTP(createTimeEntryRecorder, createTimeEntryRequest)
	if createTimeEntryRecorder.Code != http.StatusOK {
		t.Fatalf("expected create time entry status 200, got %d body=%s", createTimeEntryRecorder.Code, createTimeEntryRecorder.Body.String())
	}
	var createdEntry map[string]any
	mustDecodeJSON(t, createTimeEntryRecorder.Body.Bytes(), &createdEntry)
	timeEntryID := int64(createdEntry["id"].(float64))

	createRunningEntryRequest := httptest.NewRequest(
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(secondWorkspaceID)+"/time_entries",
		bytes.NewReader(mustJSONBytes(t, map[string]any{
			"created_with": "session-user-scope-test",
			"description":  "Running user scoped entry",
			"duration":     -1,
			"start":        "2026-03-23T10:00:00Z",
			"workspace_id": secondWorkspaceID,
		})),
	)
	createRunningEntryRequest.Header.Set("Content-Type", "application/json")
	createRunningEntryRequest.Header.Set("Cookie", sessionCookie)
	createRunningEntryRecorder := httptest.NewRecorder()
	app.HTTP.ServeHTTP(createRunningEntryRecorder, createRunningEntryRequest)
	if createRunningEntryRecorder.Code != http.StatusOK {
		t.Fatalf("expected running time entry status 200, got %d body=%s", createRunningEntryRecorder.Code, createRunningEntryRecorder.Body.String())
	}
	var runningEntry map[string]any
	mustDecodeJSON(t, createRunningEntryRecorder.Body.Bytes(), &runningEntry)
	runningTimeEntryID := int64(runningEntry["id"].(float64))

	// Switch the user's home to secondWorkspaceID so GET /me/time_entries
	// resolves to the workspace where entries were created.
	switchHome := performJSONRequest(t, app, http.MethodPatch, "/web/v1/session", map[string]any{
		"workspace_id": secondWorkspaceID,
	}, sessionCookie)
	if switchHome.Code != http.StatusOK {
		t.Fatalf("expected switch home status 200, got %d body=%s", switchHome.Code, switchHome.Body.String())
	}

	listRequest := httptest.NewRequest(http.MethodGet, "/api/v9/me/time_entries?start_date=2026-03-23&end_date=2026-03-23", nil)
	listRequest.Header.Set("Cookie", sessionCookie)
	listRecorder := httptest.NewRecorder()
	app.HTTP.ServeHTTP(listRecorder, listRequest)
	if listRecorder.Code != http.StatusOK {
		t.Fatalf("expected list time entries status 200, got %d body=%s", listRecorder.Code, listRecorder.Body.String())
	}

	var entries []map[string]any
	mustDecodeJSON(t, listRecorder.Body.Bytes(), &entries)
	if len(entries) != 2 {
		t.Fatalf("expected two workspace-scoped time entries, got %d", len(entries))
	}
	for _, entry := range entries {
		if gotWorkspaceID := int64(entry["workspace_id"].(float64)); gotWorkspaceID != secondWorkspaceID {
			t.Fatalf("expected workspace %d, got %#v", secondWorkspaceID, entry)
		}
	}

	getByIDRequest := httptest.NewRequest(
		http.MethodGet,
		"/api/v9/me/time_entries/"+intToString(timeEntryID),
		nil,
	)
	getByIDRequest.Header.Set("Cookie", sessionCookie)
	getByIDRecorder := httptest.NewRecorder()
	app.HTTP.ServeHTTP(getByIDRecorder, getByIDRequest)
	if getByIDRecorder.Code != http.StatusOK {
		t.Fatalf("expected get time entry by id status 200, got %d body=%s", getByIDRecorder.Code, getByIDRecorder.Body.String())
	}

	var entryByID map[string]any
	mustDecodeJSON(t, getByIDRecorder.Body.Bytes(), &entryByID)
	if gotID := int64(entryByID["id"].(float64)); gotID != timeEntryID {
		t.Fatalf("expected time entry id %d, got %#v", timeEntryID, entryByID)
	}
	if gotWorkspaceID := int64(entryByID["workspace_id"].(float64)); gotWorkspaceID != secondWorkspaceID {
		t.Fatalf("expected time entry workspace %d, got %#v", secondWorkspaceID, entryByID)
	}

	currentRequest := httptest.NewRequest(http.MethodGet, "/api/v9/me/time_entries/current", nil)
	currentRequest.Header.Set("Cookie", sessionCookie)
	currentRecorder := httptest.NewRecorder()
	app.HTTP.ServeHTTP(currentRecorder, currentRequest)
	if currentRecorder.Code != http.StatusOK {
		t.Fatalf("expected current time entry status 200, got %d body=%s", currentRecorder.Code, currentRecorder.Body.String())
	}

	var currentEntry map[string]any
	mustDecodeJSON(t, currentRecorder.Body.Bytes(), &currentEntry)
	if gotID := int64(currentEntry["id"].(float64)); gotID != runningTimeEntryID {
		t.Fatalf("expected running time entry id %d, got %#v", runningTimeEntryID, currentEntry)
	}
	if gotWorkspaceID := int64(currentEntry["workspace_id"].(float64)); gotWorkspaceID != secondWorkspaceID {
		t.Fatalf("expected running time entry workspace %d, got %#v", secondWorkspaceID, currentEntry)
	}
}

func TestPublicTrackRoutesRejectCrossWorkspaceAccess(t *testing.T) {
	database := pgtest.Open(t)
	firstEmail := uniqueTestEmail("cross-owner")
	secondEmail := uniqueTestEmail("cross-other")

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

	firstRegister := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    firstEmail,
		"fullname": "Owner User",
		"password": "secret1",
	}, "")
	if firstRegister.Code != http.StatusCreated {
		t.Fatalf("expected first register status 201, got %d body=%s", firstRegister.Code, firstRegister.Body.String())
	}

	secondRegister := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    secondEmail,
		"fullname": "Other User",
		"password": "secret1",
	}, "")
	if secondRegister.Code != http.StatusCreated {
		t.Fatalf("expected second register status 201, got %d body=%s", secondRegister.Code, secondRegister.Body.String())
	}

	var firstRegisterBody struct {
		CurrentOrganizationID *int64 `json:"current_organization_id"`
		CurrentWorkspaceID    *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, firstRegister.Body.Bytes(), &firstRegisterBody)
	if firstRegisterBody.CurrentOrganizationID == nil || firstRegisterBody.CurrentWorkspaceID == nil {
		t.Fatalf("expected first bootstrap ids, got %#v", firstRegisterBody)
	}

	otherAuthorization := basicAuthorization(secondEmail, "secret1")

	crossWorkspace := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(*firstRegisterBody.CurrentWorkspaceID)+"/clients",
		nil,
		otherAuthorization,
	)
	if crossWorkspace.Code != http.StatusForbidden {
		t.Fatalf("expected cross workspace status 403, got %d body=%s", crossWorkspace.Code, crossWorkspace.Body.String())
	}

	crossOrganization := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPut,
		"/api/v9/organizations/"+intToString(*firstRegisterBody.CurrentOrganizationID),
		map[string]any{"name": "Hijack Org"},
		otherAuthorization,
	)
	if crossOrganization.Code != http.StatusForbidden {
		t.Fatalf("expected cross organization status 403, got %d body=%s", crossOrganization.Code, crossOrganization.Body.String())
	}
}

func TestWebRoutesRejectCrossWorkspaceAccess(t *testing.T) {
	database := pgtest.Open(t)
	firstEmail := uniqueTestEmail("web-owner")
	secondEmail := uniqueTestEmail("web-other")

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

	firstRegister := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    firstEmail,
		"fullname": "Owner Web",
		"password": "secret1",
	}, "")
	if firstRegister.Code != http.StatusCreated {
		t.Fatalf("expected first register status 201, got %d body=%s", firstRegister.Code, firstRegister.Body.String())
	}
	firstCookie := firstRegister.Header().Get("Set-Cookie")

	secondRegister := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    secondEmail,
		"fullname": "Other Web",
		"password": "secret1",
	}, "")
	if secondRegister.Code != http.StatusCreated {
		t.Fatalf("expected second register status 201, got %d body=%s", secondRegister.Code, secondRegister.Body.String())
	}
	secondCookie := secondRegister.Header().Get("Set-Cookie")

	var firstRegisterBody struct {
		CurrentOrganizationID *int64 `json:"current_organization_id"`
		CurrentWorkspaceID    *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, firstRegister.Body.Bytes(), &firstRegisterBody)
	if firstRegisterBody.CurrentOrganizationID == nil || firstRegisterBody.CurrentWorkspaceID == nil {
		t.Fatalf("expected first bootstrap ids, got %#v", firstRegisterBody)
	}

	if firstCookie == "" || secondCookie == "" {
		t.Fatal("expected both register responses to set session cookies")
	}

	for _, tc := range []struct {
		method string
		path   string
		body   any
	}{
		{
			method: http.MethodGet,
			path:   "/web/v1/workspaces/" + intToString(*firstRegisterBody.CurrentWorkspaceID) + "/settings",
		},
		{
			method: http.MethodPatch,
			path:   "/web/v1/workspaces/" + intToString(*firstRegisterBody.CurrentWorkspaceID) + "/settings",
			body: map[string]any{
				"workspace": map[string]any{
					"name":                            "Hijack Workspace",
					"default_currency":                "USD",
					"default_hourly_rate":             0,
					"rounding":                        0,
					"rounding_minutes":                0,
					"reports_collapse":                false,
					"only_admins_may_create_projects": false,
					"only_admins_may_create_tags":     false,
					"only_admins_see_team_dashboard":  false,
					"projects_billable_by_default":    false,
					"projects_private_by_default":     false,
					"projects_enforce_billable":       false,
					"limit_public_project_data":       false,
				},
			},
		},
		{
			method: http.MethodGet,
			path:   "/web/v1/workspaces/" + intToString(*firstRegisterBody.CurrentWorkspaceID) + "/permissions",
		},
		{
			method: http.MethodPatch,
			path:   "/web/v1/workspaces/" + intToString(*firstRegisterBody.CurrentWorkspaceID) + "/permissions",
			body: map[string]any{
				"only_admins_may_create_projects": true,
				"only_admins_may_create_tags":     true,
				"only_admins_see_team_dashboard":  true,
				"limit_public_project_data":       true,
			},
		},
		{
			method: http.MethodGet,
			path:   "/web/v1/workspaces/" + intToString(*firstRegisterBody.CurrentWorkspaceID) + "/capabilities",
		},
		{
			method: http.MethodGet,
			path:   "/web/v1/workspaces/" + intToString(*firstRegisterBody.CurrentWorkspaceID) + "/quota",
		},
		{
			method: http.MethodGet,
			path:   "/web/v1/workspaces/" + intToString(*firstRegisterBody.CurrentWorkspaceID) + "/members",
		},
		{
			method: http.MethodPost,
			path:   "/web/v1/workspaces/" + intToString(*firstRegisterBody.CurrentWorkspaceID) + "/members/invitations",
			body: map[string]any{
				"email": "cross-workspace@example.com",
			},
		},
	} {
		response := performJSONRequest(t, app, tc.method, tc.path, tc.body, secondCookie)
		if response.Code != http.StatusForbidden {
			t.Fatalf("expected %s %s to return 403, got %d body=%s", tc.method, tc.path, response.Code, response.Body.String())
		}
	}

	var firstOwnerMemberID int64
	if err := database.Pool.QueryRow(
		context.Background(),
		"select id from membership_workspace_members where workspace_id = $1 and role = 'admin'",
		*firstRegisterBody.CurrentWorkspaceID,
	).Scan(&firstOwnerMemberID); err != nil {
		t.Fatalf("expected first owner membership row: %v", err)
	}

	for _, tc := range []struct {
		method string
		path   string
		body   any
	}{
		{
			method: http.MethodPost,
			path:   "/web/v1/workspaces/" + intToString(*firstRegisterBody.CurrentWorkspaceID) + "/members/" + intToString(firstOwnerMemberID) + "/disable",
		},
		{
			method: http.MethodPost,
			path:   "/web/v1/workspaces/" + intToString(*firstRegisterBody.CurrentWorkspaceID) + "/members/" + intToString(firstOwnerMemberID) + "/restore",
		},
		{
			method: http.MethodDelete,
			path:   "/web/v1/workspaces/" + intToString(*firstRegisterBody.CurrentWorkspaceID) + "/members/" + intToString(firstOwnerMemberID),
		},
		{
			method: http.MethodPatch,
			path:   "/web/v1/workspaces/" + intToString(*firstRegisterBody.CurrentWorkspaceID) + "/members/" + intToString(firstOwnerMemberID) + "/rate-cost",
			body: map[string]any{
				"hourly_rate": 100,
				"labor_cost":  80,
			},
		},
	} {
		response := performJSONRequest(t, app, tc.method, tc.path, tc.body, secondCookie)
		if response.Code != http.StatusForbidden {
			t.Fatalf("expected %s %s to return 403, got %d body=%s", tc.method, tc.path, response.Code, response.Body.String())
		}
	}
}

func TestSessionBootstrapAndMeEndpointsIncludeAllOrganizationsAfterCreatingAnotherOrganization(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("multi-org")

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

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    uniqueEmail,
		"fullname": "Multi Org User",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}
	sessionCookie := register.Header().Get("Set-Cookie")
	if sessionCookie == "" {
		t.Fatal("expected register to set session cookie")
	}

	createOrganization := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/organizations",
		map[string]any{
			"name":           "Second Org",
			"workspace_name": "Second Workspace",
		},
		basicAuthorization(uniqueEmail, "secret1"),
	)
	if createOrganization.Code != http.StatusOK {
		t.Fatalf(
			"expected create organization status 200, got %d body=%s",
			createOrganization.Code,
			createOrganization.Body.String(),
		)
	}

	session := performJSONRequest(t, app, http.MethodGet, "/web/v1/session", nil, sessionCookie)
	if session.Code != http.StatusOK {
		t.Fatalf("expected session status 200, got %d body=%s", session.Code, session.Body.String())
	}

	var bootstrapResponse struct {
		CurrentOrganizationID *int64 `json:"current_organization_id"`
		CurrentWorkspaceID    *int64 `json:"current_workspace_id"`
		Organizations         []struct {
			ID   int64  `json:"id"`
			Name string `json:"name"`
		} `json:"organizations"`
		Workspaces []struct {
			ID             int64  `json:"id"`
			Name           string `json:"name"`
			OrganizationID int64  `json:"organization_id"`
		} `json:"workspaces"`
	}
	mustDecodeJSON(t, session.Body.Bytes(), &bootstrapResponse)
	if len(bootstrapResponse.Organizations) != 2 {
		t.Fatalf("expected 2 organizations in session bootstrap, got %#v", bootstrapResponse.Organizations)
	}
	if len(bootstrapResponse.Workspaces) != 2 {
		t.Fatalf("expected 2 workspaces in session bootstrap, got %#v", bootstrapResponse.Workspaces)
	}

	organizationsResponse := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/organizations",
		nil,
		basicAuthorization(uniqueEmail, "secret1"),
	)
	if organizationsResponse.Code != http.StatusOK {
		t.Fatalf(
			"expected /me/organizations status 200, got %d body=%s",
			organizationsResponse.Code,
			organizationsResponse.Body.String(),
		)
	}

	var organizations []struct {
		ID   int64  `json:"id"`
		Name string `json:"name"`
	}
	mustDecodeJSON(t, organizationsResponse.Body.Bytes(), &organizations)
	if len(organizations) != 2 {
		t.Fatalf("expected 2 organizations from /me/organizations, got %#v", organizations)
	}

	workspacesResponse := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/workspaces",
		nil,
		basicAuthorization(uniqueEmail, "secret1"),
	)
	if workspacesResponse.Code != http.StatusOK {
		t.Fatalf(
			"expected /me/workspaces status 200, got %d body=%s",
			workspacesResponse.Code,
			workspacesResponse.Body.String(),
		)
	}

	var workspaces []struct {
		ID   int64  `json:"id"`
		Name string `json:"name"`
	}
	mustDecodeJSON(t, workspacesResponse.Body.Bytes(), &workspaces)
	if len(workspaces) != 2 {
		t.Fatalf("expected 2 workspaces from /me/workspaces, got %#v", workspaces)
	}
}

func TestUpdateWebSessionSwitchesCurrentHomeWorkspace(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("switch-home")

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

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    uniqueEmail,
		"fullname": "Switch Home User",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}
	sessionCookie := register.Header().Get("Set-Cookie")
	if sessionCookie == "" {
		t.Fatal("expected register to set session cookie")
	}

	var initialSession struct {
		CurrentOrganizationID *int64 `json:"current_organization_id"`
		CurrentWorkspaceID    *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &initialSession)
	if initialSession.CurrentWorkspaceID == nil || initialSession.CurrentOrganizationID == nil {
		t.Fatalf("expected initial session ids, got %#v", initialSession)
	}

	createOrganization := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/organizations",
		map[string]any{
			"name":           "Second Org",
			"workspace_name": "Second Workspace",
		},
		basicAuthorization(uniqueEmail, "secret1"),
	)
	if createOrganization.Code != http.StatusOK {
		t.Fatalf(
			"expected create organization status 200, got %d body=%s",
			createOrganization.Code,
			createOrganization.Body.String(),
		)
	}

	switchSession := performJSONRequest(t, app, http.MethodPatch, "/web/v1/session", map[string]any{
		"workspace_id": *initialSession.CurrentWorkspaceID,
	}, sessionCookie)
	if switchSession.Code != http.StatusOK {
		t.Fatalf(
			"expected patch session status 200, got %d body=%s",
			switchSession.Code,
			switchSession.Body.String(),
		)
	}

	var switched struct {
		CurrentOrganizationID *int64 `json:"current_organization_id"`
		CurrentWorkspaceID    *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, switchSession.Body.Bytes(), &switched)
	if switched.CurrentWorkspaceID == nil || *switched.CurrentWorkspaceID != *initialSession.CurrentWorkspaceID {
		t.Fatalf("expected current workspace id %d after switch, got %#v", *initialSession.CurrentWorkspaceID, switched.CurrentWorkspaceID)
	}
	if switched.CurrentOrganizationID == nil || *switched.CurrentOrganizationID != *initialSession.CurrentOrganizationID {
		t.Fatalf("expected current organization id %d after switch, got %#v", *initialSession.CurrentOrganizationID, switched.CurrentOrganizationID)
	}
}

func TestPublicTrackWorkspaceAccessUsesMembershipInsteadOfCurrentHomeOrganization(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("multi-org-scope")

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

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    uniqueEmail,
		"fullname": "Multi Org Scope User",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}

	sessionCookie := register.Header().Get("Set-Cookie")
	if sessionCookie == "" {
		t.Fatal("expected register response to set session cookie")
	}

	var initialSession struct {
		CurrentOrganizationID *int64 `json:"current_organization_id"`
		CurrentWorkspaceID    *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &initialSession)
	if initialSession.CurrentOrganizationID == nil || initialSession.CurrentWorkspaceID == nil {
		t.Fatalf("expected initial session ids, got %#v", initialSession)
	}

	createOrganization := performJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/organizations",
		map[string]any{
			"name":           "Second Org",
			"workspace_name": "Second Workspace",
		},
		sessionCookie,
	)
	if createOrganization.Code != http.StatusOK {
		t.Fatalf(
			"expected create organization status 200, got %d body=%s",
			createOrganization.Code,
			createOrganization.Body.String(),
		)
	}

	var createdOrganization struct {
		WorkspaceID int64 `json:"workspace_id"`
	}
	mustDecodeJSON(t, createOrganization.Body.Bytes(), &createdOrganization)
	if createdOrganization.WorkspaceID == 0 {
		t.Fatalf("expected created workspace id, got %#v", createdOrganization)
	}

	switchSession := performJSONRequest(t, app, http.MethodPatch, "/web/v1/session", map[string]any{
		"workspace_id": createdOrganization.WorkspaceID,
	}, sessionCookie)
	if switchSession.Code != http.StatusOK {
		t.Fatalf(
			"expected patch session status 200, got %d body=%s",
			switchSession.Code,
			switchSession.Body.String(),
		)
	}

	firstWorkspaceTags := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(*initialSession.CurrentWorkspaceID)+"/tags",
		nil,
		sessionCookie,
	)
	if firstWorkspaceTags.Code != http.StatusOK {
		t.Fatalf(
			"expected first workspace tags status 200 after switching home org, got %d body=%s",
			firstWorkspaceTags.Code,
			firstWorkspaceTags.Body.String(),
		)
	}
}

func performJSONRequest(
	t *testing.T,
	app *App,
	method string,
	path string,
	payload any,
	cookie string,
) *httptest.ResponseRecorder {
	return performJSONRequestWithMetadata(t, app, method, path, payload, cookie, "")
}

func performAuthorizedJSONRequest(
	t *testing.T,
	app *App,
	method string,
	path string,
	payload any,
	authorization string,
) *httptest.ResponseRecorder {
	return performJSONRequestWithMetadata(t, app, method, path, payload, "", authorization)
}

func performAuthorizedMultipartRequest(
	t *testing.T,
	app *App,
	method string,
	path string,
	fields map[string]string,
	fileField string,
	fileName string,
	fileBody []byte,
	authorization string,
) *httptest.ResponseRecorder {
	t.Helper()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			t.Fatalf("write multipart field %s: %v", key, err)
		}
	}

	part, err := writer.CreateFormFile(fileField, fileName)
	if err != nil {
		t.Fatalf("create multipart file: %v", err)
	}
	if _, err := part.Write(fileBody); err != nil {
		t.Fatalf("write multipart file: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}

	request := httptest.NewRequest(method, path, &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	if authorization != "" {
		request.Header.Set("Authorization", authorization)
	}

	recorder := httptest.NewRecorder()
	app.HTTP.ServeHTTP(recorder, request)
	return recorder
}

func performJSONRequestWithMetadata(
	t *testing.T,
	app *App,
	method string,
	path string,
	payload any,
	cookie string,
	authorization string,
) *httptest.ResponseRecorder {
	t.Helper()

	var body []byte
	if payload != nil {
		var err error
		body, err = json.Marshal(payload)
		if err != nil {
			t.Fatalf("marshal payload: %v", err)
		}
	}

	request := httptest.NewRequest(method, path, bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	if cookie != "" {
		request.Header.Set("Cookie", cookie)
	}
	if authorization != "" {
		request.Header.Set("Authorization", authorization)
	}

	recorder := httptest.NewRecorder()
	app.HTTP.ServeHTTP(recorder, request)
	return recorder
}

func mustJSONBytes(t *testing.T, payload any) []byte {
	t.Helper()

	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	return body
}

func basicAuthorization(username string, password string) string {
	token := base64.StdEncoding.EncodeToString([]byte(username + ":" + password))
	return "Basic " + token
}

func mustDecodeJSON(t *testing.T, body []byte, target any) {
	t.Helper()
	if err := json.Unmarshal(body, target); err != nil {
		t.Fatalf("decode json: %v body=%s", err, string(body))
	}
}

func mustBuildZipArchive(t *testing.T, files map[string]string) []byte {
	t.Helper()

	var buffer bytes.Buffer
	writer := zip.NewWriter(&buffer)
	for name, content := range files {
		entry, err := writer.Create(name)
		if err != nil {
			t.Fatalf("create zip entry %s: %v", name, err)
		}
		if _, err := entry.Write([]byte(content)); err != nil {
			t.Fatalf("write zip entry %s: %v", name, err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close zip writer: %v", err)
	}
	return buffer.Bytes()
}

func intToString(value int64) string {
	return strconv.FormatInt(value, 10)
}

func TestWebRoutesRecordAuditLogs(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("web-audit")

	app, err := NewApp(Config{
		ServiceName: "opentoggl-api",
		Server:      ServerConfig{ListenAddress: ":0"},
		Database:    DatabaseConfig{PrimaryDSN: database.ConnString()},
		Redis:       RedisConfig{Address: "redis://127.0.0.1:6379/0"},
	})
	if err != nil {
		t.Fatalf("NewApp: %v", err)
	}
	t.Cleanup(app.Platform.Database.Close)

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    uniqueEmail,
		"fullname": "Audit Test",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("register: got %d, body=%s", register.Code, register.Body.String())
	}
	sessionCookie := register.Header().Get("Set-Cookie")

	// Perform a mutating web request — this should be audit-logged
	var session struct {
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	sessionResp := performJSONRequest(t, app, http.MethodGet, "/web/v1/session", nil, sessionCookie)
	mustDecodeJSON(t, sessionResp.Body.Bytes(), &session)
	if session.CurrentWorkspaceID == nil {
		t.Fatalf("no workspace ID in session")
	}
	wsID := *session.CurrentWorkspaceID

	// Update workspace settings — a PATCH through the web API
	performJSONRequest(t, app, http.MethodPatch, "/web/v1/workspaces/"+intToString(wsID)+"/settings", map[string]any{
		"name": "Audit Workspace",
	}, sessionCookie)

	// The audit log insert runs in a goroutine — give it a moment
	time.Sleep(200 * time.Millisecond)

	// Verify audit log was recorded
	var count int
	err = app.Platform.Database.Pool().QueryRow(
		context.Background(),
		"select count(*) from governance_audit_logs where workspace_id = $1",
		wsID,
	).Scan(&count)
	if err != nil {
		t.Fatalf("query audit logs: %v", err)
	}
	// Registration + settings update should both be logged
	if count == 0 {
		t.Fatalf("expected audit log entries for web routes, got 0")
	}
}
