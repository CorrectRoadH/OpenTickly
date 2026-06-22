package bootstrap

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	platformconfig "opentoggl/backend/apps/backend/internal/platform/config"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func newSSOTestApp(t *testing.T, database *pgtest.Database, ssoConfig platformconfig.SSOConfig) *App {
	t.Helper()
	app, err := NewApp(Config{
		ServiceName: "opentoggl-api",
		Server:      ServerConfig{ListenAddress: ":0"},
		Database:    DatabaseConfig{PrimaryDSN: database.ConnString()},
		Redis:       RedisConfig{Address: "redis://127.0.0.1:6379/0"},
		SSO:         ssoConfig,
	})
	if err != nil {
		t.Fatalf("NewApp returned error: %v", err)
	}
	t.Cleanup(app.Platform.Database.Close)
	return app
}

func requestSSOInfo(t *testing.T, app *App) struct {
	Enabled      bool   `json:"enabled"`
	ProviderName string `json:"provider_name"`
} {
	t.Helper()
	recorder := httptest.NewRecorder()
	app.HTTP.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/auth/sso/info", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected /auth/sso/info status 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	var body struct {
		Enabled      bool   `json:"enabled"`
		ProviderName string `json:"provider_name"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode sso info: %v", err)
	}
	return body
}

func TestSSOInfoReportsDisabledByDefault(t *testing.T) {
	database := pgtest.Open(t)
	app := newSSOTestApp(t, database, platformconfig.SSOConfig{})

	info := requestSSOInfo(t, app)
	if info.Enabled {
		t.Fatalf("expected SSO disabled by default, got %+v", info)
	}
}

func TestSSOInfoReportsEnabledWhenConfigured(t *testing.T) {
	database := pgtest.Open(t)
	app := newSSOTestApp(t, database, platformconfig.SSOConfig{
		Enabled:      true,
		IssuerURL:    "https://idp.example.com",
		ClientID:     "client-id",
		ClientSecret: "client-secret",
		ProviderName: "Acme ID",
	})

	info := requestSSOInfo(t, app)
	if !info.Enabled {
		t.Fatalf("expected SSO enabled, got %+v", info)
	}
	if info.ProviderName != "Acme ID" {
		t.Fatalf("expected provider name 'Acme ID', got %q", info.ProviderName)
	}
}

func TestSSOStartRedirectsToLoginErrorWhenDisabled(t *testing.T) {
	database := pgtest.Open(t)
	app := newSSOTestApp(t, database, platformconfig.SSOConfig{})

	recorder := httptest.NewRecorder()
	app.HTTP.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/auth/sso/start", nil))
	if recorder.Code != http.StatusFound {
		t.Fatalf("expected redirect status 302, got %d", recorder.Code)
	}
	if location := recorder.Header().Get("Location"); location != ssoLoginErrorRedirect {
		t.Fatalf("expected redirect to %q, got %q", ssoLoginErrorRedirect, location)
	}
}
