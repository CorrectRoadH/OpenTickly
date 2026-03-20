package infra

import (
	"context"
	"fmt"

	"opentoggl/backend/backend/internal/billing/domain"
)

type MemoryAccountRepository struct {
	accounts map[int64]domain.CommercialAccount
}

func NewMemoryAccountRepository() *MemoryAccountRepository {
	return &MemoryAccountRepository{
		accounts: make(map[int64]domain.CommercialAccount),
	}
}

func (repository *MemoryAccountRepository) FindByOrganizationID(
	_ context.Context,
	organizationID int64,
) (domain.CommercialAccount, bool, error) {
	account, ok := repository.accounts[organizationID]
	return account, ok, nil
}

func (repository *MemoryAccountRepository) Save(
	_ context.Context,
	account domain.CommercialAccount,
) error {
	repository.accounts[account.OrganizationID] = account
	return nil
}

type MemoryWorkspaceOwnership struct {
	workspaceOrganizations map[int64]int64
}

func NewMemoryWorkspaceOwnership(workspaceOrganizations map[int64]int64) *MemoryWorkspaceOwnership {
	copied := make(map[int64]int64, len(workspaceOrganizations))
	for workspaceID, organizationID := range workspaceOrganizations {
		copied[workspaceID] = organizationID
	}
	return &MemoryWorkspaceOwnership{workspaceOrganizations: copied}
}

func (ownership *MemoryWorkspaceOwnership) OrganizationIDForWorkspace(
	_ context.Context,
	workspaceID int64,
) (int64, error) {
	organizationID, ok := ownership.workspaceOrganizations[workspaceID]
	if !ok {
		return 0, fmt.Errorf("workspace %d does not have a billing organization mapping", workspaceID)
	}
	return organizationID, nil
}
