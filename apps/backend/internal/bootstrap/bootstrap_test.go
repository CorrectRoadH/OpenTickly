package bootstrap

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"testing"
)

func TestNewAppExposesWave0HealthRuntime(t *testing.T) {
	app, err := NewApp(Config{
		ServiceName: "opentoggl-api",
		Server: ServerConfig{
			ListenAddress: ":0",
		},
	})
	if err != nil {
		t.Fatalf("NewApp returned error: %v", err)
	}

	if app.HTTP == nil {
		t.Fatal("expected HTTP runtime to be wired")
	}

	if len(app.Modules) != 10 {
		t.Fatalf("expected 10 business modules, got %d", len(app.Modules))
	}

	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	recorder := httptest.NewRecorder()

	app.HTTP.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected /healthz to return 200, got %d", recorder.Code)
	}

	var response struct {
		Service string   `json:"service"`
		Status  string   `json:"status"`
		Modules []string `json:"modules"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("expected /healthz response to be valid json: %v", err)
	}

	if response.Service != "opentoggl-api" {
		t.Fatalf("expected service name in /healthz response, got %q", response.Service)
	}

	if response.Status != "ok" {
		t.Fatalf("expected /healthz status ok, got %q", response.Status)
	}

	if len(response.Modules) != 10 {
		t.Fatalf("expected /healthz response to expose all modules, got %d", len(response.Modules))
	}
}

// This guards the Wave 0 composition boundary: apps/backend may compose the
// documented business modules, but it must not quietly gain or lose modules
// while the platform relocation is fixing Go package validity.
func TestDefaultModulesStayAlignedWithWave0Inventory(t *testing.T) {
	t.Helper()

	got := make([]string, 0, len(defaultModules()))
	for _, module := range defaultModules() {
		got = append(got, module.Name)
	}

	want := []string{
		"identity",
		"tenant",
		"membership",
		"catalog",
		"tracking",
		"governance",
		"reports",
		"webhooks",
		"billing",
		"importing",
	}

	if !slices.Equal(got, want) {
		t.Fatalf("expected Wave 0 composition root modules %v, got %v", want, got)
	}
}
