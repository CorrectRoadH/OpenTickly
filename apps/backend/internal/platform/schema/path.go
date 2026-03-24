package schema

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

const schemaPathEnvironmentKey = "OPENTOGGL_SCHEMA_PATH"

/**
 * Path returns the canonical repository path for the PostgreSQL desired-state
 * schema file so startup/tooling code can discover the same SSOT input.
 */
func Path() string {
	if override := strings.TrimSpace(os.Getenv(schemaPathEnvironmentKey)); override != "" {
		return override
	}

	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		panic("resolve schema package path")
	}

	return filepath.Join(filepath.Dir(currentFile), "schema.sql")
}
