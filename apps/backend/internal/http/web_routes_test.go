package httpapp

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"opentoggl/backend/apps/backend/internal/web"

	"github.com/labstack/echo/v4"
)

func TestWebRoutesRegistersProjectDetailEndpoint(t *testing.T) {
	server := NewServer(
		web.NewHealthSnapshot("opentoggl", []string{"identity"}),
		NewWebRouteRegistrar(NewWebHandlers()),
	)
	sessionCookie := mustRegisterWebSession(t, server)

	request := httptest.NewRequest(http.MethodGet, "/web/v1/projects/1001", nil)
	request.Header.Set("Cookie", sessionCookie)
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected project detail route to return 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}

	var response map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("expected project detail response to be valid json: %v", err)
	}

	id, ok := response["id"].(float64)
	if !ok || int64(id) != 1001 {
		t.Fatalf("expected project detail response id=1001, got %#v", response["id"])
	}
}

func TestWebRoutesUsesSnakeCasePathParamsForOpenAPIParity(t *testing.T) {
	server := NewServer(
		web.NewHealthSnapshot("opentoggl", []string{"identity"}),
		NewWebRouteRegistrar(NewWebHandlers()),
	)

	assertRouteRegistered(t, server, http.MethodGet, "/web/v1/organizations/:organization_id/settings")
	assertRouteRegistered(t, server, http.MethodGet, "/web/v1/workspaces/:workspace_id/settings")
	assertRouteRegistered(t, server, http.MethodGet, "/web/v1/workspaces/:workspace_id/permissions")
	assertRouteRegistered(t, server, http.MethodGet, "/web/v1/projects/:project_id/members")
	assertRouteNotRegistered(t, server, http.MethodGet, "/web/v1/organizations/:organizationID/settings")
	assertRouteNotRegistered(t, server, http.MethodGet, "/web/v1/workspaces/:workspaceID/settings")
}

func TestWebAuthSessionRoutesRejectMissingRequiredFieldsFromOpenAPI(t *testing.T) {
	server := NewServer(
		web.NewHealthSnapshot("opentoggl", []string{"identity"}),
		NewWebRouteRegistrar(NewWebHandlers()),
	)

	request := httptest.NewRequest(
		http.MethodPost,
		"/web/v1/auth/login",
		strings.NewReader(`{"email":"routes@example.com"}`),
	)
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected generated auth boundary to reject missing password with 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestWebProfileRoutesRejectMissingRequiredFieldsFromOpenAPI(t *testing.T) {
	server := NewServer(
		web.NewHealthSnapshot("opentoggl", []string{"identity"}),
		NewWebRouteRegistrar(NewWebHandlers()),
	)
	sessionCookie := mustRegisterWebSession(t, server)

	request := httptest.NewRequest(
		http.MethodPatch,
		"/web/v1/profile",
		strings.NewReader(`{"email":"updated@example.com"}`),
	)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Cookie", sessionCookie)
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected generated profile boundary to reject missing required fields with 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestWebWorkspacePermissionsRoutesRejectMissingRequiredFieldsFromOpenAPI(t *testing.T) {
	server := NewServer(
		web.NewHealthSnapshot("opentoggl", []string{"identity"}),
		NewWebRouteRegistrar(NewWebHandlers()),
	)
	sessionCookie := mustRegisterWebSession(t, server)

	request := httptest.NewRequest(
		http.MethodPatch,
		"/web/v1/workspaces/1/permissions",
		strings.NewReader(`{"only_admins_may_create_projects":true}`),
	)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Cookie", sessionCookie)
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected generated workspace permissions boundary to reject missing required fields with 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestWebWorkspaceSettingsRoutesRejectPartialWorkspacePayloadFromOpenAPI(t *testing.T) {
	server := NewServer(
		web.NewHealthSnapshot("opentoggl", []string{"identity"}),
		NewWebRouteRegistrar(NewWebHandlers()),
	)
	sessionCookie := mustRegisterWebSession(t, server)

	request := httptest.NewRequest(
		http.MethodPatch,
		"/web/v1/workspaces/1/settings",
		strings.NewReader(`{"workspace":{"name":"Updated"}}`),
	)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Cookie", sessionCookie)
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected generated workspace settings boundary to reject partial workspace payload with 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestWebClientRoutesRejectMissingRequiredFieldsFromOpenAPI(t *testing.T) {
	server := NewServer(
		web.NewHealthSnapshot("opentoggl", []string{"identity"}),
		NewWebRouteRegistrar(NewWebHandlers()),
	)
	sessionCookie := mustRegisterWebSession(t, server)

	request := httptest.NewRequest(
		http.MethodPost,
		"/web/v1/clients",
		strings.NewReader(`{"workspace_id":1}`),
	)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Cookie", sessionCookie)
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected generated client boundary to reject missing required fields with 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestWebCatalogMiscRoutesRejectMissingRequiredFieldsFromOpenAPI(t *testing.T) {
	server := NewServer(
		web.NewHealthSnapshot("opentoggl", []string{"identity"}),
		NewWebRouteRegistrar(NewWebHandlers()),
	)
	sessionCookie := mustRegisterWebSession(t, server)

	for _, tc := range []struct {
		path string
		body string
	}{
		{path: "/web/v1/tasks", body: `{"workspace_id":1}`},
		{path: "/web/v1/tags", body: `{"workspace_id":1}`},
		{path: "/web/v1/groups", body: `{"workspace_id":1}`},
	} {
		request := httptest.NewRequest(http.MethodPost, tc.path, strings.NewReader(tc.body))
		request.Header.Set("Content-Type", "application/json")
		request.Header.Set("Cookie", sessionCookie)
		recorder := httptest.NewRecorder()

		server.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusBadRequest {
			t.Fatalf("expected generated catalog misc boundary for %s to reject missing required fields with 400, got %d body=%s", tc.path, recorder.Code, recorder.Body.String())
		}
	}
}

func mustRegisterWebSession(t *testing.T, server http.Handler) string {
	t.Helper()

	request := httptest.NewRequest(
		http.MethodPost,
		"/web/v1/auth/register",
		strings.NewReader(`{"email":"routes@example.com","password":"secret","fullname":"Routes Test"}`),
	)
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected register route to return 201, got %d with body %s", recorder.Code, recorder.Body.String())
	}

	result := recorder.Result()
	for _, cookie := range result.Cookies() {
		if cookie.Name == sessionCookieName && cookie.Value != "" {
			return fmt.Sprintf("%s=%s", cookie.Name, cookie.Value)
		}
	}

	t.Fatal("expected register response to set session cookie")
	return ""
}

func assertRouteRegistered(t *testing.T, server *echo.Echo, method string, path string) {
	t.Helper()

	for _, route := range server.Routes() {
		if route.Method == method && route.Path == path {
			return
		}
	}

	t.Fatalf("expected %s %s to be registered", method, path)
}

func assertRouteNotRegistered(t *testing.T, server *echo.Echo, method string, path string) {
	t.Helper()

	for _, route := range server.Routes() {
		if route.Method == method && route.Path == path {
			t.Fatalf("expected %s %s to not be registered", method, path)
		}
	}
}
