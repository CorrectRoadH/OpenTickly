package domain

import (
	"fmt"

	"github.com/samber/lo"
)

type CommercialAccount struct {
	OrganizationID int64
	CustomerID     string
	Subscription   Subscription
	Quota          QuotaWindow
}

type CommercialStatus struct {
	OrganizationID int64
	WorkspaceID    *int64
	CustomerID     string
	Subscription   Subscription
}

func NewCommercialAccount(
	organizationID int64,
	customerID string,
	subscription Subscription,
	quota QuotaWindow,
) (CommercialAccount, error) {
	if organizationID <= 0 {
		return CommercialAccount{}, fmt.Errorf("organization id must be positive")
	}
	if quota.OrganizationID != organizationID {
		return CommercialAccount{}, fmt.Errorf("quota window must belong to the same organization")
	}
	return CommercialAccount{
		OrganizationID: organizationID,
		CustomerID:     customerID,
		Subscription:   subscription,
		Quota:          quota,
	}, nil
}

// DefaultCommercialAccount builds the canonical default billing state for a
// newly provisioned organization.
func DefaultCommercialAccount(organizationID int64) (CommercialAccount, error) {
	subscription, err := NewSubscription(PlanFree, SubscriptionStateFree)
	if err != nil {
		return CommercialAccount{}, err
	}
	quota, err := NewQuotaWindow(organizationID, 0, 0, 0)
	if err != nil {
		return CommercialAccount{}, err
	}
	return NewCommercialAccount(organizationID, "", subscription, quota)
}

func (account CommercialAccount) OrganizationStatus() CommercialStatus {
	return CommercialStatus{
		OrganizationID: account.OrganizationID,
		CustomerID:     account.CustomerID,
		Subscription:   account.Subscription,
	}
}

func (account CommercialAccount) WorkspaceStatus(workspaceID int64) (CommercialStatus, error) {
	if workspaceID <= 0 {
		return CommercialStatus{}, fmt.Errorf("workspace id must be positive")
	}
	// Workspace subscription views are projections of the same org-owned billing
	// fact, not a second mutable subscription record.
	return CommercialStatus{
		OrganizationID: account.OrganizationID,
		WorkspaceID:    lo.ToPtr(workspaceID),
		CustomerID:     account.CustomerID,
		Subscription:   account.Subscription,
	}, nil
}
