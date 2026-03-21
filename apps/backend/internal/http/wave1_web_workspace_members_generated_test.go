package httpapp

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestGeneratedWave1WebWorkspaceMembersRoutesRejectInvalidWorkspaceID(t *testing.T) {
	server := echo.New()
	registerGeneratedWave1WebWorkspaceMembersRoutes(server, generatedWave1WebWorkspaceMembersHandlerStub{})

	for _, tc := range []struct {
		method string
		path   string
		body   string
	}{
		{
			method: http.MethodGet,
			path:   "/web/v1/workspaces/not-a-number/members",
		},
		{
			method: http.MethodPost,
			path:   "/web/v1/workspaces/not-a-number/members/invitations",
			body:   `{"email":"member@example.com"}`,
		},
	} {
		request := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
		request.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		recorder := httptest.NewRecorder()

		server.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusBadRequest {
			t.Fatalf("expected %s %s to return 400 for invalid workspace id, got %d body=%s", tc.method, tc.path, recorder.Code, recorder.Body.String())
		}
	}
}

func TestGeneratedWave1WebWorkspaceMembersRoutesRejectInvalidInvitationBody(t *testing.T) {
	server := echo.New()
	registerGeneratedWave1WebWorkspaceMembersRoutes(server, generatedWave1WebWorkspaceMembersHandlerStub{})

	for _, body := range []string{
		`{}`,
		`{"email":"not-an-email"}`,
	} {
		request := httptest.NewRequest(
			http.MethodPost,
			"/web/v1/workspaces/42/members/invitations",
			strings.NewReader(body),
		)
		request.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		recorder := httptest.NewRecorder()

		server.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusBadRequest {
			t.Fatalf("expected invalid invitation payload %s to return 400, got %d body=%s", body, recorder.Code, recorder.Body.String())
		}
	}
}

type generatedWave1WebWorkspaceMembersHandlerStub struct{}

func (generatedWave1WebWorkspaceMembersHandlerStub) ListWorkspaceMembers(context.Context, string, int64) Wave1Response {
	return Wave1Response{
		StatusCode: http.StatusOK,
		Body: map[string]any{
			"members": []any{},
		},
	}
}

func (generatedWave1WebWorkspaceMembersHandlerStub) InviteWorkspaceMember(
	context.Context,
	string,
	int64,
	InviteWorkspaceMemberRequestBody,
) Wave1Response {
	return Wave1Response{
		StatusCode: http.StatusCreated,
		Body: map[string]any{},
	}
}
