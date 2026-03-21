package httpapp

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestGeneratedWave1WebClientsRoutesRejectInvalidQueryAndBody(t *testing.T) {
	server := echo.New()
	registerGeneratedWave1WebClientsRoutes(server, &generatedWave1WebClientsHandlerStub{})

	for _, tc := range []struct {
		method string
		path   string
		body   string
	}{
		{
			method: http.MethodGet,
			path:   "/web/v1/clients?workspace_id=not-a-number",
		},
		{
			method: http.MethodPost,
			path:   "/web/v1/clients",
			body:   `{}`,
		},
		{
			method: http.MethodPost,
			path:   "/web/v1/clients",
			body:   `{"workspace_id":"not-a-number","name":"Client"}`,
		},
		{
			method: http.MethodPost,
			path:   "/web/v1/clients",
			body:   `{"workspace_id":1}`,
		},
		{
			method: http.MethodPost,
			path:   "/web/v1/clients",
			body:   `{"name":"Client"}`,
		},
		{
			method: http.MethodPost,
			path:   "/web/v1/clients",
			body:   `{"workspace_id":1,"name":"   "}`,
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

func TestGeneratedWave1WebClientsRoutesDecodeListQuery(t *testing.T) {
	server := echo.New()
	handler := &generatedWave1WebClientsHandlerStub{}
	registerGeneratedWave1WebClientsRoutes(server, handler)

	request := httptest.NewRequest(http.MethodGet, "/web/v1/clients?workspace_id=42", nil)
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
}

type generatedWave1WebClientsHandlerStub struct {
	listRequest *GeneratedListClientsRequest
}

func (stub *generatedWave1WebClientsHandlerStub) ListClients(
	_ context.Context,
	_ string,
	request GeneratedListClientsRequest,
) Wave1Response {
	stub.listRequest = &request
	return Wave1Response{
		StatusCode: http.StatusOK,
		Body: map[string]any{
			"clients": []any{},
		},
	}
}

func (*generatedWave1WebClientsHandlerStub) CreateClient(
	context.Context,
	string,
	CreateClientRequestBody,
) Wave1Response {
	return Wave1Response{
		StatusCode: http.StatusCreated,
		Body: map[string]any{
			"id":           42,
			"name":         "Client",
			"workspace_id": 1,
			"active":       true,
		},
	}
}
