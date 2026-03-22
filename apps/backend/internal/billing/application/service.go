package application

import (
	"context"
	"errors"
	"fmt"
	"slices"

	"opentoggl/backend/apps/backend/internal/billing/domain"
)

var ErrCapabilityRuleNotFound = errors.New("billing capability rule not found")
var ErrCommercialAccountNotFound = errors.New("billing commercial account not found")

type AccountRepository interface {
	FindByOrganizationID(
		ctx context.Context,
		organizationID int64,
	) (domain.CommercialAccount, bool, error)
	Save(ctx context.Context, account domain.CommercialAccount) error
}

type WorkspaceOwnershipLookup interface {
	OrganizationIDForWorkspace(ctx context.Context, workspaceID int64) (int64, error)
}

type CapabilityCheck struct {
	WorkspaceID      int64
	CapabilityKey    string
	InstanceDisabled bool
}

type Service struct {
	accounts        AccountRepository
	workspaces      WorkspaceOwnershipLookup
	capabilityRules map[string]domain.CapabilityRule
	capabilityKeys  []string
}

func NewService(
	accounts AccountRepository,
	workspaces WorkspaceOwnershipLookup,
	rules []domain.CapabilityRule,
) (*Service, error) {
	if accounts == nil {
		return nil, fmt.Errorf("billing accounts repository is required")
	}
	if workspaces == nil {
		return nil, fmt.Errorf("workspace ownership lookup is required")
	}

	capabilityRules := make(map[string]domain.CapabilityRule, len(rules))
	capabilityKeys := make([]string, 0, len(rules))
	for _, rule := range rules {
		if rule.Key == "" {
			return nil, fmt.Errorf("capability rule key is required")
		}
		if _, exists := capabilityRules[rule.Key]; exists {
			return nil, fmt.Errorf("capability rule %q must be unique", rule.Key)
		}
		capabilityRules[rule.Key] = rule
		capabilityKeys = append(capabilityKeys, rule.Key)
	}
	slices.Sort(capabilityKeys)

	return &Service{
		accounts:        accounts,
		workspaces:      workspaces,
		capabilityRules: capabilityRules,
		capabilityKeys:  capabilityKeys,
	}, nil
}

func (service *Service) WorkspaceQuotaSnapshot(
	ctx context.Context,
	workspaceID int64,
) (domain.QuotaWindow, map[string]string, error) {
	account, _, err := service.resolveWorkspaceAccount(ctx, workspaceID)
	if err != nil {
		return domain.QuotaWindow{}, nil, err
	}
	return account.Quota, account.Quota.Headers(), nil
}

func (service *Service) WorkspaceCapabilitySnapshot(
	ctx context.Context,
	workspaceID int64,
) (domain.CapabilitySnapshot, error) {
	account, organizationID, err := service.resolveWorkspaceAccount(ctx, workspaceID)
	if err != nil {
		return domain.CapabilitySnapshot{}, err
	}

	capabilities := make([]domain.FeatureCapability, 0, len(service.capabilityKeys))
	for _, key := range service.capabilityKeys {
		capabilities = append(capabilities, service.capabilityRules[key].Snapshot(account.Subscription))
	}

	return domain.CapabilitySnapshot{
		Context: domain.CapabilityContext{
			OrganizationID: int64Ref(organizationID),
			WorkspaceID:    int64Ref(workspaceID),
			Scope:          "workspace",
		},
		Capabilities: capabilities,
	}, nil
}

func (service *Service) CheckWorkspaceCapability(
	ctx context.Context,
	check CapabilityCheck,
) (domain.FeatureGateDecision, error) {
	account, _, err := service.resolveWorkspaceAccount(ctx, check.WorkspaceID)
	if err != nil {
		return domain.FeatureGateDecision{}, err
	}

	rule, ok := service.capabilityRules[check.CapabilityKey]
	if !ok {
		return domain.FeatureGateDecision{}, fmt.Errorf(
			"%w: %s",
			ErrCapabilityRuleNotFound,
			check.CapabilityKey,
		)
	}

	return rule.Evaluate(account.Subscription, account.Quota, check.InstanceDisabled), nil
}

func (service *Service) CommercialStatusForOrganization(
	ctx context.Context,
	organizationID int64,
) (domain.CommercialStatus, error) {
	account, err := service.resolveOrganizationAccount(ctx, organizationID)
	if err != nil {
		return domain.CommercialStatus{}, err
	}
	return account.OrganizationStatus(), nil
}

func (service *Service) CommercialStatusForWorkspace(
	ctx context.Context,
	workspaceID int64,
) (domain.CommercialStatus, error) {
	account, _, err := service.resolveWorkspaceAccount(ctx, workspaceID)
	if err != nil {
		return domain.CommercialStatus{}, err
	}
	return account.WorkspaceStatus(workspaceID)
}

func (service *Service) ProvisionDefaultOrganization(ctx context.Context, organizationID int64) error {
	account, ok, err := service.accounts.FindByOrganizationID(ctx, organizationID)
	if err != nil {
		return err
	}
	if ok {
		if account.OrganizationID == organizationID {
			return nil
		}
		return fmt.Errorf("billing account organization mismatch for organization %d", organizationID)
	}

	account, err = domain.DefaultCommercialAccount(organizationID)
	if err != nil {
		return err
	}
	return service.accounts.Save(ctx, account)
}

func (service *Service) resolveWorkspaceAccount(
	ctx context.Context,
	workspaceID int64,
) (domain.CommercialAccount, int64, error) {
	organizationID, err := service.workspaces.OrganizationIDForWorkspace(ctx, workspaceID)
	if err != nil {
		return domain.CommercialAccount{}, 0, err
	}
	account, err := service.resolveOrganizationAccount(ctx, organizationID)
	if err != nil {
		return domain.CommercialAccount{}, 0, err
	}
	return account, organizationID, nil
}

func (service *Service) resolveOrganizationAccount(
	ctx context.Context,
	organizationID int64,
) (domain.CommercialAccount, error) {
	account, ok, err := service.accounts.FindByOrganizationID(ctx, organizationID)
	if err != nil {
		return domain.CommercialAccount{}, err
	}
	if ok {
		return account, nil
	}
	return domain.CommercialAccount{}, fmt.Errorf("%w: organization %d", ErrCommercialAccountNotFound, organizationID)
}

func int64Ref(value int64) *int64 {
	return &value
}
