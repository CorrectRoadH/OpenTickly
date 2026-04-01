package application_test

import (
	"context"
	"errors"
	"log/slog"
	"testing"

	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
	tenantpostgres "opentoggl/backend/apps/backend/internal/tenant/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"

	"opentoggl/backend/apps/backend/internal/billing/application"
	"opentoggl/backend/apps/backend/internal/billing/domain"
	postgresinfra "opentoggl/backend/apps/backend/internal/billing/infra/postgres"
	"opentoggl/backend/apps/backend/internal/log"
)

var testLogger = log.NewZapLogger(slog.Default())

func TestServiceResolvesBillingFactsFromPostgresRepositories(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	tenantStore := tenantpostgres.NewStore(database.Pool)
	organization, workspace, err := tenantStore.CreateOrganization(
		ctx,
		"Billing Org",
		"Billing Workspace",
		mustDefaultWorkspaceSettings(t),
	)
	if err != nil {
		t.Fatalf("create tenant organization for billing test: %v", err)
	}

	repository := postgresinfra.NewAccountRepository(database.Pool)
	workspaces := postgresinfra.NewWorkspaceOwnershipLookup(database.Pool)
	service, err := application.NewService(
		repository,
		workspaces,
		[]domain.CapabilityRule{
			{Key: "reports.profitability", MinimumPlan: domain.PlanEnterprise},
			{Key: "reports.summary", MinimumPlan: domain.PlanStarter, RequiresQuota: true},
			{Key: "time_tracking", MinimumPlan: domain.PlanFree},
		},
		testLogger,
	)
	if err != nil {
		t.Fatalf("new billing service: %v", err)
	}

	subscription, err := domain.NewSubscription(domain.PlanStarter, domain.SubscriptionStateActive)
	if err != nil {
		t.Fatalf("new subscription: %v", err)
	}
	quota, err := domain.NewQuotaWindow(int64(organization.ID()), 9, 60, 10)
	if err != nil {
		t.Fatalf("new quota: %v", err)
	}
	account, err := domain.NewCommercialAccount(int64(organization.ID()), "cust_123", subscription, quota)
	if err != nil {
		t.Fatalf("new commercial account: %v", err)
	}
	if err := repository.Save(ctx, account); err != nil {
		t.Fatalf("save billing account: %v", err)
	}

	window, headers, err := service.WorkspaceQuotaSnapshot(ctx, int64(workspace.ID()))
	if err != nil {
		t.Fatalf("workspace quota snapshot: %v", err)
	}
	if window != quota {
		t.Fatalf("expected quota %#v, got %#v", quota, window)
	}
	if headers["X-OpenToggl-Quota-Remaining"] != "9" {
		t.Fatalf("expected remaining header 9, got %q", headers["X-OpenToggl-Quota-Remaining"])
	}

	capabilities, err := service.WorkspaceCapabilitySnapshot(ctx, int64(workspace.ID()))
	if err != nil {
		t.Fatalf("workspace capability snapshot: %v", err)
	}
	if capabilities.Context.OrganizationID == nil || *capabilities.Context.OrganizationID != int64(organization.ID()) {
		t.Fatalf("expected organization id %d, got %#v", organization.ID(), capabilities.Context.OrganizationID)
	}
	if capabilities.Context.WorkspaceID == nil || *capabilities.Context.WorkspaceID != int64(workspace.ID()) {
		t.Fatalf("expected workspace id %d, got %#v", workspace.ID(), capabilities.Context.WorkspaceID)
	}
	if len(capabilities.Capabilities) != 3 {
		t.Fatalf("expected 3 capabilities, got %#v", capabilities.Capabilities)
	}
	if capabilities.Capabilities[1] != (domain.FeatureCapability{
		Key:     "reports.summary",
		Enabled: true,
		Source:  domain.CapabilitySourceBilling,
	}) {
		t.Fatalf("unexpected reports.summary capability %#v", capabilities.Capabilities[1])
	}

	status, err := service.CommercialStatusForWorkspace(ctx, int64(workspace.ID()))
	if err != nil {
		t.Fatalf("commercial status for workspace: %v", err)
	}
	if status.WorkspaceID == nil || *status.WorkspaceID != int64(workspace.ID()) {
		t.Fatalf("expected workspace commercial status for workspace %d, got %#v", workspace.ID(), status.WorkspaceID)
	}
	if status.Subscription.Plan != domain.PlanStarter {
		t.Fatalf("expected starter plan, got %#v", status.Subscription)
	}
}

func TestServiceRequiresPersistedBillingAccount(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	tenantStore := tenantpostgres.NewStore(database.Pool)
	organization, workspace, err := tenantStore.CreateOrganization(
		ctx,
		"Billing Org",
		"Billing Workspace",
		mustDefaultWorkspaceSettings(t),
	)
	if err != nil {
		t.Fatalf("create tenant organization for billing test: %v", err)
	}

	provisioningService, err := application.NewService(
		postgresinfra.NewAccountRepository(database.Pool),
		postgresinfra.NewWorkspaceOwnershipLookup(database.Pool),
		[]domain.CapabilityRule{
			{Key: "reports.summary", MinimumPlan: domain.PlanStarter, RequiresQuota: true},
		},
		testLogger,
	)
	if err != nil {
		t.Fatalf("new billing service for provision: %v", err)
	}
	if err := provisioningService.ProvisionDefaultOrganization(ctx, int64(organization.ID())); err != nil {
		t.Fatalf("provision default billing account: %v", err)
	}

	if _, err := database.Pool.Exec(ctx, `
		delete from billing_accounts
		where organization_id = $1
	`, int64(organization.ID())); err != nil {
		t.Fatalf("delete billing account: %v", err)
	}

	service, err := application.NewService(
		postgresinfra.NewAccountRepository(database.Pool),
		postgresinfra.NewWorkspaceOwnershipLookup(database.Pool),
		[]domain.CapabilityRule{
			{Key: "reports.summary", MinimumPlan: domain.PlanStarter, RequiresQuota: true},
		},
		testLogger,
	)
	if err != nil {
		t.Fatalf("new billing service: %v", err)
	}

	if _, err := service.CommercialStatusForWorkspace(ctx, int64(workspace.ID())); !errors.Is(err, application.ErrCommercialAccountNotFound) {
		t.Fatalf("expected application.ErrCommercialAccountNotFound, got %v", err)
	}
}

func TestServiceProvisionsDefaultBillingAccount(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	tenantStore := tenantpostgres.NewStore(database.Pool)
	organization, _, err := tenantStore.CreateOrganization(
		ctx,
		"Billing Org",
		"Billing Workspace",
		mustDefaultWorkspaceSettings(t),
	)
	if err != nil {
		t.Fatalf("create tenant organization for billing test: %v", err)
	}

	service, err := application.NewService(
		postgresinfra.NewAccountRepository(database.Pool),
		postgresinfra.NewWorkspaceOwnershipLookup(database.Pool),
		[]domain.CapabilityRule{
			{Key: "time_tracking", MinimumPlan: domain.PlanFree},
		},
		testLogger,
	)
	if err != nil {
		t.Fatalf("new billing service: %v", err)
	}

	if err := service.ProvisionDefaultOrganization(ctx, int64(organization.ID())); err != nil {
		t.Fatalf("provision default billing account: %v", err)
	}
	if err := service.ProvisionDefaultOrganization(ctx, int64(organization.ID())); err != nil {
		t.Fatalf("expected provisioning to be idempotent, got %v", err)
	}

	account, ok, err := postgresinfra.NewAccountRepository(database.Pool).FindByOrganizationID(ctx, int64(organization.ID()))
	if err != nil {
		t.Fatalf("find provisioned billing account: %v", err)
	}
	if !ok {
		t.Fatal("expected billing account to exist after provisioning")
	}
	if account.Subscription.Plan != domain.PlanFree || account.Subscription.State != domain.SubscriptionStateFree {
		t.Fatalf("expected free default billing account, got %#v", account.Subscription)
	}
}

func mustDefaultWorkspaceSettings(t *testing.T) tenantdomain.WorkspaceSettings {
	t.Helper()
	return tenantdomain.DefaultWorkspaceSettings()
}
