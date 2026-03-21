package bootstrap

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

/*
TestDefaultAppAssemblyReadyzUsesRuntimeProbe pins the default bootstrap
composition root to runtime readiness semantics instead of the HTTP layer's
static readiness fallback.
*/
func TestDefaultAppAssemblyReadyzUsesRuntimeProbe(t *testing.T) {
	app, err := NewApp(Config{
		ServiceName: "opentoggl-api",
		Server: ServerConfig{
			ListenAddress: ":0",
		},
	})
	if err != nil {
		t.Fatalf("NewApp returned error: %v", err)
	}

	request := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	recorder := httptest.NewRecorder()

	app.HTTP.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected default app /readyz to return 503 from runtime readiness probe, got %d", recorder.Code)
	}

	var response struct {
		Status string `json:"status"`
		Checks []struct {
			Name string `json:"name"`
		} `json:"checks"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("expected /readyz response to be valid json: %v", err)
	}

	if response.Status != "error" {
		t.Fatalf("expected runtime readiness status error, got %q", response.Status)
	}

	if len(response.Checks) != 3 {
		t.Fatalf("expected runtime readiness checks, got %d", len(response.Checks))
	}

	if response.Checks[0].Name != "configuration" {
		t.Fatalf("expected runtime readiness configuration check first, got %#v", response.Checks[0])
	}
}
