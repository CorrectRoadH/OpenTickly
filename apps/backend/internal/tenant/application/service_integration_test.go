package application

import (
	"context"
	"errors"
	"testing"

	billingdomain "opentoggl/backend/apps/backend/internal/billing/domain"
	"opentoggl/backend/apps/backend/internal/tenant/domain"
)

func TestNewServiceRequiresBillingCommercialTruthSource(t *testing.T) {
	service, err := NewService(NewInMemoryStore(), nil)
	if !errors.Is(err, ErrCommercialTruthSourceRequired) {
		t.Fatalf("expected ErrCommercialTruthSourceRequired, got service=%#v err=%v", service, err)
	}
}

func TestServiceCreatesOrganizationAndPreservesWorkspaceRelationship(t *testing.T) {
	ctx := context.Background()
	service := mustNewTenantService(t, NewInMemoryStore(), stubCommercialTruthSource{
		byOrganization: map[int64]CommercialSnapshot{
			1: {
				OrganizationID: 1,
				Subscription:   mustSubscription(t, billingdomain.PlanFree, billingdomain.SubscriptionStateFree),
			},
		},
	})

	result, err := service.CreateOrganization(ctx, CreateOrganizationCommand{
		Name:          "Platform",
		WorkspaceName: "Platform HQ",
	})
	if err != nil {
		t.Fatalf("expected organization creation to succeed: %v", err)
	}

	org, err := service.GetOrganization(ctx, result.OrganizationID)
	if err != nil {
		t.Fatalf("expected organization to be readable: %v", err)
	}

	if len(org.WorkspaceIDs) != 1 || org.WorkspaceIDs[0] != result.WorkspaceID {
		t.Fatalf("expected created organization to retain workspace relationship, got %+v", org.WorkspaceIDs)
	}

	if org.Commercial.Subscription.Plan != billingdomain.PlanFree ||
		org.Commercial.Subscription.State != billingdomain.SubscriptionStateFree {
		t.Fatalf("expected organization commercial fields from billing truth, got %+v", org.Commercial)
	}

	workspace, err := service.GetWorkspace(ctx, result.WorkspaceID)
	if err != nil {
		t.Fatalf("expected workspace to be readable: %v", err)
	}

	if workspace.OrganizationID != result.OrganizationID {
		t.Fatalf("expected workspace organization id %s, got %s", result.OrganizationID, workspace.OrganizationID)
	}

	if workspace.Commercial.Subscription.Plan != billingdomain.PlanFree ||
		workspace.Commercial.Subscription.State != billingdomain.SubscriptionStateFree {
		t.Fatalf("expected workspace commercial fields from billing truth, got %+v", workspace.Commercial)
	}

	if workspace.Commercial.WorkspaceID == nil || *workspace.Commercial.WorkspaceID != int64(result.WorkspaceID) {
		t.Fatalf("expected workspace commercial projection to keep workspace id, got %+v", workspace.Commercial)
	}
}

func TestServiceUpdatesWorkspaceSettingsAndBrandingMetadata(t *testing.T) {
	ctx := context.Background()
	service := mustNewTenantService(t, NewInMemoryStore(), stubCommercialTruthSource{
		byOrganization: map[int64]CommercialSnapshot{
			1: {
				OrganizationID: 1,
				Subscription:   mustSubscription(t, billingdomain.PlanStarter, billingdomain.SubscriptionStateActive),
			},
		},
	})

	result, err := service.CreateOrganization(ctx, CreateOrganizationCommand{
		Name:          "Delivery",
		WorkspaceName: "Delivery Ops",
	})
	if err != nil {
		t.Fatalf("expected organization creation to succeed: %v", err)
	}

	err = service.UpdateWorkspace(ctx, UpdateWorkspaceCommand{
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
			ReportsCollapse:             false,
			PublicProjectAccess:         domain.WorkspacePublicProjectAccessAdmins,
		},
	})
	if err != nil {
		t.Fatalf("expected workspace update to succeed: %v", err)
	}

	err = service.UpdateWorkspaceBranding(ctx, UpdateWorkspaceBrandingCommand{
		WorkspaceID:      result.WorkspaceID,
		LogoStorageKey:   "tenant/workspaces/1/logo.png",
		AvatarStorageKey: "tenant/workspaces/1/avatar.png",
	})
	if err != nil {
		t.Fatalf("expected workspace branding update to succeed: %v", err)
	}

	workspace, err := service.GetWorkspace(ctx, result.WorkspaceID)
	if err != nil {
		t.Fatalf("expected workspace to be readable: %v", err)
	}

	if workspace.Name != "Delivery West" {
		t.Fatalf("expected updated workspace name, got %q", workspace.Name)
	}

	if workspace.Settings.DefaultCurrency() != "EUR" {
		t.Fatalf("expected updated currency EUR, got %q", workspace.Settings.DefaultCurrency())
	}

	if workspace.Settings.DisplayPolicy() != domain.WorkspaceDisplayPolicyHideStartEndTimes {
		t.Fatalf("expected updated display policy, got %q", workspace.Settings.DisplayPolicy())
	}

	if workspace.Branding.LogoStorageKey != "tenant/workspaces/1/logo.png" {
		t.Fatalf("expected persisted logo storage key, got %q", workspace.Branding.LogoStorageKey)
	}

	if workspace.Branding.AvatarStorageKey != "tenant/workspaces/1/avatar.png" {
		t.Fatalf("expected persisted avatar storage key, got %q", workspace.Branding.AvatarStorageKey)
	}
}

func TestServiceDeletesWorkspaceAndOrganization(t *testing.T) {
	ctx := context.Background()
	service := mustNewTenantService(t, NewInMemoryStore(), stubCommercialTruthSource{
		byOrganization: map[int64]CommercialSnapshot{
			1: {
				OrganizationID: 1,
				Subscription:   mustSubscription(t, billingdomain.PlanPremium, billingdomain.SubscriptionStateActive),
			},
		},
	})

	result, err := service.CreateOrganization(ctx, CreateOrganizationCommand{
		Name:          "Ops",
		WorkspaceName: "Ops Core",
	})
	if err != nil {
		t.Fatalf("expected organization creation to succeed: %v", err)
	}

	secondWorkspace, err := service.CreateWorkspace(ctx, CreateWorkspaceCommand{
		OrganizationID: result.OrganizationID,
		Name:           "Ops Sandbox",
	})
	if err != nil {
		t.Fatalf("expected second workspace creation to succeed: %v", err)
	}

	if err := service.DeleteWorkspace(ctx, secondWorkspace.WorkspaceID); err != nil {
		t.Fatalf("expected workspace deletion to succeed: %v", err)
	}

	org, err := service.GetOrganization(ctx, result.OrganizationID)
	if err != nil {
		t.Fatalf("expected organization to remain readable: %v", err)
	}

	if len(org.WorkspaceIDs) != 1 || org.WorkspaceIDs[0] != result.WorkspaceID {
		t.Fatalf("expected deleted workspace to be removed from relationship, got %+v", org.WorkspaceIDs)
	}

	if err := service.DeleteOrganization(ctx, result.OrganizationID); err != nil {
		t.Fatalf("expected organization deletion to succeed: %v", err)
	}

	if _, err := service.GetOrganization(ctx, result.OrganizationID); !errors.Is(err, ErrOrganizationNotFound) {
		t.Fatalf("expected deleted organization lookup to return ErrOrganizationNotFound, got %v", err)
	}

	if _, err := service.GetWorkspace(ctx, result.WorkspaceID); !errors.Is(err, ErrWorkspaceNotFound) {
		t.Fatalf("expected root workspace to disappear with deleted organization, got %v", err)
	}
}

func TestServiceAlwaysReadsCommercialFieldsFromBillingTruth(t *testing.T) {
	ctx := context.Background()
	billing := stubCommercialTruthSource{
		byOrganization: map[int64]CommercialSnapshot{
			1: {
				OrganizationID: 1,
				Subscription:   mustSubscription(t, billingdomain.PlanStarter, billingdomain.SubscriptionStateTrialing),
			},
		},
		byWorkspace: map[int64]CommercialSnapshot{},
	}
	service := mustNewTenantService(t, NewInMemoryStore(), billing)

	result, err := service.CreateOrganization(ctx, CreateOrganizationCommand{
		Name:          "Revenue",
		WorkspaceName: "Revenue HQ",
	})
	if err != nil {
		t.Fatalf("expected organization creation to succeed: %v", err)
	}

	billing.byOrganization[1] = CommercialSnapshot{
		OrganizationID: 1,
		Subscription:   mustSubscription(t, billingdomain.PlanPremium, billingdomain.SubscriptionStateActive),
	}
	billing.byWorkspace[int64(result.WorkspaceID)] = CommercialSnapshot{
		OrganizationID: 1,
		WorkspaceID:    int64Ref(int64(result.WorkspaceID)),
		Subscription:   mustSubscription(t, billingdomain.PlanPremium, billingdomain.SubscriptionStateActive),
	}

	org, err := service.GetOrganization(ctx, result.OrganizationID)
	if err != nil {
		t.Fatalf("expected organization to be readable: %v", err)
	}

	workspace, err := service.GetWorkspace(ctx, result.WorkspaceID)
	if err != nil {
		t.Fatalf("expected workspace to be readable: %v", err)
	}

	if org.Commercial.Subscription.Plan != billingdomain.PlanPremium ||
		workspace.Commercial.Subscription.Plan != billingdomain.PlanPremium {
		t.Fatalf("expected latest billing truth to be composed into reads, got org=%+v workspace=%+v", org.Commercial, workspace.Commercial)
	}
}

type stubCommercialTruthSource struct {
	byOrganization map[int64]CommercialSnapshot
	byWorkspace    map[int64]CommercialSnapshot
}

func (source stubCommercialTruthSource) CommercialStatusForOrganization(
	_ context.Context,
	organizationID int64,
) (CommercialSnapshot, error) {
	snapshot, ok := source.byOrganization[organizationID]
	if !ok {
		return CommercialSnapshot{}, errors.New("organization commercial status missing from billing stub")
	}
	return snapshot, nil
}

func (source stubCommercialTruthSource) CommercialStatusForWorkspace(
	_ context.Context,
	workspaceID int64,
) (CommercialSnapshot, error) {
	if source.byWorkspace != nil {
		if snapshot, ok := source.byWorkspace[workspaceID]; ok {
			return snapshot, nil
		}
	}

	organizationSnapshot, ok := source.byOrganization[workspaceID]
	if !ok {
		return CommercialSnapshot{}, errors.New("workspace commercial status missing from billing stub")
	}
	organizationSnapshot.WorkspaceID = int64Ref(workspaceID)
	return organizationSnapshot, nil
}

func mustNewTenantService(
	t *testing.T,
	store *InMemoryStore,
	commercial CommercialTruthSource,
) *Service {
	t.Helper()

	service, err := NewService(store, commercial)
	if err != nil {
		t.Fatalf("expected tenant service to be valid: %v", err)
	}
	return service
}

func mustSubscription(
	t *testing.T,
	plan billingdomain.Plan,
	state billingdomain.SubscriptionState,
) billingdomain.Subscription {
	t.Helper()

	subscription, err := billingdomain.NewSubscription(plan, state)
	if err != nil {
		t.Fatalf("expected subscription to be valid: %v", err)
	}
	return subscription
}

func int64Ref(value int64) *int64 {
	return &value
}
