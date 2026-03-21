package schema

import (
	"os"
	"path/filepath"
	"testing"
)

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
