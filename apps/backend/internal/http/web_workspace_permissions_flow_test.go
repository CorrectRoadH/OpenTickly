package httpapp

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"opentoggl/backend/apps/backend/internal/web"
)

func TestWorkspacePermissionsRoutesPersistToWorkspaceSettingsAndSession(t *testing.T) {
	server := NewServer(
		web.NewHealthSnapshot("opentoggl", []string{"identity"}),
		NewWebRouteRegistrar(NewWebHandlers()),
	)
	sessionCookie := mustRegisterWebSession(t, server)

	permissionsPath := "/web/v1/workspaces/1/permissions"

	initialPermissions := performWebRequest(t, server, http.MethodGet, permissionsPath, "", sessionCookie)
	if initialPermissions.Code != http.StatusOK {
		t.Fatalf(
			"expected initial workspace permissions status 200, got %d body=%s",
			initialPermissions.Code,
			initialPermissions.Body.String(),
		)
	}

	initialPermissionsBody := decodeJSONBody(t, initialPermissions.Body.Bytes())
	assertPermissionFlags(t, initialPermissionsBody, false)

	updatedPermissions := performWebRequest(
		t,
		server,
		http.MethodPatch,
		permissionsPath,
		`{
			"only_admins_may_create_projects": true,
			"only_admins_may_create_tags": true,
			"only_admins_see_team_dashboard": true,
			"limit_public_project_data": true
		}`,
		sessionCookie,
	)
	if updatedPermissions.Code != http.StatusOK {
		t.Fatalf(
			"expected workspace permissions patch status 200, got %d body=%s",
			updatedPermissions.Code,
			updatedPermissions.Body.String(),
		)
	}

	updatedPermissionsBody := decodeJSONBody(t, updatedPermissions.Body.Bytes())
	assertPermissionFlags(t, updatedPermissionsBody, true)

	workspaceSettings := performWebRequest(
		t,
		server,
		http.MethodGet,
		"/web/v1/workspaces/1/settings",
		"",
		sessionCookie,
	)
	if workspaceSettings.Code != http.StatusOK {
		t.Fatalf(
			"expected workspace settings status 200 after permissions patch, got %d body=%s",
			workspaceSettings.Code,
			workspaceSettings.Body.String(),
		)
	}

	workspaceSettingsBody := decodeJSONBody(t, workspaceSettings.Body.Bytes())
	workspace, ok := workspaceSettingsBody["workspace"].(map[string]any)
	if !ok {
		t.Fatalf("expected workspace settings response to include workspace map, got %#v", workspaceSettingsBody["workspace"])
	}
	assertPermissionFlags(t, workspace, true)

	session := performWebRequest(t, server, http.MethodGet, "/web/v1/session", "", sessionCookie)
	if session.Code != http.StatusOK {
		t.Fatalf("expected session status 200 after permissions patch, got %d body=%s", session.Code, session.Body.String())
	}

	sessionBody := decodeJSONBody(t, session.Body.Bytes())
	workspaces, ok := sessionBody["workspaces"].([]any)
	if !ok || len(workspaces) != 1 {
		t.Fatalf("expected session workspaces list to include one workspace, got %#v", sessionBody["workspaces"])
	}

	sessionWorkspace, ok := workspaces[0].(map[string]any)
	if !ok {
		t.Fatalf("expected session workspace entry to be a map, got %#v", workspaces[0])
	}
	assertPermissionFlags(t, sessionWorkspace, true)
}

func performWebRequest(
	t *testing.T,
	server http.Handler,
	method string,
	path string,
	body string,
	sessionCookie string,
) *httptest.ResponseRecorder {
	t.Helper()

	request := httptest.NewRequest(method, path, strings.NewReader(body))
	if body != "" {
		request.Header.Set("Content-Type", "application/json")
	}
	if sessionCookie != "" {
		request.Header.Set("Cookie", sessionCookie)
	}

	recorder := httptest.NewRecorder()
	server.ServeHTTP(recorder, request)
	return recorder
}

func decodeJSONBody(t *testing.T, body []byte) map[string]any {
	t.Helper()

	var decoded map[string]any
	if err := json.Unmarshal(body, &decoded); err != nil {
		t.Fatalf("expected valid json response, got error: %v body=%s", err, string(body))
	}
	return decoded
}

func assertPermissionFlags(t *testing.T, body map[string]any, expected bool) {
	t.Helper()

	for _, field := range []string{
		"only_admins_may_create_projects",
		"only_admins_may_create_tags",
		"only_admins_see_team_dashboard",
		"limit_public_project_data",
	} {
		if body[field] != expected {
			t.Fatalf("expected %s=%t, got %#v", field, expected, body[field])
		}
	}
}
