package bootstrap

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestNewAppFromEnvironmentFailsWhenEnvLocalMissing(t *testing.T) {
	repoRoot := t.TempDir()
	if err := os.WriteFile(filepath.Join(repoRoot, ".env"), []byte(strings.Join([]string{
		"PORT=8080",
		"DATABASE_URL=postgres://opentoggl@localhost:5432/opentoggl",
		"REDIS_URL=redis://127.0.0.1:6379/0",
	}, "\n")), 0o644); err != nil {
		t.Fatalf("write .env: %v", err)
	}
	withWorkingDirectory(t, repoRoot)

	_, err := NewAppFromEnvironment(nil)
	if err == nil {
		t.Fatal("expected startup to fail when .env.local is missing")
	}
	if !strings.Contains(err.Error(), "missing required repo-root .env.local") {
		t.Fatalf("expected missing .env.local error, got %v", err)
	}
}

func TestNewAppFromEnvironmentIgnoresDotEnvWhenEnvLocalPresent(t *testing.T) {
	repoRoot := t.TempDir()
	if err := os.WriteFile(filepath.Join(repoRoot, ".env"), []byte(strings.Join([]string{
		"PORT=9999",
		"DATABASE_URL=postgres://wrong@localhost:5432/wrong",
		"REDIS_URL=redis://127.0.0.1:6390/9",
	}, "\n")), 0o644); err != nil {
		t.Fatalf("write .env: %v", err)
	}
	if err := os.WriteFile(filepath.Join(repoRoot, ".env.local"), []byte(strings.Join([]string{
		"PORT=8080",
		"DATABASE_URL=postgres://opentoggl@localhost:5432/opentoggl",
		"REDIS_URL=redis://127.0.0.1:6379/0",
	}, "\n")), 0o644); err != nil {
		t.Fatalf("write .env.local: %v", err)
	}
	withWorkingDirectory(t, repoRoot)

	cfg, err := ConfigFromEnvironment(nil)
	if err != nil {
		t.Fatalf("load config from environment: %v", err)
	}
	if cfg.Server.ListenAddress != "0.0.0.0:8080" {
		t.Fatalf("expected .env.local PORT to win, got %q", cfg.Server.ListenAddress)
	}
	if cfg.Database.PrimaryDSN != "postgres://opentoggl@localhost:5432/opentoggl" {
		t.Fatalf("expected .env.local DATABASE_URL to win, got %q", cfg.Database.PrimaryDSN)
	}
	if cfg.Redis.Address != "redis://127.0.0.1:6379/0" {
		t.Fatalf("expected .env.local REDIS_URL to win, got %q", cfg.Redis.Address)
	}
}

func TestNewAppFromEnvironmentFailsWhenDatasourceEnvMissing(t *testing.T) {
	repoRoot := t.TempDir()
	if err := os.WriteFile(filepath.Join(repoRoot, ".env.local"), []byte(strings.Join([]string{
		"PORT=8080",
		"REDIS_URL=redis://127.0.0.1:6379/0",
	}, "\n")), 0o644); err != nil {
		t.Fatalf("write .env.local: %v", err)
	}
	withWorkingDirectory(t, repoRoot)

	_, err := NewAppFromEnvironment(nil)
	if err == nil {
		t.Fatal("expected startup to fail when DATABASE_URL is missing")
	}
	if !strings.Contains(err.Error(), "missing required env DATABASE_URL") {
		t.Fatalf("expected missing DATABASE_URL error, got %v", err)
	}
}

func TestNewAppFailsWithoutExplicitStartupDependencyConfig(t *testing.T) {
	_, err := NewApp(Config{
		ServiceName: "opentoggl-api",
		Server: ServerConfig{
			ListenAddress: "0.0.0.0:8080",
		},
	})
	if err == nil {
		t.Fatal("expected NewApp to reject missing startup datasource config")
	}
	if !strings.Contains(err.Error(), "database.primary_dsn") {
		t.Fatalf("expected missing database.primary_dsn error, got %v", err)
	}
}
