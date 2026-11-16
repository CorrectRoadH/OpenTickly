package web

import (
	"testing"
	"testing/fstest"
)

func TestFrontendSentryReleaseUsesBuildArtifact(t *testing.T) {
	files := fstest.MapFS{"dist/sentry-release.json": {Data: []byte(`{"release":"web@0123456789012345678901234567890123456789"}`)}}
	if got := frontendSentryRelease(files); got != "web@0123456789012345678901234567890123456789" {
		t.Fatalf("unexpected build identity %q", got)
	}
	if got := frontendSentryRelease(fstest.MapFS{}); got != "" {
		t.Fatal("source-only build must have empty identity")
	}
	files["dist/sentry-release.json"].Data = []byte(`{"release":`)
	if got := frontendSentryRelease(files); got != "" {
		t.Fatal("malformed build metadata must fail closed")
	}
}
