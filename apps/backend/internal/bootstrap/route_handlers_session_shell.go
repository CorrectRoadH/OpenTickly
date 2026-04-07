package bootstrap

import (
	"context"
	"strings"
	"sync"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	billingapplication "opentoggl/backend/apps/backend/internal/billing/application"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
	identityweb "opentoggl/backend/apps/backend/internal/identity/transport/http/web"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"
	tenantapplication "opentoggl/backend/apps/backend/internal/tenant/application"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
	tenantweb "opentoggl/backend/apps/backend/internal/tenant/transport/http/web"

	"github.com/samber/lo"
)

type billingBackedSessionShell struct {
	tenant     *tenantapplication.Service
	billing    *billingapplication.Service
	identity   *identityapplication.Service
	membership *membershipapplication.Service
	userHomes  userHomeRepository

	mu sync.Mutex
}

type sessionHome struct {
	organizationID int64
	workspaceID    int64
}

func newBillingBackedSessionShell(
	tenant *tenantapplication.Service,
	billing *billingapplication.Service,
	identity *identityapplication.Service,
	membership *membershipapplication.Service,
	userHomes userHomeRepository,
) *billingBackedSessionShell {
	return &billingBackedSessionShell{
		tenant:     tenant,
		billing:    billing,
		identity:   identity,
		membership: membership,
		userHomes:  userHomes,
	}
}

func (provider *billingBackedSessionShell) SessionShell(
	ctx context.Context,
	user identityapplication.UserSnapshot,
) (identityweb.SessionShellData, error) {
	home, err := provider.ensureHome(ctx, user)
	if err != nil {
		return identityweb.SessionShellData{}, err
	}

	organization, err := provider.tenant.GetOrganization(ctx, tenantdomain.OrganizationID(home.organizationID))
	if err != nil {
		return identityweb.SessionShellData{}, err
	}
	workspace, err := provider.tenant.GetWorkspace(ctx, tenantdomain.WorkspaceID(home.workspaceID))
	if err != nil {
		return identityweb.SessionShellData{}, err
	}
	capabilities, err := provider.billing.WorkspaceCapabilitySnapshot(ctx, home.workspaceID)
	if err != nil {
		return identityweb.SessionShellData{}, err
	}
	quota, _, err := provider.billing.WorkspaceQuotaSnapshot(ctx, home.workspaceID)
	if err != nil {
		return identityweb.SessionShellData{}, err
	}
	organizations, err := provider.tenant.ListOrganizationsByUserID(ctx, user.ID)
	if err != nil {
		return identityweb.SessionShellData{}, err
	}
	workspaces, err := provider.tenant.ListWorkspacesByUserID(ctx, user.ID)
	if err != nil {
		return identityweb.SessionShellData{}, err
	}

	return identityweb.SessionShellData{
		CurrentOrganizationID:    lo.ToPtr(int(home.organizationID)),
		CurrentWorkspaceID:       lo.ToPtr(int(home.workspaceID)),
		OrganizationSubscription: tenantweb.SubscriptionBody(organization.Commercial),
		WorkspaceSubscription:    tenantweb.SubscriptionBody(workspace.Commercial),
		Organizations: lo.Map(organizations, func(organization tenantapplication.OrganizationView, _ int) webapi.OrganizationSettings {
			return tenantweb.OrganizationBody(organization)
		}),
		Workspaces: lo.Map(workspaces, func(workspace tenantapplication.WorkspaceView, _ int) webapi.WorkspaceSettings {
			return tenantweb.WorkspaceBody(workspace)
		}),
		WorkspaceCapabilities: tenantweb.CapabilitySnapshotToWeb(capabilities),
		WorkspaceQuota:        tenantweb.QuotaWindowToWeb(quota),
	}, nil
}

func (provider *billingBackedSessionShell) ensureHome(
	ctx context.Context,
	user identityapplication.UserSnapshot,
) (sessionHome, error) {
	if organizationID, workspaceID, ok, err := provider.userHomes.FindByUserID(ctx, user.ID); err != nil {
		return sessionHome{}, err
	} else if ok {
		home := sessionHome{organizationID: organizationID, workspaceID: workspaceID}
		if err := provider.ensureWorkspaceOwner(ctx, user, home); err != nil {
			return sessionHome{}, err
		}
		if err := provider.ensureDefaultWorkspace(ctx, user, home); err != nil {
			return sessionHome{}, err
		}
		return home, nil
	}

	provider.mu.Lock()
	defer provider.mu.Unlock()
	if organizationID, workspaceID, ok, err := provider.userHomes.FindByUserID(ctx, user.ID); err != nil {
		return sessionHome{}, err
	} else if ok {
		home := sessionHome{organizationID: organizationID, workspaceID: workspaceID}
		if err := provider.ensureWorkspaceOwner(ctx, user, home); err != nil {
			return sessionHome{}, err
		}
		if err := provider.ensureDefaultWorkspace(ctx, user, home); err != nil {
			return sessionHome{}, err
		}
		return home, nil
	}

	created, err := provider.tenant.CreateOrganization(ctx, tenantapplication.CreateOrganizationCommand{
		Name:          defaultOrganizationName(user),
		WorkspaceName: defaultWorkspaceName(user),
	})
	if err != nil {
		return sessionHome{}, err
	}

	home := sessionHome{
		organizationID: int64(created.OrganizationID),
		workspaceID:    int64(created.WorkspaceID),
	}
	if err := provider.userHomes.Save(ctx, user.ID, home.organizationID, home.workspaceID); err != nil {
		return sessionHome{}, err
	}
	if err := provider.ensureOrganizationOwner(ctx, user, home); err != nil {
		return sessionHome{}, err
	}
	if err := provider.ensureWorkspaceOwner(ctx, user, home); err != nil {
		return sessionHome{}, err
	}
	if err := provider.ensureDefaultWorkspace(ctx, user, home); err != nil {
		return sessionHome{}, err
	}
	return home, nil
}

func (provider *billingBackedSessionShell) ensureOrganizationOwner(
	ctx context.Context,
	user identityapplication.UserSnapshot,
	home sessionHome,
) error {
	_, err := provider.membership.EnsureOrganizationMember(ctx, membershipapplication.EnsureOrganizationMemberCommand{
		OrganizationID: home.organizationID,
		UserID:         user.ID,
		Role:           membershipdomain.OrganizationRoleOwner,
	})
	return err
}

func (provider *billingBackedSessionShell) ensureWorkspaceOwner(
	ctx context.Context,
	user identityapplication.UserSnapshot,
	home sessionHome,
) error {
	_, err := provider.membership.EnsureWorkspaceOwner(ctx, membershipapplication.EnsureWorkspaceOwnerCommand{
		WorkspaceID: home.workspaceID,
		UserID:      user.ID,
	})
	return err
}

func (provider *billingBackedSessionShell) ensureDefaultWorkspace(
	ctx context.Context,
	user identityapplication.UserSnapshot,
	home sessionHome,
) error {
	if user.DefaultWorkspaceID > 0 {
		return nil
	}

	_, err := provider.identity.UpdateProfile(ctx, user.ID, identitydomain.ProfileUpdate{
		DefaultWorkspaceID: lo.ToPtr(home.workspaceID),
	})
	return err
}

func defaultOrganizationName(user identityapplication.UserSnapshot) string {
	if strings.TrimSpace(user.FullName) == "" {
		return "My Organization"
	}
	return strings.TrimSpace(user.FullName) + " Organization"
}

func defaultWorkspaceName(user identityapplication.UserSnapshot) string {
	if strings.TrimSpace(user.FullName) == "" {
		return "My Workspace"
	}
	return strings.TrimSpace(user.FullName) + " Workspace"
}
