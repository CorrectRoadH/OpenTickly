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

func TestNewAppFailsWithoutExplicitRuntimeDependencyConfig(t *testing.T) {
	_, err := NewApp(Config{
		ServiceName: "opentoggl-api",
		Server: ServerConfig{
			ListenAddress: "0.0.0.0:8080",
		},
	})
	if err == nil {
		t.Fatal("expected NewApp to reject missing runtime datasource config")
	}
	if !strings.Contains(err.Error(), "database.primary_dsn") {
		t.Fatalf("expected missing database.primary_dsn error, got %v", err)
	}
}
