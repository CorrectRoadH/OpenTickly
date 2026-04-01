package application

import (
	"context"
	"testing"

	"opentoggl/backend/apps/backend/internal/billing/domain"
	"opentoggl/backend/apps/backend/internal/log"
)

type stubAccountRepository struct{}

func (stubAccountRepository) FindByOrganizationID(_ context.Context, _ int64) (domain.CommercialAccount, bool, error) {
	return domain.CommercialAccount{}, false, nil
}

func (stubAccountRepository) Save(_ context.Context, _ domain.CommercialAccount) error {
	return nil
}

type stubWorkspaceOwnershipLookup struct{}

func (stubWorkspaceOwnershipLookup) OrganizationIDForWorkspace(_ context.Context, _ int64) (int64, error) {
	return 0, nil
}

func TestAvailablePlansReturnsOrderedCatalog(t *testing.T) {
	service, err := NewService(
		stubAccountRepository{},
		stubWorkspaceOwnershipLookup{},
		[]domain.CapabilityRule{
			{Key: "reports.summary", MinimumPlan: domain.PlanStarter},
			{Key: "reports.profitability", MinimumPlan: domain.PlanEnterprise},
		},
		log.NopLogger(),
	)
	if err != nil {
		t.Fatalf("expected service to build, got %v", err)
	}

	plans := service.AvailablePlans()
	if len(plans) != 4 {
		t.Fatalf("expected 4 plans, got %#v", plans)
	}
	if plans[0].Plan != domain.PlanFree || plans[3].Plan != domain.PlanEnterprise {
		t.Fatalf("expected ordered plans, got %#v", plans)
	}

	capabilities := make(map[string]bool, len(plans[1].Capabilities))
	for _, capability := range plans[1].Capabilities {
		capabilities[capability.Key] = capability.Enabled
	}
	if !capabilities["reports.summary"] {
		t.Fatalf("expected starter to enable starter capability, got %#v", plans[1].Capabilities)
	}
	if capabilities["reports.profitability"] {
		t.Fatalf("expected starter to keep enterprise capability disabled, got %#v", plans[1].Capabilities)
	}
}
