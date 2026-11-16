package bootstrap

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	platformconfig "opentoggl/backend/apps/backend/internal/platform/config"

	"github.com/labstack/echo/v4"
)

func TestBrowserTelemetryAnonymousConfig(t *testing.T) {
	const dsn = "https://publickey@o123.ingest.us.sentry.io/456"
	for _, tc := range []struct {
		name, dsn, environment, release string
		enabled                         bool
	}{
		{"official", dsn, "production", "web@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", true},
		{"self-hosted", "", "production", "web@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", false},
		{"private-key", "https://public:secret@o123.ingest.sentry.io/456", "production", "web@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", false},
		{"query", dsn + "?secret=sentinel", "production", "web@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", false},
		{"http", strings.Replace(dsn, "https:", "http:", 1), "production", "web@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			config := publicBrowserTelemetry(platformconfig.BrowserSentryConfig{DSN: tc.dsn, Environment: tc.environment}, tc.release)
			routes, err := newWebRoutes(&routeHandlers{browserSentry: config})
			if err != nil {
				t.Fatal(err)
			}
			e := echo.New()
			routes(e)
			recorder := httptest.NewRecorder()
			e.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/web/v1/telemetry/config", nil))
			if recorder.Code != http.StatusOK || recorder.Header().Get("Cache-Control") != "no-store" {
				t.Fatalf("status/cache: %d %q", recorder.Code, recorder.Header().Get("Cache-Control"))
			}
			var got webapi.BrowserTelemetryConfig
			decoder := json.NewDecoder(recorder.Body)
			decoder.DisallowUnknownFields()
			if err := decoder.Decode(&got); err != nil {
				t.Fatal(err)
			}
			if tc.enabled {
				if got.Sentry.Dsn != dsn || got.Sentry.Release != tc.release || got.Sentry.Environment != tc.environment {
					t.Fatal("configuration did not match build identity")
				}
			} else if got.Sentry != (webapi.BrowserSentryConfig{}) {
				t.Fatal("invalid or absent configuration must return empty fields")
			}
		})
	}
}

func TestBrowserTelemetryDSNAloneEnables(t *testing.T) {
	const dsn = "https://publickey@o123.ingest.us.sentry.io/456"
	for _, input := range []struct{ environment, release string }{{"", ""}, {"production\nsentinel", "api@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}} {
		got := publicBrowserTelemetry(platformconfig.BrowserSentryConfig{DSN: dsn, Environment: input.environment}, input.release)
		if got.Dsn != dsn || got.Environment != "production" || got.Release != "" {
			t.Fatal("DSN alone must enable, with safe metadata defaults")
		}
	}
}
