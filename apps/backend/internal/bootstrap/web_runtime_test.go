package bootstrap

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	httpapp "opentoggl/backend/apps/backend/internal/http"
)

func TestWebRoutesServeLiveEchoRuntime(t *testing.T) {
	app, err := NewApp(Config{
		ServiceName: "opentoggl-api",
		Server: ServerConfig{
			ListenAddress: ":0",
		},
		Database: DatabaseConfig{
			PrimaryDSN: "postgres://opentoggl@localhost:5432/opentoggl",
		},
		Redis: RedisConfig{
			Address: "redis://127.0.0.1:6379/0",
		},
	})
	if err != nil {
		t.Fatalf("NewApp returned error: %v", err)
	}

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
			"hide_start_end_times": true,
			"report_locked_at":     "2026-03-20T00:00:00Z",
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

func TestWebRuntimeBlocksDeactivatedLoginAndCurrentWrites(t *testing.T) {
	handlers := httpapp.NewWebHandlers()

	register := handlers.Register(context.Background(), httpapp.RegisterRequest{
		Email:    "person@example.com",
		FullName: "Test Person",
		Password: "secret1",
	})
	if register.StatusCode != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d", register.StatusCode)
	}

	registerBody, ok := register.Body.(map[string]any)
	if !ok {
		t.Fatalf("expected register body map, got %T", register.Body)
	}

	organizationID, ok := registerBody["current_organization_id"].(int64)
	if !ok || organizationID <= 0 {
		t.Fatalf("expected current organization id, got %#v", registerBody["current_organization_id"])
	}

	workspaceID, ok := registerBody["current_workspace_id"].(int64)
	if !ok || workspaceID <= 0 {
		t.Fatalf("expected current workspace id, got %#v", registerBody["current_workspace_id"])
	}

	if !handlers.DeactivateUserByEmail("person@example.com") {
		t.Fatal("expected registered user to be deactivated")
	}

	session := handlers.GetSession(context.Background(), register.SessionID)
	if session.StatusCode != http.StatusOK {
		t.Fatalf("expected deactivated session lookup to keep working, got %d body=%#v", session.StatusCode, session.Body)
	}

	login := handlers.Login(context.Background(), httpapp.LoginRequest{
		Email:    "person@example.com",
		Password: "secret1",
	})
	if login.StatusCode != http.StatusForbidden {
		t.Fatalf("expected deactivated login status 403, got %d body=%#v", login.StatusCode, login.Body)
	}

	updatedProfile := handlers.UpdateProfile(context.Background(), register.SessionID, httpapp.ProfileRequest{
		FullName: "Blocked Rename",
	})
	if updatedProfile.StatusCode != http.StatusForbidden {
		t.Fatalf("expected deactivated profile patch status 403, got %d body=%#v", updatedProfile.StatusCode, updatedProfile.Body)
	}

	updatedPreferences := handlers.UpdatePreferences(context.Background(), register.SessionID, httpapp.PreferencesRequest{
		LanguageCode: stringPtr("zh-CN"),
	})
	if updatedPreferences.StatusCode != http.StatusForbidden {
		t.Fatalf("expected deactivated preferences patch status 403, got %d body=%#v", updatedPreferences.StatusCode, updatedPreferences.Body)
	}

	resetToken := handlers.ResetAPIToken(context.Background(), register.SessionID)
	if resetToken.StatusCode != http.StatusForbidden {
		t.Fatalf("expected deactivated api token reset status 403, got %d body=%#v", resetToken.StatusCode, resetToken.Body)
	}

	updatedOrganizationSettings := handlers.Tenant.UpdateOrganizationSettings(
		context.Background(),
		register.SessionID,
		organizationID,
		httpapp.OrganizationSettingsRequest{},
	)
	if updatedOrganizationSettings.StatusCode != http.StatusUnauthorized {
		t.Fatalf(
			"expected deactivated organization settings patch status 401, got %d body=%#v",
			updatedOrganizationSettings.StatusCode,
			updatedOrganizationSettings.Body,
		)
	}

	updatedWorkspaceSettings := handlers.Tenant.UpdateWorkspaceSettings(
		context.Background(),
		register.SessionID,
		workspaceID,
		httpapp.WorkspaceSettingsRequest{},
	)
	if updatedWorkspaceSettings.StatusCode != http.StatusUnauthorized {
		t.Fatalf(
			"expected deactivated workspace settings patch status 401, got %d body=%#v",
			updatedWorkspaceSettings.StatusCode,
			updatedWorkspaceSettings.Body,
		)
	}

	updatedWorkspacePermissions := handlers.Tenant.UpdateWorkspacePermissions(
		context.Background(),
		register.SessionID,
		workspaceID,
		httpapp.WorkspacePermissionsRequest{},
	)
	if updatedWorkspacePermissions.StatusCode != http.StatusUnauthorized {
		t.Fatalf(
			"expected deactivated workspace permissions patch status 401, got %d body=%#v",
			updatedWorkspacePermissions.StatusCode,
			updatedWorkspacePermissions.Body,
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

func stringPtr(value string) *string {
	return &value
}
