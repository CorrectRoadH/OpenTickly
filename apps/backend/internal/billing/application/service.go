package application

import (
	"context"
	"errors"
	"fmt"
	"slices"

	"opentoggl/backend/apps/backend/internal/billing/domain"
	"opentoggl/backend/apps/backend/internal/log"

	"github.com/samber/lo"
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

type PlanCatalogEntry struct {
	Plan         domain.Plan
	Capabilities []domain.FeatureCapability
}

type Service struct {
	accounts        AccountRepository
	workspaces      WorkspaceOwnershipLookup
	capabilityRules map[string]domain.CapabilityRule
	capabilityKeys  []string
	logger          log.Logger
}

func NewService(
	accounts AccountRepository,
	workspaces WorkspaceOwnershipLookup,
	rules []domain.CapabilityRule,
	logger log.Logger,
) (*Service, error) {
	if accounts == nil {
		return nil, fmt.Errorf("billing accounts repository is required")
	}
	if workspaces == nil {
		return nil, fmt.Errorf("workspace ownership lookup is required")
	}
	if logger == nil {
		return nil, fmt.Errorf("billing logger is required")
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
		logger:          logger,
	}, nil
}

func (service *Service) WorkspaceQuotaSnapshot(
	ctx context.Context,
	workspaceID int64,
) (domain.QuotaWindow, map[string]string, error) {
	service.logger.InfoContext(ctx, "getting workspace quota snapshot",
		"workspace_id", workspaceID,
	)
	account, _, err := service.resolveWorkspaceAccount(ctx, workspaceID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get workspace quota snapshot",
			"workspace_id", workspaceID,
			"error", err.Error(),
		)
		return domain.QuotaWindow{}, nil, err
	}
	return account.Quota, account.Quota.Headers(), nil
}

func (service *Service) OrganizationQuotaSnapshot(
	ctx context.Context,
	organizationID int64,
) (domain.QuotaWindow, map[string]string, error) {
	service.logger.InfoContext(ctx, "getting organization quota snapshot",
		"organization_id", organizationID,
	)
	account, err := service.resolveOrganizationAccount(ctx, organizationID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get organization quota snapshot",
			"organization_id", organizationID,
			"error", err.Error(),
		)
		return domain.QuotaWindow{}, nil, err
	}
	return account.Quota, account.Quota.Headers(), nil
}

func (service *Service) WorkspaceCapabilitySnapshot(
	ctx context.Context,
	workspaceID int64,
) (domain.CapabilitySnapshot, error) {
	service.logger.InfoContext(ctx, "getting workspace capability snapshot",
		"workspace_id", workspaceID,
	)
	account, organizationID, err := service.resolveWorkspaceAccount(ctx, workspaceID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get workspace capability snapshot",
			"workspace_id", workspaceID,
			"error", err.Error(),
		)
		return domain.CapabilitySnapshot{}, err
	}

	capabilities := make([]domain.FeatureCapability, 0, len(service.capabilityKeys))
	for _, key := range service.capabilityKeys {
		capabilities = append(capabilities, service.capabilityRules[key].Snapshot(account.Subscription))
	}

	return domain.CapabilitySnapshot{
		Context: domain.CapabilityContext{
			OrganizationID: lo.ToPtr(organizationID),
			WorkspaceID:    lo.ToPtr(workspaceID),
			Scope:          "workspace",
		},
		Capabilities: capabilities,
	}, nil
}

func (service *Service) CheckWorkspaceCapability(
	ctx context.Context,
	check CapabilityCheck,
) (domain.FeatureGateDecision, error) {
	service.logger.InfoContext(ctx, "checking workspace capability",
		"workspace_id", check.WorkspaceID,
		"capability_key", check.CapabilityKey,
	)
	account, _, err := service.resolveWorkspaceAccount(ctx, check.WorkspaceID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to check workspace capability",
			"workspace_id", check.WorkspaceID,
			"capability_key", check.CapabilityKey,
			"error", err.Error(),
		)
		return domain.FeatureGateDecision{}, err
	}

	rule, ok := service.capabilityRules[check.CapabilityKey]
	if !ok {
		service.logger.WarnContext(ctx, "capability rule not found",
			"capability_key", check.CapabilityKey,
		)
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
	service.logger.InfoContext(ctx, "getting commercial status for organization",
		"organization_id", organizationID,
	)
	account, err := service.resolveOrganizationAccount(ctx, organizationID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get commercial status for organization",
			"organization_id", organizationID,
			"error", err.Error(),
		)
		return domain.CommercialStatus{}, err
	}
	return account.OrganizationStatus(), nil
}

func (service *Service) CommercialStatusForWorkspace(
	ctx context.Context,
	workspaceID int64,
) (domain.CommercialStatus, error) {
	service.logger.InfoContext(ctx, "getting commercial status for workspace",
		"workspace_id", workspaceID,
	)
	account, _, err := service.resolveWorkspaceAccount(ctx, workspaceID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get commercial status for workspace",
			"workspace_id", workspaceID,
			"error", err.Error(),
		)
		return domain.CommercialStatus{}, err
	}
	return account.WorkspaceStatus(workspaceID)
}

func (service *Service) AvailablePlans() []PlanCatalogEntry {
	plans := []domain.Plan{
		domain.PlanFree,
		domain.PlanStarter,
		domain.PlanPremium,
		domain.PlanEnterprise,
	}

	entries := make([]PlanCatalogEntry, 0, len(plans))
	for _, plan := range plans {
		subscription, err := domain.NewSubscription(plan, domain.SubscriptionStateActive)
		if err != nil {
			continue
		}

		capabilities := make([]domain.FeatureCapability, 0, len(service.capabilityKeys))
		for _, key := range service.capabilityKeys {
			capabilities = append(capabilities, service.capabilityRules[key].Snapshot(subscription))
		}

		entries = append(entries, PlanCatalogEntry{
			Plan:         plan,
			Capabilities: capabilities,
		})
	}

	return entries
}

func (service *Service) ProvisionDefaultOrganization(ctx context.Context, organizationID int64) error {
	service.logger.InfoContext(ctx, "provisioning default organization",
		"organization_id", organizationID,
	)
	account, ok, err := service.accounts.FindByOrganizationID(ctx, organizationID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to find account for provisioning",
			"organization_id", organizationID,
			"error", err.Error(),
		)
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
		service.logger.ErrorContext(ctx, "failed to create default account",
			"organization_id", organizationID,
			"error", err.Error(),
		)
		return err
	}
	if err := service.accounts.Save(ctx, account); err != nil {
		service.logger.ErrorContext(ctx, "failed to save default account",
			"organization_id", organizationID,
			"error", err.Error(),
		)
		return err
	}
	service.logger.InfoContext(ctx, "provisioned default organization",
		"organization_id", organizationID,
	)
	return nil
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
