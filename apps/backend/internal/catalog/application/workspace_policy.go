package application

import (
	"context"
	"fmt"

	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
)

// TenantWorkspaceSettingsAdapter adapts a tenant store's GetWorkspace method
// to the WorkspaceSettingsLookup interface that the catalog service requires
// for workspace settings enforcement.
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

// MembershipRoleAdapter adapts a membership store's FindWorkspaceMemberByUserID
// method to the MemberRoleLookup interface.
type MembershipRoleAdapter struct {
	isAdmin func(ctx context.Context, workspaceID int64, userID int64) (bool, error)
}

// NewMembershipRoleAdapter creates a MemberRoleLookup from a function that
// checks admin status.
func NewMembershipRoleAdapter(
	fn func(ctx context.Context, workspaceID int64, userID int64) (bool, error),
) *MembershipRoleAdapter {
	return &MembershipRoleAdapter{isAdmin: fn}
}

func (adapter *MembershipRoleAdapter) IsWorkspaceAdmin(
	ctx context.Context,
	workspaceID int64,
	userID int64,
) (bool, error) {
	return adapter.isAdmin(ctx, workspaceID, userID)
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

// MemberRoleFromMembershipStore creates a MemberRoleLookup that reads
// workspace member roles from a membership postgres store.
func MemberRoleFromMembershipStore(
	findMember func(ctx context.Context, workspaceID int64, userID int64) (memberRole string, found bool, err error),
) *MembershipRoleAdapter {
	return NewMembershipRoleAdapter(func(ctx context.Context, workspaceID int64, userID int64) (bool, error) {
		role, found, err := findMember(ctx, workspaceID, userID)
		if err != nil {
			return false, err
		}
		if !found {
			return false, nil
		}
		return role == "admin", nil
	})
}
