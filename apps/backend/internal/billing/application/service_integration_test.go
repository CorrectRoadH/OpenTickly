package application

import (
	"context"
	"testing"

	"opentoggl/backend/apps/backend/internal/billing/domain"
	"opentoggl/backend/apps/backend/internal/billing/infra"
)

func TestServiceWorkspaceQuotaSnapshotReturnsBodyAndHeaders(t *testing.T) {
	service := newTestService(t)

	subscription, err := domain.NewSubscription(domain.PlanStarter, domain.SubscriptionStateActive)
	if err != nil {
		t.Fatalf("expected subscription to be valid: %v", err)
	}

	quota, err := domain.NewQuotaWindow(77, 9, 60, 10)
	if err != nil {
		t.Fatalf("expected quota window to be valid: %v", err)
	}

	account, err := domain.NewCommercialAccount(77, "cust_123", subscription, quota)
	if err != nil {
		t.Fatalf("expected commercial account to be valid: %v", err)
	}

	if err := service.accounts.Save(context.Background(), account); err != nil {
		t.Fatalf("expected account to be stored: %v", err)
	}

	window, headers, err := service.WorkspaceQuotaSnapshot(context.Background(), 501)
	if err != nil {
		t.Fatalf("expected workspace quota snapshot to resolve: %v", err)
	}

	if window != quota {
		t.Fatalf("expected quota body %#v, got %#v", quota, window)
	}

	if headers["X-OpenToggl-Quota-Remaining"] != "9" {
		t.Fatalf("expected remaining header 9, got %q", headers["X-OpenToggl-Quota-Remaining"])
	}
}

func TestServiceWorkspaceCapabilitySnapshotReturnsBillingFactsForAppShell(t *testing.T) {
	service := newTestService(t)

	subscription, err := domain.NewSubscription(domain.PlanStarter, domain.SubscriptionStateActive)
	if err != nil {
		t.Fatalf("expected subscription to be valid: %v", err)
	}

	quota, err := domain.NewQuotaWindow(77, 9, 60, 10)
	if err != nil {
		t.Fatalf("expected quota window to be valid: %v", err)
	}

	account, err := domain.NewCommercialAccount(77, "cust_123", subscription, quota)
	if err != nil {
		t.Fatalf("expected commercial account to be valid: %v", err)
	}

	if err := service.accounts.Save(context.Background(), account); err != nil {
		t.Fatalf("expected account to be stored: %v", err)
	}

	snapshot, err := service.WorkspaceCapabilitySnapshot(context.Background(), 501)
	if err != nil {
		t.Fatalf("expected workspace capability snapshot to resolve: %v", err)
	}

	if snapshot.Context.Scope != "workspace" {
		t.Fatalf("expected workspace scope, got %#v", snapshot.Context)
	}

	if snapshot.Context.OrganizationID == nil || *snapshot.Context.OrganizationID != 77 {
		t.Fatalf("expected organization id 77, got %#v", snapshot.Context.OrganizationID)
	}

	if snapshot.Context.WorkspaceID == nil || *snapshot.Context.WorkspaceID != 501 {
		t.Fatalf("expected workspace id 501, got %#v", snapshot.Context.WorkspaceID)
	}

	if len(snapshot.Capabilities) != 3 {
		t.Fatalf("expected 3 capabilities, got %#v", snapshot.Capabilities)
	}

	if snapshot.Capabilities[0] != (domain.FeatureCapability{
		Key:     "reports.profitability",
		Enabled: false,
		Source:  domain.CapabilitySourceBilling,
	}) {
		t.Fatalf("unexpected first capability %#v", snapshot.Capabilities[0])
	}

	if snapshot.Capabilities[1] != (domain.FeatureCapability{
		Key:     "reports.summary",
		Enabled: true,
		Source:  domain.CapabilitySourceBilling,
	}) {
		t.Fatalf("unexpected second capability %#v", snapshot.Capabilities[1])
	}
}

func TestServiceCheckWorkspaceCapabilityReturnsQuotaExhaustedDecision(t *testing.T) {
	service := newTestService(t)

	subscription, err := domain.NewSubscription(domain.PlanStarter, domain.SubscriptionStateActive)
	if err != nil {
		t.Fatalf("expected subscription to be valid: %v", err)
	}

	quota, err := domain.NewQuotaWindow(77, 0, 60, 10)
	if err != nil {
		t.Fatalf("expected quota window to be valid: %v", err)
	}

	account, err := domain.NewCommercialAccount(77, "cust_123", subscription, quota)
	if err != nil {
		t.Fatalf("expected commercial account to be valid: %v", err)
	}

	if err := service.accounts.Save(context.Background(), account); err != nil {
		t.Fatalf("expected account to be stored: %v", err)
	}

	decision, err := service.CheckWorkspaceCapability(
		context.Background(),
		CapabilityCheck{
			WorkspaceID:      501,
			CapabilityKey:    "reports.summary",
			InstanceDisabled: false,
		},
	)
	if err != nil {
		t.Fatalf("expected capability decision to resolve: %v", err)
	}

	if decision.Allowed || decision.Reason != domain.GateReasonQuotaExhausted {
		t.Fatalf("expected quota exhausted decision, got %#v", decision)
	}

	if decision.Quota == nil || decision.Quota.Remaining != 0 {
		t.Fatalf("expected exhausted decision to preserve quota details, got %#v", decision)
	}
}

func TestServiceCommercialStatusFallsBackToBillingDefaultForTenantQueries(t *testing.T) {
	service := newTestService(t)

	organizationStatus, err := service.CommercialStatusForOrganization(context.Background(), 77)
	if err != nil {
		t.Fatalf("expected organization commercial status to resolve: %v", err)
	}

	workspaceStatus, err := service.CommercialStatusForWorkspace(context.Background(), 501)
	if err != nil {
		t.Fatalf("expected workspace commercial status to resolve: %v", err)
	}

	if organizationStatus.Subscription.Plan != domain.PlanFree {
		t.Fatalf("expected default plan free, got %#v", organizationStatus.Subscription)
	}

	if organizationStatus.Subscription.State != domain.SubscriptionStateFree {
		t.Fatalf("expected default state free, got %#v", organizationStatus.Subscription)
	}

	if workspaceStatus.Subscription != organizationStatus.Subscription {
		t.Fatalf(
			"expected workspace and organization default status to share billing truth, got %#v vs %#v",
			workspaceStatus.Subscription,
			organizationStatus.Subscription,
		)
	}
}

func newTestService(t *testing.T) *Service {
	t.Helper()

	repository := infra.NewMemoryAccountRepository()
	workspaces := infra.NewMemoryWorkspaceOwnership(map[int64]int64{
		501: 77,
	})

	service, err := NewService(
		repository,
		workspaces,
		[]domain.CapabilityRule{
			{Key: "reports.profitability", MinimumPlan: domain.PlanEnterprise},
			{Key: "reports.summary", MinimumPlan: domain.PlanStarter, RequiresQuota: true},
			{Key: "time_tracking", MinimumPlan: domain.PlanFree},
		},
	)
	if err != nil {
		t.Fatalf("expected billing service to be valid: %v", err)
	}
	return service
}
