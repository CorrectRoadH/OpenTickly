package httpapp

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestGeneratedWave1WebCapabilitiesQuotaRoutesRejectInvalidWorkspaceID(t *testing.T) {
	server := echo.New()
	registerGeneratedWave1WebCapabilitiesQuotaRoutes(server, generatedWave1WebCapabilitiesQuotaHandlerStub{})

	for _, path := range []string{
		"/web/v1/workspaces/not-a-number/capabilities",
		"/web/v1/workspaces/not-a-number/quota",
	} {
		request := httptest.NewRequest(http.MethodGet, path, nil)
		recorder := httptest.NewRecorder()

		server.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusBadRequest {
			t.Fatalf("expected %s to return 400 for invalid workspace id, got %d body=%s", path, recorder.Code, recorder.Body.String())
		}
	}
}

func TestGeneratedWave1WebCapabilitiesQuotaRoutesSetQuotaHeaders(t *testing.T) {
	server := echo.New()
	registerGeneratedWave1WebCapabilitiesQuotaRoutes(server, generatedWave1WebCapabilitiesQuotaHandlerStub{})

	request := httptest.NewRequest(http.MethodGet, "/web/v1/workspaces/42/quota", nil)
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected quota route to return 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if got := recorder.Header().Get("X-OpenToggl-Quota-Remaining"); got != "12" {
		t.Fatalf("expected quota remaining header 12, got %q", got)
	}
	if got := recorder.Header().Get("X-OpenToggl-Quota-Reset-In-Secs"); got != "34" {
		t.Fatalf("expected quota reset header 34, got %q", got)
	}
	if got := recorder.Header().Get("X-OpenToggl-Quota-Total"); got != "56" {
		t.Fatalf("expected quota total header 56, got %q", got)
	}
}

type generatedWave1WebCapabilitiesQuotaHandlerStub struct{}

func (generatedWave1WebCapabilitiesQuotaHandlerStub) GetWorkspaceCapabilities(context.Context, string, int64) Wave1Response {
	return Wave1Response{
		StatusCode: http.StatusOK,
		Body: map[string]any{
			"context": map[string]any{
				"organization_id": int64(7),
				"workspace_id":    int64(42),
				"scope":           "workspace",
			},
			"capabilities": []any{},
		},
	}
}

func (generatedWave1WebCapabilitiesQuotaHandlerStub) GetWorkspaceQuota(context.Context, string, int64) Wave1Response {
	return Wave1Response{
		StatusCode: http.StatusOK,
		Body: map[string]any{
			"organization_id": int64(7),
			"remaining":       12,
			"resets_in_secs":  34,
			"total":           56,
		},
	}
}
