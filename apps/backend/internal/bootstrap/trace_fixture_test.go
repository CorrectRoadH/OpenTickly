package bootstrap

import (
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"net/http/httptest"
	httpapp "opentoggl/backend/apps/backend/internal/http"
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	platformconfig "opentoggl/backend/apps/backend/internal/platform/config"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/getsentry/sentry-go"
	"opentoggl/backend/apps/backend/internal/monitoring"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

// TestBrowserTraceFixture exposes only an isolated local fixture. The browser
// test controls its lifetime through /fixture/stop, including schema cleanup.
func TestBrowserTraceFixture(t *testing.T) {
	if os.Getenv("OPENTICKLY_TRACE_FIXTURE") != "1" {
		t.Skip("browser-owned fixture")
	}
	redisURL := os.Getenv("OPENTICKLY_TRACE_REDIS_URL")
	if redisURL == "" {
		t.Fatal("missing isolated Redis fixture")
	}
	db := pgtest.OpenEphemeral(t)
	app, err := NewApp(Config{ServiceName: "trace-fixture", Server: ServerConfig{ListenAddress: ":0"}, Database: DatabaseConfig{PrimaryDSN: db.ConnString()}, Redis: RedisConfig{Address: redisURL}})
	if err != nil {
		t.Fatal(err)
	}
	defer app.Platform.Database.Close()
	defer app.Platform.Cache.Close()
	user := registerAuditUser(t, app)
	var mu sync.Mutex
	var bodies []string
	receiver := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		data, _ := io.ReadAll(r.Body)
		mu.Lock()
		bodies = append(bodies, string(data))
		mu.Unlock()
		w.WriteHeader(http.StatusOK)
	}))
	defer receiver.Close()
	options := monitoring.Options("http://public@"+strings.TrimPrefix(receiver.URL, "http://")+"/1", "production", "api@trace-fixture", nil)
	options.TracesSampleRate = 1
	client, err := sentry.NewClient(options)
	if err != nil {
		t.Fatal(err)
	}
	defer client.Close()
	app.HTTP.Use(monitoring.Middleware(client))
	done := make(chan struct{})
	var once sync.Once
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/fixture/html", "/fixture/html-disabled":
			config := webapi.BrowserSentryConfig{}
			if r.URL.Path == "/fixture/html" {
				config = publicBrowserTelemetry(platformconfig.BrowserSentryConfig{DSN: "https://public@example.invalid/1", Environment: "production"}, "web@"+strings.Repeat("a", 40))
			}
			files := httpapp.BrowserTelemetryFiles(os.DirFS(filepath.Dir(os.Getenv("OPENTICKLY_TRACE_HTML"))), config)
			html, err := fs.ReadFile(files, "index.html")
			if err != nil {
				t.Error(err)
				w.WriteHeader(500)
				return
			}
			w.Header().Set("Content-Type", "text/html")
			_, _ = w.Write(html)
		case "/fixture/config":
			_ = json.NewEncoder(w).Encode(struct {
				Path          string `json:"path"`
				Authorization string `json:"authorization"`
			}{fmt.Sprintf("/api/v9/workspaces/%d/projects", user.WorkspaceID), user.Authorization})
		case "/fixture/envelopes":
			if !client.Flush(2 * time.Second) {
				t.Error("fixture flush failed")
			}
			mu.Lock()
			defer mu.Unlock()
			_ = json.NewEncoder(w).Encode(bodies)
		case "/fixture/stop":
			once.Do(func() { close(done) })
			w.WriteHeader(http.StatusNoContent)
		default:
			app.HTTP.ServeHTTP(w, r)
		}
	}))
	defer api.Close()
	t.Logf("TRACE_FIXTURE_READY=%s", api.URL)
	select {
	case <-done:
	case <-time.After(90 * time.Second):
		t.Fatal("browser fixture did not stop")
	}
}
