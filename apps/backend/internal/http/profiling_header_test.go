package httpapp

import (
	"github.com/labstack/echo/v4"
	"net/http/httptest"
	"testing"
	"testing/fstest"
)

func TestHTMLProfilingPolicyPreservesExistingDirectives(t *testing.T) {
	files := fstest.MapFS{"index.html": {Data: []byte("<html>test</html>")}}
	for _, path := range []string{"/", "/index.html", "/timer"} {
		e := echo.New()
		req := httptest.NewRequest("GET", path, nil)
		rec := httptest.NewRecorder()
		ctx := e.NewContext(req, rec)
		rec.Header().Set("Document-Policy", "sync-xhr=?0")
		if err := newStaticFallbackHandler(files)(ctx); err != nil {
			t.Fatal(err)
		}
		if got := rec.Header().Get("Document-Policy"); got != "sync-xhr=?0, js-profiling" {
			t.Fatal(got)
		}
	}
}
