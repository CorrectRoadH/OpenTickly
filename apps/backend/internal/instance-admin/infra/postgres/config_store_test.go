package postgres_test

import (
	"context"
	"testing"

	"opentoggl/backend/apps/backend/internal/instance-admin/application"
	instanceadminpostgres "opentoggl/backend/apps/backend/internal/instance-admin/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"

	"github.com/samber/lo"
)

// TestGetConfigSucceedsAfterInstanceOIDCSSORemoval covers a regression where
// migration 00016_workspace_saml_sso.sql dropped the instance-level sso_*
// columns from instance_admin_config (replaced by per-workspace SAML SSO),
// but the store kept selecting them, so GET /admin/v1/config 500'd with
// "column \"sso_enabled\" does not exist" on every schema-16+ database.
func TestGetConfigSucceedsAfterInstanceOIDCSSORemoval(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()
	store := instanceadminpostgres.NewStore(database.Pool)

	if _, err := store.GetConfig(ctx); err != nil {
		t.Fatalf("get config: %v", err)
	}

	if _, err := store.UpdateConfig(ctx, application.InstanceConfigUpdate{
		SiteURL: lo.ToPtr("https://example.com"),
	}); err != nil {
		t.Fatalf("update config: %v", err)
	}

	cfg, err := store.GetConfig(ctx)
	if err != nil {
		t.Fatalf("get config after update: %v", err)
	}
	if cfg.SiteURL != "https://example.com" {
		t.Fatalf("expected site_url to be persisted, got %q", cfg.SiteURL)
	}
}
