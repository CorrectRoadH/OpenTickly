package bootstrap

import (
	"context"
	"testing"

	billingapplication "opentoggl/backend/apps/backend/internal/billing/application"
	billingdomain "opentoggl/backend/apps/backend/internal/billing/domain"
	billingpostgres "opentoggl/backend/apps/backend/internal/billing/infra/postgres"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	membershippostgres "opentoggl/backend/apps/backend/internal/membership/infra/postgres"
	tenantapplication "opentoggl/backend/apps/backend/internal/tenant/application"
	tenantpostgres "opentoggl/backend/apps/backend/internal/tenant/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestBillingBackedSessionShellPersistsUserHomeInPostgres(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	tenantService := mustNewTenantPostgresService(t, database)
	billingService := mustNewBillingPostgresService(t, database)
	membershipService, err := membershipapplication.NewService(membershippostgres.NewStore(database.Pool))
	if err != nil {
		t.Fatalf("new membership postgres service: %v", err)
	}
	identityService := identityapplication.NewService(identityapplication.Config{
		Users: identitypostgres.NewUserRepository(database.Pool),
	})
	homes := tenantpostgres.NewUserHomeRepository(database.Pool)

	user := identityapplication.UserSnapshot{
		ID:       101,
		Email:    "persisted@example.com",
		FullName: "Persisted Person",
	}
	persistedUser, err := identitydomain.RegisterUser(identitydomain.RegisterParams{
		ID:       user.ID,
		Email:    user.Email,
		FullName: user.FullName,
		Password: "secret1",
		APIToken: "api-token-persisted",
	})
	if err != nil {
		t.Fatalf("register persisted test user: %v", err)
	}
	if err := identitypostgres.NewUserRepository(database.Pool).Save(ctx, persistedUser); err != nil {
		t.Fatalf("save persisted test user: %v", err)
	}

	firstProvider := newBillingBackedSessionShell(
		tenantService,
		billingService,
		identityService,
		membershipService,
		homes,
	)
	firstShell, err := firstProvider.SessionShell(ctx, user)
	if err != nil {
		t.Fatalf("first session shell: %v", err)
	}
	if firstShell.CurrentOrganizationID == nil || firstShell.CurrentWorkspaceID == nil {
		t.Fatalf("expected first shell to create tenant home, got %#v", firstShell)
	}

	secondProvider := newBillingBackedSessionShell(
		tenantService,
		billingService,
		identityService,
		membershipService,
		homes,
	)
	secondShell, err := secondProvider.SessionShell(ctx, user)
	if err != nil {
		t.Fatalf("second session shell: %v", err)
	}
	if secondShell.CurrentOrganizationID == nil || secondShell.CurrentWorkspaceID == nil {
		t.Fatalf("expected second shell to resolve persisted tenant home, got %#v", secondShell)
	}
	if *secondShell.CurrentOrganizationID != *firstShell.CurrentOrganizationID {
		t.Fatalf("expected organization id %d after restart, got %d", *firstShell.CurrentOrganizationID, *secondShell.CurrentOrganizationID)
	}
	if *secondShell.CurrentWorkspaceID != *firstShell.CurrentWorkspaceID {
		t.Fatalf("expected workspace id %d after restart, got %d", *firstShell.CurrentWorkspaceID, *secondShell.CurrentWorkspaceID)
	}

	assertTableCount(t, database, "tenant_organizations", 1)
	assertTableCount(t, database, "tenant_workspaces", 1)
	assertTableCount(t, database, "web_user_homes", 1)
	assertTableCount(t, database, "membership_workspace_members", 1)
}

func mustNewTenantPostgresService(t *testing.T, database *pgtest.Database) *tenantapplication.Service {
	t.Helper()

	billingService := mustNewBillingPostgresService(t, database)
	service, err := tenantapplication.NewService(tenantpostgres.NewStore(database.Pool), billingService)
	if err != nil {
		t.Fatalf("new tenant postgres service: %v", err)
	}
	return service
}

func mustNewBillingPostgresService(t *testing.T, database *pgtest.Database) *billingapplication.Service {
	t.Helper()

	service, err := billingapplication.NewService(
		billingpostgres.NewAccountRepository(database.Pool),
		billingpostgres.NewWorkspaceOwnershipLookup(database.Pool),
		[]billingdomain.CapabilityRule{
			{Key: "reports.profitability", MinimumPlan: billingdomain.PlanEnterprise},
			{Key: "reports.summary", MinimumPlan: billingdomain.PlanStarter, RequiresQuota: true},
			{Key: "time_tracking", MinimumPlan: billingdomain.PlanFree},
		},
	)
	if err != nil {
		t.Fatalf("new billing postgres service: %v", err)
	}
	return service
}

func assertTableCount(t *testing.T, database *pgtest.Database, table string, want int) {
	t.Helper()

	var got int
	if err := database.Pool.QueryRow(context.Background(), "select count(*) from "+table).Scan(&got); err != nil {
		t.Fatalf("count %s: %v", table, err)
	}
	if got != want {
		t.Fatalf("expected %s count %d, got %d", table, want, got)
	}
}
