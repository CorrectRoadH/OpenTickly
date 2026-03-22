package bootstrap

import (
	"encoding/json"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestNewAppLogsStartupSuccessDiagnostics(t *testing.T) {
	var logs strings.Builder
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&logs, nil)))
	t.Cleanup(func() {
		slog.SetDefault(previousLogger)
	})

	_, err := NewApp(Config{
		ServiceName: "opentoggl-api",
		Server: ServerConfig{
			ListenAddress: "0.0.0.0:8080",
		},
		Database: DatabaseConfig{
			PrimaryDSN: "postgres://opentoggl@db.internal:5432/opentoggl",
		},
		Redis: RedisConfig{
			Address: "redis://cache.internal:6379/0",
		},
	})
	if err != nil {
		t.Fatalf("NewApp returned error: %v", err)
	}

	record := findLogRecord(t, logs.String(), "backend startup succeeded")
	if record["service"] != "opentoggl-api" {
		t.Fatalf("expected startup success log service %q, got %#v", "opentoggl-api", record["service"])
	}
	if record["listen_address"] != "0.0.0.0:8080" {
		t.Fatalf("expected startup success log listen_address %q, got %#v", "0.0.0.0:8080", record["listen_address"])
	}
	if record["postgres_target"] != "db.internal:5432" {
		t.Fatalf("expected startup success log postgres_target %q, got %#v", "db.internal:5432", record["postgres_target"])
	}
	if record["redis_target"] != "cache.internal:6379" {
		t.Fatalf("expected startup success log redis_target %q, got %#v", "cache.internal:6379", record["redis_target"])
	}
	if record["phase"] != "startup_success" {
		t.Fatalf("expected startup success log phase %q, got %#v", "startup_success", record["phase"])
	}
	if record["healthz_path"] != "/healthz" {
		t.Fatalf("expected startup success log healthz_path %q, got %#v", "/healthz", record["healthz_path"])
	}
	if record["readyz_path"] != "/readyz" {
		t.Fatalf("expected startup success log readyz_path %q, got %#v", "/readyz", record["readyz_path"])
	}
}

func TestNewAppFromEnvironmentLogsDependencyFailureDiagnostics(t *testing.T) {
	var logs strings.Builder
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&logs, nil)))
	t.Cleanup(func() {
		slog.SetDefault(previousLogger)
	})

	repoRoot := t.TempDir()
	if err := os.WriteFile(filepath.Join(repoRoot, ".env.local"), []byte(strings.Join([]string{
		"PORT=8080",
		"DATABASE_URL=postgres://opentoggl@127.0.0.1:1/opentoggl",
		"REDIS_URL=redis://127.0.0.1:6379/0",
	}, "\n")), 0o644); err != nil {
		t.Fatalf("write .env.local: %v", err)
	}
	withWorkingDirectory(t, repoRoot)

	_, err := NewAppFromEnvironment(nil)
	if err == nil {
		t.Fatal("expected NewAppFromEnvironment to fail when postgres is unreachable")
	}

	record := findLogRecord(t, logs.String(), "backend startup dependency check failed")
	if record["service"] != "opentoggl-api" {
		t.Fatalf("expected dependency failure log service %q, got %#v", "opentoggl-api", record["service"])
	}
	if record["listen_address"] != "0.0.0.0:8080" {
		t.Fatalf("expected dependency failure log listen_address %q, got %#v", "0.0.0.0:8080", record["listen_address"])
	}
	if record["postgres_target"] != "127.0.0.1:1" {
		t.Fatalf("expected dependency failure log postgres_target %q, got %#v", "127.0.0.1:1", record["postgres_target"])
	}
	if record["redis_target"] != "127.0.0.1:6379" {
		t.Fatalf("expected dependency failure log redis_target %q, got %#v", "127.0.0.1:6379", record["redis_target"])
	}
	if record["phase"] != "startup_dependency_failure" {
		t.Fatalf(
			"expected dependency failure log phase %q, got %#v",
			"startup_dependency_failure",
			record["phase"],
		)
	}
	if record["dependency_probe_timeout"] != "3s" {
		t.Fatalf(
			"expected dependency failure log dependency_probe_timeout %q, got %#v",
			"3s",
			record["dependency_probe_timeout"],
		)
	}
	if record["error"] == nil || !strings.Contains(record["error"].(string), "postgres") {
		t.Fatalf("expected dependency failure log error to mention postgres, got %#v", record["error"])
	}
}

func findLogRecord(t *testing.T, output string, message string) map[string]any {
	t.Helper()

	for _, line := range strings.Split(strings.TrimSpace(output), "\n") {
		if strings.TrimSpace(line) == "" {
			continue
		}

		var record map[string]any
		if err := json.Unmarshal([]byte(line), &record); err != nil {
			t.Fatalf("expected log output to be valid json, got %q: %v", line, err)
		}

		if record["msg"] == message {
			return record
		}
	}

	t.Fatalf("expected log record %q in %q", message, output)
	return nil
}

func withWorkingDirectory(t *testing.T, next string) {
	t.Helper()

	previous, err := os.Getwd()
	if err != nil {
		t.Fatalf("get current directory: %v", err)
	}
	if err := os.Chdir(next); err != nil {
		t.Fatalf("change directory to %s: %v", next, err)
	}
	t.Cleanup(func() {
		if err := os.Chdir(previous); err != nil {
			t.Fatalf("restore directory to %s: %v", previous, err)
		}
	})
}
