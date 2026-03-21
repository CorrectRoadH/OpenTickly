package schema

import (
	"context"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func TestPrepareReconcileCommandProjectsDatabaseURLIntoPGSchemaInputs(t *testing.T) {
	command, err := PrepareReconcileCommand(ReconcileOptions{
		Mode:        ReconcilePlan,
		DatabaseURL: "postgres://alice:secret@db.internal:5433/opentoggl?sslmode=require",
		BaseEnv: []string{
			"PATH=/usr/bin",
			"PGHOST=stale-host",
			"UNRELATED=value",
		},
	})
	if err != nil {
		t.Fatalf("PrepareReconcileCommand returned error: %v", err)
	}

	if command.Binary != "pgschema" {
		t.Fatalf("expected default binary %q, got %q", "pgschema", command.Binary)
	}
	if command.SchemaPath != Path() {
		t.Fatalf("expected schema path %q, got %q", Path(), command.SchemaPath)
	}
	if !reflect.DeepEqual(command.Args, []string{"plan", "--file", Path()}) {
		t.Fatalf("expected command args %#v, got %#v", []string{"plan", "--file", Path()}, command.Args)
	}

	environment := environmentMap(command.Env)
	for key, want := range map[string]string{
		"PGHOST":     "db.internal",
		"PGPORT":     "5433",
		"PGDATABASE": "opentoggl",
		"PGUSER":     "alice",
		"PGPASSWORD": "secret",
		"PGSSLMODE":  "require",
		"UNRELATED":  "value",
	} {
		if got := environment[key]; got != want {
			t.Fatalf("expected env %s=%q, got %q", key, want, got)
		}
	}
}

func TestPrepareReconcileCommandAddsAutoApproveOnlyForApply(t *testing.T) {
	applyCommand, err := PrepareReconcileCommand(ReconcileOptions{
		Mode:        ReconcileApply,
		DatabaseURL: "host=db.internal port=5434 dbname=opentoggl user=alice password=secret sslmode=disable",
		BaseEnv:     []string{},
		AutoApprove: true,
	})
	if err != nil {
		t.Fatalf("PrepareReconcileCommand returned error: %v", err)
	}

	if !reflect.DeepEqual(applyCommand.Args, []string{"apply", "--file", Path(), "--auto-approve"}) {
		t.Fatalf(
			"expected apply command args %#v, got %#v",
			[]string{"apply", "--file", Path(), "--auto-approve"},
			applyCommand.Args,
		)
	}

	environment := environmentMap(applyCommand.Env)
	if environment["PGPORT"] != "5434" {
		t.Fatalf("expected PGPORT %q, got %q", "5434", environment["PGPORT"])
	}
	if environment["PGSSLMODE"] != "disable" {
		t.Fatalf("expected PGSSLMODE %q, got %q", "disable", environment["PGSSLMODE"])
	}
}

func TestPrepareReconcileCommandRejectsInvalidInputs(t *testing.T) {
	testCases := []struct {
		name    string
		options ReconcileOptions
	}{
		{
			name: "invalid mode",
			options: ReconcileOptions{
				Mode:        "reconcile",
				DatabaseURL: "postgres://alice:secret@db.internal:5432/opentoggl",
			},
		},
		{
			name: "invalid database url",
			options: ReconcileOptions{
				Mode:        ReconcilePlan,
				DatabaseURL: "postgres://%zz",
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			if _, err := PrepareReconcileCommand(testCase.options); err == nil {
				t.Fatal("expected PrepareReconcileCommand to fail")
			}
		})
	}
}

func TestReconcileExecutesPreparedCommand(t *testing.T) {
	tempDir := t.TempDir()
	argsPath := filepath.Join(tempDir, "args.txt")
	envPath := filepath.Join(tempDir, "env.txt")
	scriptPath := filepath.Join(tempDir, "fake-pgschema.sh")

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
		"} > \"$CAPTURE_ENV_PATH\"",
	}, "\n")
	if err := os.WriteFile(scriptPath, []byte(script), 0o755); err != nil {
		t.Fatalf("write fake pgschema script: %v", err)
	}

	err := Reconcile(context.Background(), ReconcileOptions{
		Binary:      scriptPath,
		Mode:        ReconcileApply,
		DatabaseURL: "postgres://alice:secret@db.internal:5432/opentoggl?sslmode=require",
		BaseEnv: []string{
			"CAPTURE_ARGS_PATH=" + argsPath,
			"CAPTURE_ENV_PATH=" + envPath,
		},
		AutoApprove: true,
	})
	if err != nil {
		t.Fatalf("Reconcile returned error: %v", err)
	}

	argsOutput, err := os.ReadFile(argsPath)
	if err != nil {
		t.Fatalf("read args output: %v", err)
	}
	if got := strings.Split(strings.TrimSpace(string(argsOutput)), "\n"); !reflect.DeepEqual(got, []string{"apply", "--file", Path(), "--auto-approve"}) {
		t.Fatalf("expected executed args %#v, got %#v", []string{"apply", "--file", Path(), "--auto-approve"}, got)
	}

	envOutput, err := os.ReadFile(envPath)
	if err != nil {
		t.Fatalf("read env output: %v", err)
	}
	environment := environmentMap(strings.Split(strings.TrimSpace(string(envOutput)), "\n"))
	if environment["PGHOST"] != "db.internal" {
		t.Fatalf("expected executed PGHOST %q, got %q", "db.internal", environment["PGHOST"])
	}
	if environment["PGSSLMODE"] != "require" {
		t.Fatalf("expected executed PGSSLMODE %q, got %q", "require", environment["PGSSLMODE"])
	}
}

func environmentMap(entries []string) map[string]string {
	values := make(map[string]string, len(entries))
	for _, entry := range entries {
		key, value, found := strings.Cut(entry, "=")
		if found {
			values[key] = value
		}
	}
	return values
}
