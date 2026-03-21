package httpapp

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestGeneratedWave1WebCatalogMiscRoutesRejectInvalidQueryAndBody(t *testing.T) {
	server := echo.New()
	registerGeneratedWave1WebCatalogMiscRoutes(server, &generatedWave1WebCatalogMiscHandlerStub{})

	for _, tc := range []struct {
		method string
		path   string
		body   string
	}{
		{method: http.MethodGet, path: "/web/v1/tasks?workspace_id=bad"},
		{method: http.MethodGet, path: "/web/v1/tags?workspace_id=bad"},
		{method: http.MethodGet, path: "/web/v1/groups?workspace_id=bad"},
		{method: http.MethodPost, path: "/web/v1/tasks", body: `{}`},
		{method: http.MethodPost, path: "/web/v1/tasks", body: `{"workspace_id":1}`},
		{method: http.MethodPost, path: "/web/v1/tasks", body: `{"name":"Task"}`},
		{method: http.MethodPost, path: "/web/v1/tasks", body: `{"workspace_id":1,"name":"   "}`},
		{method: http.MethodPost, path: "/web/v1/tags", body: `{}`},
		{method: http.MethodPost, path: "/web/v1/tags", body: `{"workspace_id":1}`},
		{method: http.MethodPost, path: "/web/v1/tags", body: `{"name":"Tag"}`},
		{method: http.MethodPost, path: "/web/v1/tags", body: `{"workspace_id":1,"name":"   "}`},
		{method: http.MethodPost, path: "/web/v1/groups", body: `{}`},
		{method: http.MethodPost, path: "/web/v1/groups", body: `{"workspace_id":1}`},
		{method: http.MethodPost, path: "/web/v1/groups", body: `{"name":"Group"}`},
		{method: http.MethodPost, path: "/web/v1/groups", body: `{"workspace_id":1,"name":"   "}`},
	} {
		request := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
		request.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		recorder := httptest.NewRecorder()

		server.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusBadRequest {
			t.Fatalf("expected %s %s to return 400, got %d body=%s", tc.method, tc.path, recorder.Code, recorder.Body.String())
		}
	}
}

func TestGeneratedWave1WebCatalogMiscRoutesDecodeListQueries(t *testing.T) {
	server := echo.New()
	handler := &generatedWave1WebCatalogMiscHandlerStub{}
	registerGeneratedWave1WebCatalogMiscRoutes(server, handler)

	for _, tc := range []struct {
		path           string
		expectedRoute  string
		expectedID     int64
	}{
		{path: "/web/v1/tasks?workspace_id=42", expectedRoute: "tasks", expectedID: 42},
		{path: "/web/v1/tags?workspace_id=43", expectedRoute: "tags", expectedID: 43},
		{path: "/web/v1/groups?workspace_id=44", expectedRoute: "groups", expectedID: 44},
	} {
		request := httptest.NewRequest(http.MethodGet, tc.path, nil)
		recorder := httptest.NewRecorder()

		server.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected %s to return 200, got %d body=%s", tc.path, recorder.Code, recorder.Body.String())
		}
		if handler.lastRoute != tc.expectedRoute {
			t.Fatalf("expected route %s, got %s", tc.expectedRoute, handler.lastRoute)
		}
		if handler.lastWorkspaceID == nil || *handler.lastWorkspaceID != tc.expectedID {
			t.Fatalf("expected workspace_id=%d, got %#v", tc.expectedID, handler.lastWorkspaceID)
		}
	}
}

type generatedWave1WebCatalogMiscHandlerStub struct {
	lastRoute       string
	lastWorkspaceID *int64
}

func (stub *generatedWave1WebCatalogMiscHandlerStub) ListTasks(_ context.Context, _ string, request GeneratedListTasksRequest) Wave1Response {
	stub.lastRoute = "tasks"
	stub.lastWorkspaceID = request.WorkspaceID
	return Wave1Response{StatusCode: http.StatusOK, Body: map[string]any{"tasks": []any{}}}
}

func (stub *generatedWave1WebCatalogMiscHandlerStub) CreateTask(context.Context, string, CreateTaskRequestBody) Wave1Response {
	return Wave1Response{StatusCode: http.StatusCreated, Body: map[string]any{"id": 1, "name": "Task", "workspace_id": 1, "active": true}}
}

func (stub *generatedWave1WebCatalogMiscHandlerStub) ListTags(_ context.Context, _ string, request GeneratedListTagsRequest) Wave1Response {
	stub.lastRoute = "tags"
	stub.lastWorkspaceID = request.WorkspaceID
	return Wave1Response{StatusCode: http.StatusOK, Body: map[string]any{"tags": []any{}}}
}

func (stub *generatedWave1WebCatalogMiscHandlerStub) CreateTag(context.Context, string, CreateTagRequestBody) Wave1Response {
	return Wave1Response{StatusCode: http.StatusCreated, Body: map[string]any{"id": 1, "name": "Tag", "workspace_id": 1, "active": true}}
}

func (stub *generatedWave1WebCatalogMiscHandlerStub) ListGroups(_ context.Context, _ string, request GeneratedListGroupsRequest) Wave1Response {
	stub.lastRoute = "groups"
	stub.lastWorkspaceID = request.WorkspaceID
	return Wave1Response{StatusCode: http.StatusOK, Body: map[string]any{"groups": []any{}}}
}

func (stub *generatedWave1WebCatalogMiscHandlerStub) CreateGroup(context.Context, string, CreateGroupRequestBody) Wave1Response {
	return Wave1Response{StatusCode: http.StatusCreated, Body: map[string]any{"id": 1, "name": "Group", "workspace_id": 1, "active": true}}
}
