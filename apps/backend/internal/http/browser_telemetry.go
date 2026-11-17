package httpapp

import (
	"bytes"
	"encoding/json"
	"io/fs"
	"regexp"
	"time"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
)

type browserTelemetryFiles struct {
	fs.FS
	html []byte
}
type browserIndexInfo struct {
	fs.FileInfo
	size int64
}

func (i browserIndexInfo) Size() int64        { return i.size }
func (i browserIndexInfo) ModTime() time.Time { return time.Time{} }

type browserIndexFile struct {
	*bytes.Reader
	info fs.FileInfo
}

func (f browserIndexFile) Stat() (fs.FileInfo, error) { return f.info, nil }
func (f browserIndexFile) Close() error               { return nil }
func (files browserTelemetryFiles) Open(name string) (fs.File, error) {
	if name == "index.html" {
		info, err := fs.Stat(files.FS, name)
		if err != nil {
			return nil, err
		}
		return browserIndexFile{bytes.NewReader(files.html), browserIndexInfo{info, int64(len(files.html))}}, nil
	}
	return files.FS.Open(name)
}

// BrowserTelemetryFiles embeds the already validated public configuration in the SPA shell.
var browserTelemetryMarker = regexp.MustCompile(`<script type="application/json" id="opentickly-telemetry">\s*\{\s*\}\s*</script>`)

func BrowserTelemetryFiles(files fs.FS, config webapi.BrowserSentryConfig) fs.FS {
	html, err := fs.ReadFile(files, "index.html")
	if err != nil {
		return files
	}
	payload, err := json.Marshal(config)
	if err != nil {
		return files
	}
	script := append([]byte(`<script type="application/json" id="opentickly-telemetry">`), payload...)
	script = append(script, []byte(`</script>`)...)
	html = browserTelemetryMarker.ReplaceAllLiteral(html, script)
	return browserTelemetryFiles{FS: files, html: html}
}
