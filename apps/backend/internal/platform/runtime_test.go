package platform

import (
	"context"
	"testing"

	platformconfig "opentoggl/backend/apps/backend/internal/platform/config"
)

func TestNewRuntimeExposesPlatformHandles(t *testing.T) {
	runtime := NewRuntime(platformconfig.RuntimeConfig{
		ServiceName: "opentoggl-api",
		Database: platformconfig.DatabaseConfig{
			PrimaryDSN: "postgres://wave0@localhost/opentoggl",
		},
		Redis: platformconfig.RedisConfig{
			Address: "redis://127.0.0.1:6379/0",
		},
		FileStore: platformconfig.FileStoreConfig{
			Namespace: "wave0",
		},
		Jobs: platformconfig.JobsConfig{
			QueueName: "bootstrap",
		},
	})

	if got := runtime.Database.PrimaryDSN(); got != "postgres://wave0@localhost/opentoggl" {
		t.Fatalf("expected database dsn to stay visible through the platform runtime, got %q", got)
	}

	if got := runtime.Redis.Address(); got != "redis://127.0.0.1:6379/0" {
		t.Fatalf("expected redis address to stay visible through the platform runtime, got %q", got)
	}

	if got := runtime.FileStore.Namespace(); got != "wave0" {
		t.Fatalf("expected filestore namespace to stay visible through the platform runtime, got %q", got)
	}

	if got := runtime.Jobs.QueueName(); got != "bootstrap" {
		t.Fatalf("expected job queue name to stay visible through the platform runtime, got %q", got)
	}

	runtime.FileStore.Put("healthz", []byte("ok"))
	stored, ok := runtime.FileStore.Get("healthz")
	if !ok || string(stored) != "ok" {
		t.Fatalf("expected in-memory filestore to round-trip bytes, got %q %v", string(stored), ok)
	}

	handled := false
	if err := runtime.Jobs.Register(JobDefinition{
		Name: "platform.runtime.smoke",
		Run: func(ctx context.Context, job Job) error {
			handled = job.Name == "platform.runtime.smoke"
			return nil
		},
	}); err != nil {
		t.Fatalf("expected job registration to succeed: %v", err)
	}

	if err := runtime.Jobs.RunOnce(context.Background(), Job{Name: "platform.runtime.smoke"}); err != nil {
		t.Fatalf("expected registered job to run once: %v", err)
	}

	if !handled {
		t.Fatal("expected registered job handler to execute")
	}
}
