package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type WorkspaceOwnershipLookup struct {
	pool *pgxpool.Pool
}

func NewWorkspaceOwnershipLookup(pool *pgxpool.Pool) *WorkspaceOwnershipLookup {
	return &WorkspaceOwnershipLookup{pool: pool}
}

func (lookup *WorkspaceOwnershipLookup) OrganizationIDForWorkspace(
	ctx context.Context,
	workspaceID int64,
) (int64, error) {
	var organizationID int64
	err := lookup.pool.QueryRow(ctx, `
		select organization_id
		from tenant_workspaces
		where id = $1
	`, workspaceID).Scan(&organizationID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, fmt.Errorf("workspace %d not found", workspaceID)
		}
		return 0, fmt.Errorf("query organization for workspace %d: %w", workspaceID, err)
	}
	return organizationID, nil
}
