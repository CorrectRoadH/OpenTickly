package bootstrap

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestApplySchemaFromEnvironmentRequiresDatabaseURL(t *testing.T) {
	err := ApplySchemaFromEnvironment(nil, nil, func(string) string { return "" })
	if err == nil {
		t.Fatal("expected missing DATABASE_URL error")
	}
	if !strings.Contains(err.Error(), "missing required env DATABASE_URL") {
		t.Fatalf("expected missing DATABASE_URL error, got %v", err)
	}
}

func TestApplySchemaFromEnvironmentExecutesPGSchemaApply(t *testing.T) {
	tempDir := t.TempDir()
	argsPath := filepath.Join(tempDir, "args.txt")
	envPath := filepath.Join(tempDir, "env.txt")
	scriptPath := filepath.Join(tempDir, "pgschema")
	schemaPath := filepath.Join(tempDir, "schema.sql")

	script := strings.Join([]string{
		"#!/bin/sh",
		"printf '%s\n' \"$@\" > \"$CAPTURE_ARGS_PATH\"",
		"{",
		"  printf 'PGHOST=%s\n' \"$PGHOST\"",
		"  printf 'PGPORT=%s\n' \"$PGPORT\"",
		"  printf 'PGDATABASE=%s\n' \"$PGDATABASE\"",
		"  printf 'PGUSER=%s\n' \"$PGUSER\"",
		"  printf 'PGPASSWORD=%s\n' \"$PGPASSWORD\"",
		"  printf 'PGSSLMODE=%s\n' \"$PGSSLMODE\"",
		"  printf 'PGSCHEMA_PLAN_HOST=%s\n' \"$PGSCHEMA_PLAN_HOST\"",
		"  printf 'PGSCHEMA_PLAN_PORT=%s\n' \"$PGSCHEMA_PLAN_PORT\"",
		"  printf 'PGSCHEMA_PLAN_DB=%s\n' \"$PGSCHEMA_PLAN_DB\"",
		"  printf 'PGSCHEMA_PLAN_USER=%s\n' \"$PGSCHEMA_PLAN_USER\"",
		"  printf 'PGSCHEMA_PLAN_PASSWORD=%s\n' \"$PGSCHEMA_PLAN_PASSWORD\"",
		"} > \"$CAPTURE_ENV_PATH\"",
	}, "\n")
	if err := os.WriteFile(scriptPath, []byte(script), 0o755); err != nil {
		t.Fatalf("write fake pgschema script: %v", err)
	}
	if err := os.WriteFile(schemaPath, []byte("-- desired state\n"), 0o644); err != nil {
		t.Fatalf("write schema file: %v", err)
	}

	t.Setenv("PATH", tempDir+string(os.PathListSeparator)+os.Getenv("PATH"))
	t.Setenv("CAPTURE_ARGS_PATH", argsPath)
	t.Setenv("CAPTURE_ENV_PATH", envPath)
	t.Setenv("OPENTOGGL_SCHEMA_PATH", schemaPath)

	err := ApplySchemaFromEnvironment(nil, nil, func(key string) string {
		if key == "DATABASE_URL" {
			return "postgres://alice:secret@db.internal:5432/opentoggl?sslmode=require"
		}
		return ""
	})
	if err != nil {
		t.Fatalf("ApplySchemaFromEnvironment returned error: %v", err)
	}

	argsOutput, err := os.ReadFile(argsPath)
	if err != nil {
		t.Fatalf("read args output: %v", err)
	}
	gotArgs := strings.Split(strings.TrimSpace(string(argsOutput)), "\n")
	wantArgs := []string{"apply", "--file", schemaPath, "--auto-approve"}
	if len(gotArgs) != len(wantArgs) {
		t.Fatalf("expected %d args, got %#v", len(wantArgs), gotArgs)
	}
	for index, want := range wantArgs {
		if gotArgs[index] != want {
			t.Fatalf("expected arg %d to be %q, got %#v", index, want, gotArgs)
		}
	}

	envOutput, err := os.ReadFile(envPath)
	if err != nil {
		t.Fatalf("read env output: %v", err)
	}

	environment := map[string]string{}
	for _, entry := range strings.Split(strings.TrimSpace(string(envOutput)), "\n") {
		key, value, found := strings.Cut(entry, "=")
		if found {
			environment[key] = value
		}
	}

	if environment["PGHOST"] != "db.internal" {
		t.Fatalf("expected PGHOST %q, got %q", "db.internal", environment["PGHOST"])
	}
	if environment["PGSSLMODE"] != "require" {
		t.Fatalf("expected PGSSLMODE %q, got %q", "require", environment["PGSSLMODE"])
	}
	if environment["PGSCHEMA_PLAN_HOST"] != "db.internal" {
		t.Fatalf("expected PGSCHEMA_PLAN_HOST %q, got %q", "db.internal", environment["PGSCHEMA_PLAN_HOST"])
	}
	if environment["PGSCHEMA_PLAN_DB"] != "opentoggl" {
		t.Fatalf("expected PGSCHEMA_PLAN_DB %q, got %q", "opentoggl", environment["PGSCHEMA_PLAN_DB"])
	}
}
