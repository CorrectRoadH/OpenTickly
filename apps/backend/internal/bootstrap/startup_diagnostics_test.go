package bootstrap

import (
	"encoding/json"
	"log/slog"
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
}

func TestNewAppFromEnvironmentLogsDependencyFailureDiagnostics(t *testing.T) {
	var logs strings.Builder
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&logs, nil)))
	t.Cleanup(func() {
		slog.SetDefault(previousLogger)
	})

	_, err := NewAppFromEnvironment(func(key string) string {
		switch key {
		case "PORT":
			return "8080"
		case "DATABASE_URL":
			return "postgres://opentoggl@127.0.0.1:1/opentoggl"
		case "REDIS_URL":
			return "redis://127.0.0.1:6379/0"
		default:
			return ""
		}
	})
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
