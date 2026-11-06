package postgres_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/instance-admin/domain"
	instanceadminpostgres "opentoggl/backend/apps/backend/internal/instance-admin/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestOIDCConfigRoundTripAndRevision(t *testing.T) {
	database := pgtest.OpenEphemeral(t)
	ctx := context.Background()
	store := instanceadminpostgres.NewStore(database.Pool)

	empty, err := store.GetOIDCConfig(ctx)
	if err != nil {
		t.Fatalf("get empty: %v", err)
	}
	if empty.Revision != 0 || empty.Enabled {
		t.Fatalf("expected empty default, got %+v", empty)
	}

	saved, err := store.SaveOIDCConfig(ctx, domain.OIDCConfig{
		Enabled: true, ProviderName: "Google", IssuerURL: "https://accounts.google.com",
		ClientID: "cid", ClientSecret: "secret", AllowedEmailDomains: []string{"example.com"},
		AutoProvision: true, Revision: 0, UpdatedAt: time.Now(),
	})
	if err != nil {
		t.Fatalf("save: %v", err)
	}
	if saved.Revision != 1 {
		t.Fatalf("expected revision 1, got %d", saved.Revision)
	}

	loaded, err := store.GetOIDCConfig(ctx)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if loaded.ClientSecret != "secret" || !loaded.AutoProvision || len(loaded.AllowedEmailDomains) != 1 {
		t.Fatalf("round trip lost data: %+v", loaded)
	}

	if _, err := store.SaveOIDCConfig(ctx, domain.OIDCConfig{Revision: 0}); !errors.Is(err, domain.ErrOIDCConfigConflict) {
		t.Fatalf("expected stale revision conflict, got %v", err)
	}
}

func TestOIDCConfigTrustChangeDropsBindings(t *testing.T) {
	database := pgtest.OpenEphemeral(t)
	ctx := context.Background()
	store := instanceadminpostgres.NewStore(database.Pool)

	first, err := store.SaveOIDCConfig(ctx, domain.OIDCConfig{IssuerURL: "https://issuer.one", ClientID: "a", UpdatedAt: time.Now()})
	if err != nil {
		t.Fatalf("save: %v", err)
	}
	if _, err := database.Pool.Exec(ctx, `INSERT INTO identity_users (id, email, full_name, password_hash, api_token, timezone, state, product_emails_disable_code, weekly_report_disable_code) VALUES (9001, 'oidc@example.com', 'OIDC', 'x', 'tok-9001', 'UTC', 'active', 'pe-9001', 'wr-9001')`); err != nil {
		t.Fatalf("seed user: %v", err)
	}
	if _, err := database.Pool.Exec(ctx, `INSERT INTO identity_oidc_bindings (issuer, subject, user_id) VALUES ('https://issuer.one', 'sub', 9001)`); err != nil {
		t.Fatalf("seed binding: %v", err)
	}

	renamed := first
	renamed.ProviderName = "Renamed"
	renamed.ClientSecret = "rotated"
	second, err := store.SaveOIDCConfig(ctx, renamed)
	if err != nil {
		t.Fatalf("rename: %v", err)
	}
	var count int
	if err := database.Pool.QueryRow(ctx, `SELECT count(*) FROM identity_oidc_bindings`).Scan(&count); err != nil || count != 1 {
		t.Fatalf("rename must keep bindings, count=%d err=%v", count, err)
	}

	second.ClientID = "b"
	if _, err := store.SaveOIDCConfig(ctx, second); err != nil {
		t.Fatalf("change client: %v", err)
	}
	if err := database.Pool.QueryRow(ctx, `SELECT count(*) FROM identity_oidc_bindings`).Scan(&count); err != nil || count != 0 {
		t.Fatalf("client change must drop bindings, count=%d err=%v", count, err)
	}
}
