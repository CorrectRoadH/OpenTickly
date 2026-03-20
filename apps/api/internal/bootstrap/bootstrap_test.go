package bootstrap

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"testing"

	"opentoggl/backend/internal/platform"
)

func TestNewAppBuildsWave0Runtime(t *testing.T) {
	app, err := NewApp(Config{
		ServiceName: "opentoggl-api",
		Server: ServerConfig{
			ListenAddress: ":0",
		},
		Database: DatabaseConfig{
			PrimaryDSN: "postgres://wave0@localhost/opentoggl",
		},
		Redis: RedisConfig{
			Address: "redis://127.0.0.1:6379/0",
		},
	})
	if err != nil {
		t.Fatalf("NewApp returned error: %v", err)
	}

	var _ platform.Services = app.Platform

	if app.HTTP == nil {
		t.Fatal("expected HTTP runtime to be wired")
	}

	if got := app.Platform.Database.PrimaryDSN(); got != "postgres://wave0@localhost/opentoggl" {
		t.Fatalf("expected database config to flow into platform handle, got %q", got)
	}

	if got := app.Platform.Redis.Address(); got != "redis://127.0.0.1:6379/0" {
		t.Fatalf("expected redis config to flow into platform client, got %q", got)
	}

	if got := app.Platform.FileStore.Namespace(); got != "opentoggl" {
		t.Fatalf("expected default filestore namespace, got %q", got)
	}

	if got := app.Platform.Jobs.QueueName(); got != "default" {
		t.Fatalf("expected default job queue name, got %q", got)
	}

	app.Platform.FileStore.Put("wave0/health.txt", []byte("ok"))
	stored, ok := app.Platform.FileStore.Get("wave0/health.txt")
	if !ok || string(stored) != "ok" {
		t.Fatalf("expected filestore to round-trip bytes, got %q %v", string(stored), ok)
	}

	if len(app.Modules) != 10 {
		t.Fatalf("expected 10 business modules, got %d", len(app.Modules))
	}

	handled := false
	if err := app.Platform.Jobs.Register(platform.JobDefinition{
		Name: "wave0.bootstrap.smoke",
		Run: func(ctx context.Context, job platform.Job) error {
			handled = job.Name == "wave0.bootstrap.smoke"
			return nil
		},
	}); err != nil {
		t.Fatalf("expected bootstrapped job runner to accept a valid job: %v", err)
	}

	if err := app.Platform.Jobs.RunOnce(context.Background(), platform.Job{Name: "wave0.bootstrap.smoke"}); err != nil {
		t.Fatalf("expected bootstrapped job runner to execute registered job: %v", err)
	}

	if !handled {
		t.Fatal("expected bootstrapped job runner to execute shared platform handler")
	}

	for _, path := range []string{"/healthz", "/readyz"} {
		request := httptest.NewRequest(http.MethodGet, path, nil)
		recorder := httptest.NewRecorder()

		app.HTTP.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected %s to return 200, got %d", path, recorder.Code)
		}

		var response struct {
			Service string   `json:"service"`
			Status  string   `json:"status"`
			Modules []string `json:"modules"`
		}
		if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
			t.Fatalf("expected %s response to be valid json: %v", path, err)
		}

		if response.Service != "opentoggl-api" {
			t.Fatalf("expected service name in %s response, got %q", path, response.Service)
		}

		if response.Status != "ok" {
			t.Fatalf("expected %s status ok, got %q", path, response.Status)
		}

		if len(response.Modules) != 10 {
			t.Fatalf("expected %s response to expose all modules, got %d", path, len(response.Modules))
		}
	}
}

// This guards the Wave 0 composition boundary: apps/api may compose the
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
