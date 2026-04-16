// Package buildinfo is the canonical place the backend exposes its compiled
// version string. The value is injected by apps/backend/main.go via ldflags
// (`-X main.version=...`) and mirrored here at startup so feature packages
// can read it without importing main.
package buildinfo

// Version is set by apps/backend/main.go after parsing the ldflags-injected
// build tag. Falls back to "dev" for local/unreleased builds.
var Version = "dev"
