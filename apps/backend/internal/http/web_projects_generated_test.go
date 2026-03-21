package httpapp

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestGeneratedWebProjectsRoutesRejectInvalidQueryAndPathIDs(t *testing.T) {
	server := echo.New()
	registerGeneratedWebProjectsRoutes(server, &generatedWebProjectsHandlerStub{})

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

func TestGeneratedWebProjectsRoutesRejectInvalidCreateBody(t *testing.T) {
	server := echo.New()
	registerGeneratedWebProjectsRoutes(server, &generatedWebProjectsHandlerStub{})

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

func TestGeneratedWebProjectsRoutesDecodeListQuery(t *testing.T) {
	server := echo.New()
	handler := &generatedWebProjectsHandlerStub{}
	registerGeneratedWebProjectsRoutes(server, handler)

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

type generatedWebProjectsHandlerStub struct {
	listRequest *GeneratedListProjectsRequest
}

func (stub *generatedWebProjectsHandlerStub) ListProjects(
	_ context.Context,
	_ string,
	request GeneratedListProjectsRequest,
) WebResponse {
	stub.listRequest = &request
	return WebResponse{
		StatusCode: http.StatusOK,
		Body: map[string]any{
			"projects": []any{},
		},
	}
}

func (*generatedWebProjectsHandlerStub) CreateProject(
	context.Context,
	string,
	CreateProjectRequestBody,
) WebResponse {
	return WebResponse{
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

func (*generatedWebProjectsHandlerStub) GetProject(context.Context, string, int64) WebResponse {
	return WebResponse{
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

func (*generatedWebProjectsHandlerStub) ArchiveProject(context.Context, string, int64) WebResponse {
	return WebResponse{StatusCode: http.StatusOK, Body: map[string]any{"id": 42}}
}

func (*generatedWebProjectsHandlerStub) RestoreProject(context.Context, string, int64) WebResponse {
	return WebResponse{StatusCode: http.StatusOK, Body: map[string]any{"id": 42}}
}

func (*generatedWebProjectsHandlerStub) PinProject(context.Context, string, int64) WebResponse {
	return WebResponse{StatusCode: http.StatusOK, Body: map[string]any{"id": 42}}
}

func (*generatedWebProjectsHandlerStub) UnpinProject(context.Context, string, int64) WebResponse {
	return WebResponse{StatusCode: http.StatusOK, Body: map[string]any{"id": 42}}
}
