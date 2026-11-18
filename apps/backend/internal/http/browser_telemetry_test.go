package httpapp

import (
	"bytes"
	"io/fs"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/labstack/echo/v5"
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
)

func TestBrowserTelemetryHTMLIsEscapedAndHasCorrectLength(t *testing.T) {
	original := []byte(`<html><head><script type="application/json" id="opentickly-telemetry">
      {}
    </script></head><body>app</body></html>`)
	files := fstest.MapFS{"index.html": &fstest.MapFile{Data: original}}
	for _, config := range []webapi.BrowserSentryConfig{{}, {Dsn: "https://public@example.invalid/1", Release: `</script><script>window.injected=true</script>`, Environment: "production"}} {
		wrapped := BrowserTelemetryFiles(files, config)
		content, err := fs.ReadFile(wrapped, "index.html")
		if err != nil {
			t.Fatal(err)
		}
		if bytes.Contains(content, []byte(`<script>window.injected`)) || strings.Count(string(content), "</script>") != 1 {
			t.Fatal("HTML script boundary escaped")
		}
		info, err := fs.Stat(wrapped, "index.html")
		if err != nil || info.Size() != int64(len(content)) {
			t.Fatal("injected file length mismatch")
		}
		e := echo.New()
		e.GET("/*", newStaticFallbackHandler(wrapped))
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, httptest.NewRequest("GET", "/timer", nil))
		if rec.Code != 200 || !bytes.Equal(rec.Body.Bytes(), content) {
			t.Fatal("actual HTML response truncated configuration")
		}
	}
}
