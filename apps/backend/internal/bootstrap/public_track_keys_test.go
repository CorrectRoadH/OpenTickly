package bootstrap

import (
	"encoding/json"
	"net/http"
	"testing"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestPublicTrackKeysReturnsJWKSShape(t *testing.T) {
	database := pgtest.Open(t)

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

	response := performJSONRequest(t, app, http.MethodGet, "/api/v9/keys", nil, "")
	if response.Code != http.StatusOK {
		t.Fatalf("expected keys status 200, got %d body=%s", response.Code, response.Body.String())
	}

	var body struct {
		Keys []json.RawMessage `json:"keys"`
	}
	mustDecodeJSON(t, response.Body.Bytes(), &body)
	if body.Keys == nil {
		t.Fatalf("expected jwks keys field, got %#v", body)
	}
	if len(body.Keys) != 0 {
		t.Fatalf("expected empty jwks keys list, got %#v", body.Keys)
	}
}
