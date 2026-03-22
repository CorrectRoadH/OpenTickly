package bootstrap

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestWebRoutesServeLiveEchoRuntime(t *testing.T) {
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

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    "person@example.com",
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
			ID    int64  `json:"id"`
			Email string `json:"email"`
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

	if bootstrapResponse.User.Email != "person@example.com" {
		t.Fatalf("expected bootstrap email person@example.com, got %q", bootstrapResponse.User.Email)
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

	profile := performJSONRequest(t, app, http.MethodGet, "/web/v1/profile", nil, sessionCookie)
	if profile.Code != http.StatusOK {
		t.Fatalf("expected profile status 200, got %d body=%s", profile.Code, profile.Body.String())
	}
	var profileBody map[string]any
	mustDecodeJSON(t, profile.Body.Bytes(), &profileBody)
	originalToken, ok := profileBody["api_token"].(string)
	if !ok || originalToken == "" {
		t.Fatalf("expected profile api_token string, got %#v", profileBody["api_token"])
	}

	resetAPIToken := performJSONRequest(
		t,
		app,
		http.MethodPost,
		"/web/v1/profile/api-token/reset",
		nil,
		sessionCookie,
	)
	if resetAPIToken.Code != http.StatusOK {
		t.Fatalf("expected api token reset status 200, got %d body=%s", resetAPIToken.Code, resetAPIToken.Body.String())
	}
	var resetAPITokenBody map[string]any
	mustDecodeJSON(t, resetAPIToken.Body.Bytes(), &resetAPITokenBody)
	rotatedToken, ok := resetAPITokenBody["api_token"].(string)
	if !ok || rotatedToken == "" {
		t.Fatalf("expected reset response api_token string, got %#v", resetAPITokenBody["api_token"])
	}
	if rotatedToken == originalToken {
		t.Fatalf("expected rotated api_token to differ from %q", originalToken)
	}

	profileAfterReset := performJSONRequest(t, app, http.MethodGet, "/web/v1/profile", nil, sessionCookie)
	if profileAfterReset.Code != http.StatusOK {
		t.Fatalf("expected profile status 200 after token reset, got %d body=%s", profileAfterReset.Code, profileAfterReset.Body.String())
	}
	var profileAfterResetBody map[string]any
	mustDecodeJSON(t, profileAfterReset.Body.Bytes(), &profileAfterResetBody)
	if profileAfterResetBody["api_token"] != rotatedToken {
		t.Fatalf("expected profile api_token %q after reset, got %#v", rotatedToken, profileAfterResetBody["api_token"])
	}

	updatedProfile := performJSONRequest(t, app, http.MethodPatch, "/web/v1/profile", map[string]any{
		"email":                "renamed@example.com",
		"fullname":             "Renamed Person",
		"timezone":             "Asia/Shanghai",
		"beginning_of_week":    1,
		"country_id":           44,
		"default_workspace_id": workspaceID,
	}, sessionCookie)
	if updatedProfile.Code != http.StatusOK {
		t.Fatalf("expected profile patch status 200, got %d body=%s", updatedProfile.Code, updatedProfile.Body.String())
	}

	preferences := performJSONRequest(t, app, http.MethodGet, "/web/v1/preferences", nil, sessionCookie)
	if preferences.Code != http.StatusOK {
		t.Fatalf("expected preferences status 200, got %d body=%s", preferences.Code, preferences.Body.String())
	}

	updatedPreferences := performJSONRequest(t, app, http.MethodPatch, "/web/v1/preferences", map[string]any{
		"date_format":       "YYYY-MM-DD",
		"timeofday_format":  "h:mm a",
		"duration_format":   "improved",
		"pg_time_zone_name": "Asia/Shanghai",
		"beginningOfWeek":   1,
		"language_code":     "en-US",
	}, sessionCookie)
	if updatedPreferences.Code != http.StatusOK {
		t.Fatalf("expected preferences patch status 200, got %d body=%s", updatedPreferences.Code, updatedPreferences.Body.String())
	}
	var updatedPreferencesBody map[string]any
	mustDecodeJSON(t, updatedPreferences.Body.Bytes(), &updatedPreferencesBody)
	if updatedPreferencesBody["duration_format"] != "improved" {
		t.Fatalf("expected duration_format to round-trip, got %#v", updatedPreferencesBody["duration_format"])
	}
	if updatedPreferencesBody["language_code"] != "en-US" {
		t.Fatalf("expected language_code to round-trip, got %#v", updatedPreferencesBody["language_code"])
	}
	if updatedPreferencesBody["pg_time_zone_name"] != "Asia/Shanghai" {
		t.Fatalf("expected pg_time_zone_name to round-trip, got %#v", updatedPreferencesBody["pg_time_zone_name"])
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

	organizationSettingsPath := "/web/v1/organizations/" + intToString(organizationID) + "/settings"
	organizationSettings := performJSONRequest(t, app, http.MethodGet, organizationSettingsPath, nil, sessionCookie)
	if organizationSettings.Code != http.StatusOK {
		t.Fatalf("expected organization settings status 200, got %d body=%s", organizationSettings.Code, organizationSettings.Body.String())
	}

	updatedOrganizationSettings := performJSONRequest(t, app, http.MethodPatch, organizationSettingsPath, map[string]any{
		"organization": map[string]any{
			"name": "North Ridge Org",
		},
	}, sessionCookie)
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
	invalidOrganizationPath := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/web/v1/organizations/not-a-number/settings",
		nil,
		sessionCookie,
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
		"email":    "renamed@example.com",
		"password": "secret1",
	}, "")
	if login.Code != http.StatusOK {
		t.Fatalf("expected login status 200, got %d body=%s", login.Code, login.Body.String())
	}
}

func TestWebRuntimePersistsRegisteredSessionAcrossAppRestart(t *testing.T) {
	database := pgtest.Open(t)
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
		"email":    "persisted@example.com",
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

func TestWebRuntimeRejectsWritesForDeactivatedUsers(t *testing.T) {
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

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    "person@example.com",
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
		JobRecorder:        identitypostgres.NewJobRecorder(app.Platform.Database.Pool()),
		RunningTimerLookup: identitypostgres.NewRunningTimerLookup(app.Platform.Database.Pool()),
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
		"email":    "person@example.com",
		"password": "secret1",
	}, "")
	if login.Code != http.StatusForbidden {
		t.Fatalf("expected deactivated login status 403, got %d body=%s", login.Code, login.Body.String())
	}

	updatedProfile := performJSONRequest(t, app, http.MethodPatch, "/web/v1/profile", map[string]any{
		"email":                "person@example.com",
		"fullname":             "Blocked Rename",
		"timezone":             "UTC",
		"beginning_of_week":    1,
		"country_id":           44,
		"default_workspace_id": *registerBody.CurrentWorkspaceID,
	}, sessionCookie)
	if updatedProfile.Code != http.StatusForbidden {
		t.Fatalf("expected deactivated profile patch status 403, got %d body=%s", updatedProfile.Code, updatedProfile.Body.String())
	}

	updatedPreferences := performJSONRequest(t, app, http.MethodPatch, "/web/v1/preferences", map[string]any{
		"language_code": "zh-CN",
	}, sessionCookie)
	if updatedPreferences.Code != http.StatusForbidden {
		t.Fatalf("expected deactivated preferences patch status 403, got %d body=%s", updatedPreferences.Code, updatedPreferences.Body.String())
	}

	resetToken := performJSONRequest(t, app, http.MethodPost, "/web/v1/profile/api-token/reset", nil, sessionCookie)
	if resetToken.Code != http.StatusForbidden {
		t.Fatalf("expected deactivated api token reset status 403, got %d body=%s", resetToken.Code, resetToken.Body.String())
	}

	organizationSettingsPath := "/web/v1/organizations/" + intToString(*registerBody.CurrentOrganizationID) + "/settings"
	updatedOrganizationSettings := performJSONRequest(t, app, http.MethodPatch, organizationSettingsPath, map[string]any{
		"organization": map[string]any{"name": "Blocked"},
	}, sessionCookie)
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
		"email":    "routes@example.com",
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
		{method: http.MethodPost, path: "/web/v1/auth/login", body: map[string]any{"email": "routes@example.com"}},
		{method: http.MethodPatch, path: "/web/v1/profile", body: map[string]any{"email": "updated@example.com"}, cookie: sessionCookie},
		{method: http.MethodPatch, path: "/web/v1/organizations/1/settings", body: map[string]any{"organization": map[string]any{}}, cookie: sessionCookie},
		{method: http.MethodPatch, path: "/web/v1/workspaces/1/settings", body: map[string]any{"workspace": map[string]any{"name": "Updated"}}, cookie: sessionCookie},
		{method: http.MethodPatch, path: "/web/v1/workspaces/1/permissions", body: map[string]any{"only_admins_may_create_projects": true}, cookie: sessionCookie},
		{method: http.MethodPost, path: "/web/v1/tasks", body: map[string]any{"workspace_id": 1}, cookie: sessionCookie},
	} {
		response := performJSONRequest(t, app, tc.method, tc.path, tc.body, tc.cookie)
		if response.Code != http.StatusBadRequest {
			t.Fatalf("expected %s %s to return 400 for missing required fields, got %d body=%s", tc.method, tc.path, response.Code, response.Body.String())
		}
	}
}

func TestUnimplementedWebCatalogRoutesFailExplicitly(t *testing.T) {
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

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    "catalog@example.com",
		"fullname": "Catalog Test",
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
	}{
		{method: http.MethodGet, path: "/web/v1/projects?workspace_id=1"},
		{method: http.MethodPost, path: "/web/v1/projects", body: map[string]any{"workspace_id": 1, "name": "Launch Website"}},
	} {
		response := performJSONRequest(t, app, tc.method, tc.path, tc.body, sessionCookie)
		if response.Code != http.StatusNotImplemented {
			t.Fatalf("expected %s %s to return 501 until implemented, got %d body=%s", tc.method, tc.path, response.Code, response.Body.String())
		}
	}
}

func TestPublicTrackRoutesServeRealCatalogAndAccountData(t *testing.T) {
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

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    "track@example.com",
		"fullname": "Track User",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}
	sessionCookie := register.Header().Get("Set-Cookie")

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

	me := performJSONRequest(t, app, http.MethodGet, "/api/v9/me", nil, sessionCookie)
	if me.Code != http.StatusOK {
		t.Fatalf("expected /api/v9/me status 200, got %d body=%s", me.Code, me.Body.String())
	}

	resetToken := performJSONRequest(t, app, http.MethodPost, "/api/v9/me/reset_token", nil, sessionCookie)
	if resetToken.Code != http.StatusOK {
		t.Fatalf("expected /api/v9/me/reset_token status 200, got %d body=%s", resetToken.Code, resetToken.Body.String())
	}
	var rotatedToken string
	mustDecodeJSON(t, resetToken.Body.Bytes(), &rotatedToken)
	if rotatedToken == "" {
		t.Fatal("expected rotated API token string")
	}

	preferences := performJSONRequest(t, app, http.MethodGet, "/api/v9/me/preferences", nil, sessionCookie)
	if preferences.Code != http.StatusOK {
		t.Fatalf("expected /api/v9/me/preferences status 200, got %d body=%s", preferences.Code, preferences.Body.String())
	}

	updateOrganization := performJSONRequest(
		t,
		app,
		http.MethodPut,
		"/api/v9/organizations/"+intToString(organizationID),
		map[string]any{"name": "Track Org"},
		sessionCookie,
	)
	if updateOrganization.Code != http.StatusOK {
		t.Fatalf("expected organization put status 200, got %d body=%s", updateOrganization.Code, updateOrganization.Body.String())
	}

	createClient := performJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients",
		map[string]any{"name": "North Ridge Client"},
		sessionCookie,
	)
	if createClient.Code != http.StatusOK {
		t.Fatalf("expected client create status 200, got %d body=%s", createClient.Code, createClient.Body.String())
	}

	listClients := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients",
		nil,
		sessionCookie,
	)
	if listClients.Code != http.StatusOK {
		t.Fatalf("expected clients list status 200, got %d body=%s", listClients.Code, listClients.Body.String())
	}
	var clientsBody []map[string]any
	mustDecodeJSON(t, listClients.Body.Bytes(), &clientsBody)
	if len(clientsBody) != 1 || clientsBody[0]["name"] != "North Ridge Client" {
		t.Fatalf("expected persisted client, got %#v", clientsBody)
	}

	createTag := performJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/tags",
		map[string]any{"name": "billable"},
		sessionCookie,
	)
	if createTag.Code != http.StatusOK {
		t.Fatalf("expected tag create status 200, got %d body=%s", createTag.Code, createTag.Body.String())
	}

	createGroup := performJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/groups",
		map[string]any{"name": "Design"},
		sessionCookie,
	)
	if createGroup.Code != http.StatusOK {
		t.Fatalf("expected group create status 200, got %d body=%s", createGroup.Code, createGroup.Body.String())
	}

	createProject := performJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects",
		map[string]any{"name": "Website Revamp"},
		sessionCookie,
	)
	if createProject.Code != http.StatusOK {
		t.Fatalf("expected project create status 200, got %d body=%s", createProject.Code, createProject.Body.String())
	}
	var projectBody map[string]any
	mustDecodeJSON(t, createProject.Body.Bytes(), &projectBody)
	projectID := int64(projectBody["id"].(float64))

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

	listProjects := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects?name=&page=1&sort_field=name&sort_order=ASC&only_templates=false&sort_pinned=true&search=",
		nil,
		sessionCookie,
	)
	if listProjects.Code != http.StatusOK {
		t.Fatalf("expected projects list status 200, got %d body=%s", listProjects.Code, listProjects.Body.String())
	}

	pinProject := performJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects/"+intToString(projectID)+"/pin",
		map[string]any{"pin": true},
		sessionCookie,
	)
	if pinProject.Code != http.StatusOK {
		t.Fatalf("expected project pin status 200, got %d body=%s", pinProject.Code, pinProject.Body.String())
	}

	archiveProject := performJSONRequest(
		t,
		app,
		http.MethodPut,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects/"+intToString(projectID),
		map[string]any{"active": false},
		sessionCookie,
	)
	if archiveProject.Code != http.StatusOK {
		t.Fatalf("expected project archive status 200, got %d body=%s", archiveProject.Code, archiveProject.Body.String())
	}

	projectUsers := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/project_users?project_ids="+intToString(projectID),
		nil,
		sessionCookie,
	)
	if projectUsers.Code != http.StatusOK {
		t.Fatalf("expected project users status 200, got %d body=%s", projectUsers.Code, projectUsers.Body.String())
	}

	tasksBasic := performJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/tasks/basic?page=1&per_page=200&sort_field=name&sort_order=ASC&search=&project_id="+intToString(projectID),
		nil,
		sessionCookie,
	)
	if tasksBasic.Code != http.StatusOK {
		t.Fatalf("expected tasks basic status 200, got %d body=%s", tasksBasic.Code, tasksBasic.Body.String())
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

	recorder := httptest.NewRecorder()
	app.HTTP.ServeHTTP(recorder, request)
	return recorder
}

func mustDecodeJSON(t *testing.T, body []byte, target any) {
	t.Helper()
	if err := json.Unmarshal(body, target); err != nil {
		t.Fatalf("decode json: %v body=%s", err, string(body))
	}
}

func intToString(value int64) string {
	return strconv.FormatInt(value, 10)
}
