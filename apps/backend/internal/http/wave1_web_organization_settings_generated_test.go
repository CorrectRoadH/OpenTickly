package httpapp

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"opentoggl/backend/apps/backend/internal/web"
)

func TestWave1WebOrganizationSettingsRoutesRejectMissingRequiredFieldsFromOpenAPI(t *testing.T) {
	server := NewServer(
		web.NewHealthSnapshot("opentoggl", []string{"identity"}),
		NewWave1WebRouteRegistrar(NewWave1WebHandlers()),
	)
	sessionCookie := mustRegisterWave1Session(t, server)

	request := httptest.NewRequest(
		http.MethodPatch,
		"/web/v1/organizations/1/settings",
		strings.NewReader(`{"organization":{}}`),
	)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Cookie", sessionCookie)
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected generated organization settings boundary to reject missing required fields with 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}
