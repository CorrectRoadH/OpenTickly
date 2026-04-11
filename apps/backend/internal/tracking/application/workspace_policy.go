package application

import (
	"context"
	"fmt"

	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
)

// TenantWorkspaceSettingsAdapter adapts a tenant store's GetWorkspace method
// to the WorkspaceSettingsLookup interface that the tracking service requires
// for report locking and required field enforcement.
type TenantWorkspaceSettingsAdapter struct {
	getWorkspace func(ctx context.Context, workspaceID int64) (tenantdomain.WorkspaceSettings, error)
}

// NewTenantWorkspaceSettingsAdapter creates a WorkspaceSettingsLookup from
// a function that resolves workspace settings by ID.
func NewTenantWorkspaceSettingsAdapter(
	fn func(ctx context.Context, workspaceID int64) (tenantdomain.WorkspaceSettings, error),
) *TenantWorkspaceSettingsAdapter {
	return &TenantWorkspaceSettingsAdapter{getWorkspace: fn}
}

func (adapter *TenantWorkspaceSettingsAdapter) GetWorkspaceSettings(
	ctx context.Context,
	workspaceID int64,
) (tenantdomain.WorkspaceSettings, error) {
	return adapter.getWorkspace(ctx, workspaceID)
}

// WorkspaceSettingsFromTenantStore creates a WorkspaceSettingsLookup that
// reads workspace settings from a tenant postgres store.
func WorkspaceSettingsFromTenantStore(
	getWorkspace func(ctx context.Context, workspaceID tenantdomain.WorkspaceID) (tenantdomain.Workspace, bool, error),
) *TenantWorkspaceSettingsAdapter {
	return NewTenantWorkspaceSettingsAdapter(func(ctx context.Context, workspaceID int64) (tenantdomain.WorkspaceSettings, error) {
		workspace, ok, err := getWorkspace(ctx, tenantdomain.WorkspaceID(workspaceID))
		if err != nil {
			return tenantdomain.WorkspaceSettings{}, err
		}
		if !ok {
			return tenantdomain.WorkspaceSettings{}, fmt.Errorf("workspace %d not found for settings lookup", workspaceID)
		}
		return workspace.Settings(), nil
	})
}
