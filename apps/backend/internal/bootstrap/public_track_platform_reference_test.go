package bootstrap

import (
	"net/http"
	"testing"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestPublicTrackReferenceRoutesReturnCatalogs(t *testing.T) {
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

	status := performJSONRequest(t, app, http.MethodGet, "/api/v9/status", nil, "")
	if status.Code != http.StatusOK {
		t.Fatalf("expected status route 200, got %d body=%s", status.Code, status.Body.String())
	}

	countries := performJSONRequest(t, app, http.MethodGet, "/api/v9/countries", nil, "")
	if countries.Code != http.StatusOK {
		t.Fatalf("expected countries route 200, got %d body=%s", countries.Code, countries.Body.String())
	}
	var countriesBody []publictrackapi.ModelsCountry
	mustDecodeJSON(t, countries.Body.Bytes(), &countriesBody)
	if len(countriesBody) == 0 {
		t.Fatal("expected countries catalog to be non-empty")
	}

	currencies := performJSONRequest(t, app, http.MethodGet, "/api/v9/currencies", nil, "")
	if currencies.Code != http.StatusOK {
		t.Fatalf("expected currencies route 200, got %d body=%s", currencies.Code, currencies.Body.String())
	}
	var currenciesBody []publictrackapi.ModelsCurrency
	mustDecodeJSON(t, currencies.Body.Bytes(), &currenciesBody)
	if len(currenciesBody) == 0 {
		t.Fatal("expected currencies catalog to be non-empty")
	}

	timezones := performJSONRequest(t, app, http.MethodGet, "/api/v9/timezones", nil, "")
	if timezones.Code != http.StatusOK {
		t.Fatalf("expected timezones route 200, got %d body=%s", timezones.Code, timezones.Body.String())
	}
	var timezonesBody []publictrackapi.ModelsTimezone
	mustDecodeJSON(t, timezones.Body.Bytes(), &timezonesBody)
	if len(timezonesBody) == 0 {
		t.Fatal("expected timezones catalog to be non-empty")
	}

	offsets := performJSONRequest(t, app, http.MethodGet, "/api/v9/timezones/offsets", nil, "")
	if offsets.Code != http.StatusOK {
		t.Fatalf("expected offsets route 200, got %d body=%s", offsets.Code, offsets.Body.String())
	}
	var offsetsBody []string
	mustDecodeJSON(t, offsets.Body.Bytes(), &offsetsBody)
	if len(offsetsBody) == 0 {
		t.Fatal("expected offsets catalog to be non-empty")
	}
}
