package httpapp

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestGeneratedWave1WebProjectsRoutesRejectInvalidQueryAndPathIDs(t *testing.T) {
	server := echo.New()
	registerGeneratedWave1WebProjectsRoutes(server, &generatedWave1WebProjectsHandlerStub{})

	for _, tc := range []struct {
		method string
		path   string
		body   string
	}{
		{
			method: http.MethodGet,
			path:   "/web/v1/projects?workspace_id=not-a-number",
		},
		{
			method: http.MethodGet,
			path:   "/web/v1/projects?status=invalid",
		},
		{
			method: http.MethodGet,
			path:   "/web/v1/projects/not-a-number",
		},
		{
			method: http.MethodPost,
			path:   "/web/v1/projects/not-a-number/archive",
		},
		{
			method: http.MethodDelete,
			path:   "/web/v1/projects/not-a-number/archive",
		},
		{
			method: http.MethodPost,
			path:   "/web/v1/projects/not-a-number/pin",
		},
		{
			method: http.MethodDelete,
			path:   "/web/v1/projects/not-a-number/pin",
		},
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

func TestGeneratedWave1WebProjectsRoutesRejectInvalidCreateBody(t *testing.T) {
	server := echo.New()
	registerGeneratedWave1WebProjectsRoutes(server, &generatedWave1WebProjectsHandlerStub{})

	for _, body := range []string{
		`{}`,
		`{"workspace_id":"not-a-number","name":"Project"}`,
		`{"workspace_id":1}`,
		`{"name":"Project"}`,
	} {
		request := httptest.NewRequest(
			http.MethodPost,
			"/web/v1/projects",
			strings.NewReader(body),
		)
		request.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		recorder := httptest.NewRecorder()

		server.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusBadRequest {
			t.Fatalf("expected invalid create payload %s to return 400, got %d body=%s", body, recorder.Code, recorder.Body.String())
		}
	}
}

func TestGeneratedWave1WebProjectsRoutesDecodeListQuery(t *testing.T) {
	server := echo.New()
	handler := &generatedWave1WebProjectsHandlerStub{}
	registerGeneratedWave1WebProjectsRoutes(server, handler)

	request := httptest.NewRequest(
		http.MethodGet,
		"/web/v1/projects?workspace_id=42&status=archived",
		nil,
	)
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected list request to return 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if handler.listRequest == nil {
		t.Fatal("expected list request to be captured")
	}
	if handler.listRequest.WorkspaceID == nil || *handler.listRequest.WorkspaceID != 42 {
		t.Fatalf("expected workspace_id=42, got %#v", handler.listRequest.WorkspaceID)
	}
	if handler.listRequest.Status == nil || *handler.listRequest.Status != "archived" {
		t.Fatalf("expected status=archived, got %#v", handler.listRequest.Status)
	}
}

type generatedWave1WebProjectsHandlerStub struct {
	listRequest *GeneratedListProjectsRequest
}

func (stub *generatedWave1WebProjectsHandlerStub) ListProjects(
	_ context.Context,
	_ string,
	request GeneratedListProjectsRequest,
) Wave1Response {
	stub.listRequest = &request
	return Wave1Response{
		StatusCode: http.StatusOK,
		Body: map[string]any{
			"projects": []any{},
		},
	}
}

func (*generatedWave1WebProjectsHandlerStub) CreateProject(
	context.Context,
	string,
	CreateProjectRequestBody,
) Wave1Response {
	return Wave1Response{
		StatusCode: http.StatusCreated,
		Body: map[string]any{
			"id":           42,
			"name":         "Project",
			"workspace_id": 1,
			"active":       true,
			"pinned":       false,
		},
	}
}

func (*generatedWave1WebProjectsHandlerStub) GetProject(context.Context, string, int64) Wave1Response {
	return Wave1Response{
		StatusCode: http.StatusOK,
		Body: map[string]any{
			"id":                42,
			"name":              "Project",
			"workspace_id":      1,
			"client_id":         nil,
			"active":            true,
			"pinned":            false,
			"billable":          false,
			"private":           false,
			"template":          false,
			"color":             "#000000",
			"currency":          nil,
			"estimated_seconds": 0,
			"actual_seconds":    0,
			"fixed_fee":         0,
			"rate":              nil,
		},
	}
}

func (*generatedWave1WebProjectsHandlerStub) ArchiveProject(context.Context, string, int64) Wave1Response {
	return Wave1Response{StatusCode: http.StatusOK, Body: map[string]any{"id": 42}}
}

func (*generatedWave1WebProjectsHandlerStub) RestoreProject(context.Context, string, int64) Wave1Response {
	return Wave1Response{StatusCode: http.StatusOK, Body: map[string]any{"id": 42}}
}

func (*generatedWave1WebProjectsHandlerStub) PinProject(context.Context, string, int64) Wave1Response {
	return Wave1Response{StatusCode: http.StatusOK, Body: map[string]any{"id": 42}}
}

func (*generatedWave1WebProjectsHandlerStub) UnpinProject(context.Context, string, int64) Wave1Response {
	return Wave1Response{StatusCode: http.StatusOK, Body: map[string]any{"id": 42}}
}
