package monitoring

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/labstack/echo/v5"
)

func TestHTTPRootStaticNamesAndStatus(t *testing.T) {
	transport := &captureTransport{}
	options := Options("https://public@example.invalid/1", "production", "api@test", transport)
	options.TracesSampleRate = 1
	client, err := sentry.NewClient(options)
	if err != nil {
		t.Fatal(err)
	}
	defer client.Close()
	e := echo.New()
	e.Use(Middleware(client))
	e.GET("/healthz", func(c *echo.Context) error { return c.NoContent(503) })
	e.GET("/api/v9/workspaces/:workspace_id/projects", func(c *echo.Context) error { return echo.ErrForbidden })
	e.GET("/static/:name", func(c *echo.Context) error { return c.NoContent(200) })
	tests := []struct {
		path, name string
		status     sentry.SpanStatus
	}{
		{"/healthz", "health.check", sentry.SpanStatusInternalError},
		{"/api/v9/workspaces/SENSITIVE/projects?name=SENSITIVE", "project.list", sentry.SpanStatusPermissionDenied},
		{"/static/SENSITIVE", "http.server", sentry.SpanStatusOK},
	}
	for _, test := range tests {
		e.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, test.path, nil))
	}
	client.Flush(time.Second)
	found := 0
	for _, event := range transport.events {
		if event.Type != "transaction" {
			continue
		}
		if event.Transaction != tests[found].name || event.Contexts["trace"]["status"] != tests[found].status {
			t.Fatalf("unexpected root %s %v", event.Transaction, event.Contexts["trace"]["status"])
		}
		found++
	}
	if found != len(tests) {
		t.Fatalf("roots %d", found)
	}
}
