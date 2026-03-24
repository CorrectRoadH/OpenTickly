package schema

import (
	"os"
	"path/filepath"
	"testing"
)

func TestPathPrefersExplicitEnvironmentOverride(t *testing.T) {
	overridePath := filepath.Join(t.TempDir(), "schema.sql")
	if err := os.WriteFile(overridePath, []byte("-- test schema\n"), 0o644); err != nil {
		t.Fatalf("write override schema: %v", err)
	}

	t.Setenv(schemaPathEnvironmentKey, overridePath)

	if got := Path(); got != overridePath {
		t.Fatalf("expected schema path override %q, got %q", overridePath, got)
	}
}

func TestPathResolvesDesiredStateSchemaFile(t *testing.T) {
	schemaPath := Path()
	if filepath.Base(schemaPath) != "schema.sql" {
		t.Fatalf("expected schema path basename %q, got %q", "schema.sql", filepath.Base(schemaPath))
	}

	info, err := os.Stat(schemaPath)
	if err != nil {
		t.Fatalf("stat schema path %q: %v", schemaPath, err)
	}
	if info.IsDir() {
		t.Fatalf("expected schema path %q to be a file", schemaPath)
	}
}
