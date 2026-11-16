package web

import (
	"encoding/json"
	"io/fs"
)

// FrontendSentryRelease reads the identity produced by the website build,
// rather than the independently versioned Go binary or runtime environment.
func FrontendSentryRelease() string {
	return frontendSentryRelease(embeddedStaticFiles)
}

func frontendSentryRelease(files fs.FS) string {
	data, err := fs.ReadFile(files, "dist/sentry-release.json")
	if err != nil || len(data) > 512 {
		return ""
	}
	var metadata struct {
		Release string `json:"release"`
	}
	if json.Unmarshal(data, &metadata) != nil {
		return ""
	}
	return metadata.Release
}
