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

func TestWave1WebRoutesRegistersProjectDetailEndpoint(t *testing.T) {
	server := NewServer(web.NewHealthSnapshot("opentoggl", []string{"identity"}), NewWave1WebHandlers())
	sessionCookie := mustRegisterWave1Session(t, server)

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

func TestWave1WebRoutesUsesSnakeCasePathParamsForOpenAPIParity(t *testing.T) {
	server := NewServer(web.NewHealthSnapshot("opentoggl", []string{"identity"}), NewWave1WebHandlers())

	assertRouteRegistered(t, server, http.MethodGet, "/web/v1/organizations/:organization_id/settings")
	assertRouteRegistered(t, server, http.MethodGet, "/web/v1/workspaces/:workspace_id/settings")
	assertRouteRegistered(t, server, http.MethodGet, "/web/v1/workspaces/:workspace_id/permissions")
	assertRouteRegistered(t, server, http.MethodGet, "/web/v1/projects/:project_id/members")
	assertRouteNotRegistered(t, server, http.MethodGet, "/web/v1/organizations/:organizationID/settings")
	assertRouteNotRegistered(t, server, http.MethodGet, "/web/v1/workspaces/:workspaceID/settings")
}

func mustRegisterWave1Session(t *testing.T, server http.Handler) string {
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
