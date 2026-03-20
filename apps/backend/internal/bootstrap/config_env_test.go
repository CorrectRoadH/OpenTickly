package bootstrap

import (
	"os"
	"path/filepath"
	"testing"
)

func TestConfigFromEnvironmentUsesDefaultsWhenVariablesMissing(t *testing.T) {
	cfg := ConfigFromEnvironment(func(string) string { return "" })

	defaults := DefaultConfig()
	if cfg.ServiceName != defaults.ServiceName {
		t.Fatalf("expected default service name %q, got %q", defaults.ServiceName, cfg.ServiceName)
	}
	if cfg.Server.ListenAddress != defaults.Server.ListenAddress {
		t.Fatalf(
			"expected default listen address %q, got %q",
			defaults.Server.ListenAddress,
			cfg.Server.ListenAddress,
		)
	}
	if cfg.Database.PrimaryDSN != defaults.Database.PrimaryDSN {
		t.Fatalf(
			"expected default database dsn %q, got %q",
			defaults.Database.PrimaryDSN,
			cfg.Database.PrimaryDSN,
		)
	}
	if cfg.Redis.Address != defaults.Redis.Address {
		t.Fatalf(
			"expected default redis address %q, got %q",
			defaults.Redis.Address,
			cfg.Redis.Address,
		)
	}
}

func TestConfigFromEnvironmentAppliesRuntimeOverrides(t *testing.T) {
	vars := map[string]string{
		"OPENTOGGL_SERVICE_NAME":        "opentoggl-api-compose",
		"OPENTOGGL_API_LISTEN_ADDRESS":  ":18080",
		"OPENTOGGL_API_DATABASE_DSN":    "postgres://postgres:postgres@postgres:5432/opentoggl?sslmode=disable",
		"OPENTOGGL_API_REDIS_ADDRESS":   "redis://redis:6379/0",
		"OPENTOGGL_FILESTORE_NAMESPACE": "opentoggl-local",
		"OPENTOGGL_JOBS_QUEUE_NAME":     "compose-default",
	}

	cfg := ConfigFromEnvironment(func(key string) string {
		return vars[key]
	})

	if cfg.ServiceName != vars["OPENTOGGL_SERVICE_NAME"] {
		t.Fatalf("expected service name %q, got %q", vars["OPENTOGGL_SERVICE_NAME"], cfg.ServiceName)
	}
	if cfg.Server.ListenAddress != vars["OPENTOGGL_API_LISTEN_ADDRESS"] {
		t.Fatalf("expected listen address %q, got %q", vars["OPENTOGGL_API_LISTEN_ADDRESS"], cfg.Server.ListenAddress)
	}
	if cfg.Database.PrimaryDSN != vars["OPENTOGGL_API_DATABASE_DSN"] {
		t.Fatalf("expected database dsn %q, got %q", vars["OPENTOGGL_API_DATABASE_DSN"], cfg.Database.PrimaryDSN)
	}
	if cfg.Redis.Address != vars["OPENTOGGL_API_REDIS_ADDRESS"] {
		t.Fatalf("expected redis address %q, got %q", vars["OPENTOGGL_API_REDIS_ADDRESS"], cfg.Redis.Address)
	}
	if cfg.FileStore.Namespace != vars["OPENTOGGL_FILESTORE_NAMESPACE"] {
		t.Fatalf(
			"expected filestore namespace %q, got %q",
			vars["OPENTOGGL_FILESTORE_NAMESPACE"],
			cfg.FileStore.Namespace,
		)
	}
	if cfg.Jobs.QueueName != vars["OPENTOGGL_JOBS_QUEUE_NAME"] {
		t.Fatalf("expected queue name %q, got %q", vars["OPENTOGGL_JOBS_QUEUE_NAME"], cfg.Jobs.QueueName)
	}
}

func TestConfigFromEnvironmentReadsRootDotEnvFilesWhenProcessEnvMissing(t *testing.T) {
	tempDir := t.TempDir()
	previousDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("get working directory: %v", err)
	}
	defer func() {
		if restoreErr := os.Chdir(previousDir); restoreErr != nil {
			t.Fatalf("restore working directory: %v", restoreErr)
		}
	}()

	if err := os.Chdir(tempDir); err != nil {
		t.Fatalf("change working directory: %v", err)
	}

	envFile := "OPENTOGGL_SERVICE_NAME=opentoggl-api-dotenv\nOPENTOGGL_API_DATABASE_DSN=postgres://dotenv@localhost/opentoggl\n"
	if err := os.WriteFile(filepath.Join(tempDir, ".env"), []byte(envFile), 0o644); err != nil {
		t.Fatalf("write .env: %v", err)
	}

	localEnvFile := "OPENTOGGL_API_REDIS_ADDRESS=redis://127.0.0.1:6380/0\nOPENTOGGL_FILESTORE_NAMESPACE=opentoggl-local\n"
	if err := os.WriteFile(filepath.Join(tempDir, ".env.local"), []byte(localEnvFile), 0o644); err != nil {
		t.Fatalf("write .env.local: %v", err)
	}

	t.Setenv("OPENTOGGL_SERVICE_NAME", "")
	t.Setenv("OPENTOGGL_API_DATABASE_DSN", "")
	t.Setenv("OPENTOGGL_API_REDIS_ADDRESS", "")
	t.Setenv("OPENTOGGL_FILESTORE_NAMESPACE", "")
	t.Setenv("OPENTOGGL_API_LISTEN_ADDRESS", ":18080")

	cfg := ConfigFromEnvironment(nil)

	if cfg.ServiceName != "opentoggl-api-dotenv" {
		t.Fatalf("expected service name from .env, got %q", cfg.ServiceName)
	}
	if cfg.Database.PrimaryDSN != "postgres://dotenv@localhost/opentoggl" {
		t.Fatalf("expected database dsn from .env, got %q", cfg.Database.PrimaryDSN)
	}
	if cfg.Redis.Address != "redis://127.0.0.1:6380/0" {
		t.Fatalf("expected redis address from .env.local, got %q", cfg.Redis.Address)
	}
	if cfg.FileStore.Namespace != "opentoggl-local" {
		t.Fatalf("expected filestore namespace from .env.local, got %q", cfg.FileStore.Namespace)
	}
	if cfg.Server.ListenAddress != ":18080" {
		t.Fatalf("expected process env to override dotenv files, got %q", cfg.Server.ListenAddress)
	}
}
