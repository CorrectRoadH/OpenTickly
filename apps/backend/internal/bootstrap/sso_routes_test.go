package bootstrap

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func newSSOTestApp(t *testing.T, database *pgtest.Database) *App {
	t.Helper()
	app, err := NewApp(Config{
		ServiceName: "opentoggl-api",
		Server:      ServerConfig{ListenAddress: ":0"},
		Database:    DatabaseConfig{PrimaryDSN: database.ConnString()},
		Redis:       RedisConfig{Address: "redis://127.0.0.1:6379/0"},
	})
	if err != nil {
		t.Fatalf("NewApp returned error: %v", err)
	}
	t.Cleanup(app.Platform.Database.Close)
	return app
}

// configureSSO writes runtime SSO settings into the singleton instance config,
// mirroring what an admin does through the config UI.
func configureSSO(t *testing.T, app *App, enabled bool, issuer, clientID, secret, providerName string) {
	t.Helper()
	pool := app.Platform.Database.Pool()
	ctx := context.Background()
	if _, err := pool.Exec(ctx, `INSERT INTO instance_admin_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING`); err != nil {
		t.Fatalf("ensure config row: %v", err)
	}
	if _, err := pool.Exec(ctx,
		`UPDATE instance_admin_config
		 SET sso_enabled = $1, sso_issuer_url = $2, sso_client_id = $3, sso_client_secret = $4, sso_provider_name = $5
		 WHERE id = 1`,
		enabled, issuer, clientID, secret, providerName,
	); err != nil {
		t.Fatalf("update sso config: %v", err)
	}
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
	app := newSSOTestApp(t, database)

	if info := requestSSOInfo(t, app); info.Enabled {
		t.Fatalf("expected SSO disabled by default, got %+v", info)
	}
}

func TestSSOInfoReportsEnabledWhenConfigured(t *testing.T) {
	database := pgtest.Open(t)
	app := newSSOTestApp(t, database)
	configureSSO(t, app, true, "https://idp.example.com", "client-id", "client-secret", "Acme ID")

	info := requestSSOInfo(t, app)
	if !info.Enabled {
		t.Fatalf("expected SSO enabled, got %+v", info)
	}
	if info.ProviderName != "Acme ID" {
		t.Fatalf("expected provider name 'Acme ID', got %q", info.ProviderName)
	}
}

func TestSSOInfoStaysDisabledWhenEnabledButIncomplete(t *testing.T) {
	database := pgtest.Open(t)
	app := newSSOTestApp(t, database)
	// Enabled but missing issuer/client => not usable, so the button must hide.
	configureSSO(t, app, true, "", "", "", "Acme ID")

	if info := requestSSOInfo(t, app); info.Enabled {
		t.Fatalf("expected SSO disabled when incompletely configured, got %+v", info)
	}
}

func TestSSOStartRedirectsToLoginErrorWhenDisabled(t *testing.T) {
	database := pgtest.Open(t)
	app := newSSOTestApp(t, database)

	recorder := httptest.NewRecorder()
	app.HTTP.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/auth/sso/start", nil))
	if recorder.Code != http.StatusFound {
		t.Fatalf("expected redirect status 302, got %d", recorder.Code)
	}
	if location := recorder.Header().Get("Location"); location != ssoLoginErrorRedirect {
		t.Fatalf("expected redirect to %q, got %q", ssoLoginErrorRedirect, location)
	}
}
