package schema

import (
	"path/filepath"
	"runtime"
)

/**
 * Path returns the canonical repository path for the PostgreSQL desired-state
 * schema file so startup/tooling code can discover the same SSOT input.
 */
func Path() string {
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		panic("resolve schema package path")
	}

	return filepath.Join(filepath.Dir(currentFile), "schema.sql")
}
