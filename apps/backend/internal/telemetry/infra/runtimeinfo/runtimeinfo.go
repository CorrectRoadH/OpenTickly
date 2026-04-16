// Package runtimeinfo provides the telemetry BuildInfo port implementation
// backed by the Go runtime and a version string supplied at composition time.
package runtimeinfo

import "runtime"

// Static is a zero-dep BuildInfo implementation. The version string is wired
// in at app composition time — see apps/backend/main.go.
type Static struct {
	version string
}

func NewStatic(version string) *Static {
	if version == "" {
		version = "dev"
	}
	return &Static{version: version}
}

func (s *Static) Version() string   { return s.version }
func (s *Static) GoVersion() string { return runtime.Version() }
func (s *Static) OS() string        { return runtime.GOOS }
func (s *Static) Arch() string      { return runtime.GOARCH }
