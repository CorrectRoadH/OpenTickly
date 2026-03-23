package platform

import (
	"context"
	"testing"

	platformconfig "opentoggl/backend/apps/backend/internal/platform/config"
)

func TestNewHandlesExposePlatformHandles(t *testing.T) {
	handles := NewHandles(platformconfig.StartupConfig{
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

	if got := handles.Database.PrimaryDSN(); got != "postgres://wave0@localhost/opentoggl" {
		t.Fatalf("expected database dsn to stay visible through the platform handles, got %q", got)
	}

	if got := handles.Redis.Address(); got != "redis://127.0.0.1:6379/0" {
		t.Fatalf("expected redis address to stay visible through the platform handles, got %q", got)
	}

	if got := handles.FileStore.Namespace(); got != "wave0" {
		t.Fatalf("expected filestore namespace to stay visible through the platform handles, got %q", got)
	}

	if got := handles.Jobs.QueueName(); got != "bootstrap" {
		t.Fatalf("expected job queue name to stay visible through the platform handles, got %q", got)
	}

	handled := false
	if err := handles.Jobs.Register(JobDefinition{
		Name: "platform.handles.smoke",
		Run: func(ctx context.Context, job Job) error {
			handled = job.Name == "platform.handles.smoke"
			return nil
		},
	}); err != nil {
		t.Fatalf("expected job registration to succeed: %v", err)
	}

	if err := handles.Jobs.RunOnce(context.Background(), Job{Name: "platform.handles.smoke"}); err != nil {
		t.Fatalf("expected registered job to run once: %v", err)
	}

	if !handled {
		t.Fatal("expected registered job handler to execute")
	}
}
