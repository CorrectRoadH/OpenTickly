package bootstrap

import (
	"net/http"
	"testing"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"

	"github.com/samber/lo"
)

func TestPublicTrackPushServicesLifecycle(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("push-owner")

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

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    uniqueEmail,
		"fullname": "Push Owner",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}

	authorization := basicAuthorization(uniqueEmail, "secret1")
	subscribe := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/me/push_services",
		publictrackapi.PushPostPushServicesSubscribe{FcmRegistrationToken: lo.ToPtr("device-token-1")},
		authorization,
	)
	if subscribe.Code != http.StatusOK {
		t.Fatalf("expected subscribe status 200, got %d body=%s", subscribe.Code, subscribe.Body.String())
	}

	list := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/push_services",
		nil,
		authorization,
	)
	if list.Code != http.StatusOK {
		t.Fatalf("expected list status 200, got %d body=%s", list.Code, list.Body.String())
	}

	var tokens []string
	mustDecodeJSON(t, list.Body.Bytes(), &tokens)
	if len(tokens) != 1 || tokens[0] != "device-token-1" {
		t.Fatalf("expected one registered token, got %#v", tokens)
	}

	unsubscribe := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodDelete,
		"/api/v9/me/push_services",
		publictrackapi.PushDeletePushServicesUnsubscribe{FcmRegistrationToken: lo.ToPtr("device-token-1")},
		authorization,
	)
	if unsubscribe.Code != http.StatusOK {
		t.Fatalf("expected unsubscribe status 200, got %d body=%s", unsubscribe.Code, unsubscribe.Body.String())
	}

	list = performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/push_services",
		nil,
		authorization,
	)
	if list.Code != http.StatusOK {
		t.Fatalf("expected second list status 200, got %d body=%s", list.Code, list.Body.String())
	}

	mustDecodeJSON(t, list.Body.Bytes(), &tokens)
	if len(tokens) != 0 {
		t.Fatalf("expected no registered tokens after unsubscribe, got %#v", tokens)
	}
}
