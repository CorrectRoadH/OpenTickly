package httpapp

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestGeneratedWave1WebProjectMembersRoutesRejectInvalidPathIDs(t *testing.T) {
	server := echo.New()
	registerGeneratedWave1WebProjectMembersRoutes(server, generatedWave1WebProjectMembersHandlerStub{})

	for _, tc := range []struct {
		method string
		path   string
		body   string
	}{
		{
			method: http.MethodGet,
			path:   "/web/v1/projects/not-a-number/members",
		},
		{
			method: http.MethodPost,
			path:   "/web/v1/projects/not-a-number/members",
			body:   `{"member_id":42}`,
		},
		{
			method: http.MethodDelete,
			path:   "/web/v1/projects/42/members/not-a-number",
		},
	} {
		request := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
		request.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		recorder := httptest.NewRecorder()

		server.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusBadRequest {
			t.Fatalf("expected %s %s to return 400 for invalid path ids, got %d body=%s", tc.method, tc.path, recorder.Code, recorder.Body.String())
		}
	}
}

func TestGeneratedWave1WebProjectMembersRoutesRejectInvalidGrantBody(t *testing.T) {
	server := echo.New()
	registerGeneratedWave1WebProjectMembersRoutes(server, generatedWave1WebProjectMembersHandlerStub{})

	for _, body := range []string{
		`{}`,
		`{"member_id":"not-a-number"}`,
	} {
		request := httptest.NewRequest(
			http.MethodPost,
			"/web/v1/projects/42/members",
			strings.NewReader(body),
		)
		request.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		recorder := httptest.NewRecorder()

		server.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusBadRequest {
			t.Fatalf("expected invalid project member payload %s to return 400, got %d body=%s", body, recorder.Code, recorder.Body.String())
		}
	}
}

func TestGeneratedWave1WebProjectMembersRoutesDeleteUsesNoContent(t *testing.T) {
	server := echo.New()
	registerGeneratedWave1WebProjectMembersRoutes(server, generatedWave1WebProjectMembersHandlerStub{})

	request := httptest.NewRequest(
		http.MethodDelete,
		"/web/v1/projects/42/members/7",
		nil,
	)
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected delete to return 204, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if recorder.Body.Len() != 0 {
		t.Fatalf("expected delete to return empty body, got %q", recorder.Body.String())
	}
}

type generatedWave1WebProjectMembersHandlerStub struct{}

func (generatedWave1WebProjectMembersHandlerStub) ListProjectMembers(context.Context, string, int64) Wave1Response {
	return Wave1Response{
		StatusCode: http.StatusOK,
		Body: map[string]any{
			"members": []any{},
		},
	}
}

func (generatedWave1WebProjectMembersHandlerStub) GrantProjectMember(
	context.Context,
	string,
	int64,
	GrantProjectMemberRequestBody,
) Wave1Response {
	return Wave1Response{
		StatusCode: http.StatusCreated,
		Body: map[string]any{
			"project_id": 42,
			"member_id":  7,
			"role":       "member",
		},
	}
}

func (generatedWave1WebProjectMembersHandlerStub) RevokeProjectMember(context.Context, string, int64, int64) Wave1Response {
	return Wave1Response{StatusCode: http.StatusNoContent}
}
