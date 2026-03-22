package application

import (
	"context"
	"errors"
	"testing"

	billingdomain "opentoggl/backend/apps/backend/internal/billing/domain"
	billingpostgres "opentoggl/backend/apps/backend/internal/billing/infra/postgres"
	"opentoggl/backend/apps/backend/internal/tenant/domain"
	tenantpostgres "opentoggl/backend/apps/backend/internal/tenant/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestServicePersistsTenantStateWithPostgresStore(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	store := tenantpostgres.NewStore(database.Pool)
	billingRepository := billingpostgres.NewAccountRepository(database.Pool)
	workspaceOwnership := billingpostgres.NewWorkspaceOwnershipLookup(database.Pool)
	billingService := mustNewBillingService(t, billingRepository, workspaceOwnership)
	service, err := NewService(store, billingService)
	if err != nil {
		t.Fatalf("new tenant service: %v", err)
	}

	result, err := service.CreateOrganization(ctx, CreateOrganizationCommand{
		Name:          "Delivery",
		WorkspaceName: "Delivery Ops",
	})
	if err != nil {
		t.Fatalf("create organization: %v", err)
	}

	subscription := mustSubscription(t, billingdomain.PlanPremium, billingdomain.SubscriptionStateActive)
	quota, err := billingdomain.NewQuotaWindow(int64(result.OrganizationID), 23, 3600, 50)
	if err != nil {
		t.Fatalf("new quota window: %v", err)
	}
	account, err := billingdomain.NewCommercialAccount(int64(result.OrganizationID), "cust_456", subscription, quota)
	if err != nil {
		t.Fatalf("new commercial account: %v", err)
	}
	if err := billingRepository.Save(ctx, account); err != nil {
		t.Fatalf("save billing account: %v", err)
	}

	if err := service.UpdateWorkspace(ctx, UpdateWorkspaceCommand{
		WorkspaceID: result.WorkspaceID,
		Name:        "Delivery West",
		Settings: domain.WorkspaceSettingsInput{
			DefaultCurrency:             "EUR",
			DefaultHourlyRate:           125,
			Rounding:                    domain.WorkspaceRoundingNearest,
			RoundingMinutes:             15,
			DisplayPolicy:               domain.WorkspaceDisplayPolicyHideStartEndTimes,
			OnlyAdminsMayCreateProjects: true,
			OnlyAdminsSeeTeamDashboard:  true,
			ProjectsBillableByDefault:   true,
			ReportsCollapse:             true,
			PublicProjectAccess:         domain.WorkspacePublicProjectAccessAdmins,
		},
	}); err != nil {
		t.Fatalf("update workspace: %v", err)
	}

	if err := service.UpdateWorkspaceBranding(ctx, UpdateWorkspaceBrandingCommand{
		WorkspaceID:      result.WorkspaceID,
		LogoStorageKey:   "tenant/workspaces/1/logo.png",
		AvatarStorageKey: "tenant/workspaces/1/avatar.png",
	}); err != nil {
		t.Fatalf("update workspace branding: %v", err)
	}

	secondWorkspace, err := service.CreateWorkspace(ctx, CreateWorkspaceCommand{
		OrganizationID: result.OrganizationID,
		Name:           "Delivery Sandbox",
		Settings:       domain.WorkspaceSettingsInput{DefaultCurrency: "USD"},
	})
	if err != nil {
		t.Fatalf("create second workspace: %v", err)
	}
	if err := service.DeleteWorkspace(ctx, secondWorkspace.WorkspaceID); err != nil {
		t.Fatalf("delete second workspace: %v", err)
	}

	organization, err := service.GetOrganization(ctx, result.OrganizationID)
	if err != nil {
		t.Fatalf("get organization: %v", err)
	}
	if len(organization.WorkspaceIDs) != 1 || organization.WorkspaceIDs[0] != result.WorkspaceID {
		t.Fatalf("expected one remaining workspace %s, got %#v", result.WorkspaceID, organization.WorkspaceIDs)
	}
	if organization.Commercial.Subscription.Plan != billingdomain.PlanPremium {
		t.Fatalf("expected premium organization plan, got %#v", organization.Commercial.Subscription)
	}

	workspace, err := service.GetWorkspace(ctx, result.WorkspaceID)
	if err != nil {
		t.Fatalf("get workspace: %v", err)
	}
	if workspace.Name != "Delivery West" {
		t.Fatalf("expected updated workspace name, got %q", workspace.Name)
	}
	if workspace.Settings.DefaultCurrency() != "EUR" {
		t.Fatalf("expected EUR default currency, got %q", workspace.Settings.DefaultCurrency())
	}
	if workspace.Branding.LogoStorageKey != "tenant/workspaces/1/logo.png" {
		t.Fatalf("expected logo storage key to persist, got %q", workspace.Branding.LogoStorageKey)
	}
	if workspace.Branding.AvatarStorageKey != "tenant/workspaces/1/avatar.png" {
		t.Fatalf("expected avatar storage key to persist, got %q", workspace.Branding.AvatarStorageKey)
	}
	if workspace.Commercial.Subscription.Plan != billingdomain.PlanPremium {
		t.Fatalf("expected premium workspace plan, got %#v", workspace.Commercial.Subscription)
	}

	if err := service.DeleteOrganization(ctx, result.OrganizationID); err != nil {
		t.Fatalf("delete organization: %v", err)
	}
	if _, err := service.GetOrganization(ctx, result.OrganizationID); !errors.Is(err, ErrOrganizationNotFound) {
		t.Fatalf("expected deleted organization lookup to return ErrOrganizationNotFound, got %v", err)
	}
	if _, err := service.GetWorkspace(ctx, result.WorkspaceID); !errors.Is(err, ErrWorkspaceNotFound) {
		t.Fatalf("expected deleted workspace lookup to return ErrWorkspaceNotFound, got %v", err)
	}
}
