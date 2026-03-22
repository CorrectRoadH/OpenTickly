package application_test

import (
	"context"
	"testing"

	billingapplication "opentoggl/backend/apps/backend/internal/billing/application"
	billingdomain "opentoggl/backend/apps/backend/internal/billing/domain"
	billingpostgres "opentoggl/backend/apps/backend/internal/billing/infra/postgres"
	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"
	membershippostgres "opentoggl/backend/apps/backend/internal/membership/infra/postgres"
	tenantapplication "opentoggl/backend/apps/backend/internal/tenant/application"
	tenantpostgres "opentoggl/backend/apps/backend/internal/tenant/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestServicePersistsWorkspaceMemberLifecycleWithPostgresStore(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	billingService, err := billingapplication.NewService(
		billingpostgres.NewAccountRepository(database.Pool),
		billingpostgres.NewWorkspaceOwnershipLookup(database.Pool),
		[]billingdomain.CapabilityRule{
			{Key: "reports.profitability", MinimumPlan: billingdomain.PlanEnterprise},
			{Key: "reports.summary", MinimumPlan: billingdomain.PlanStarter, RequiresQuota: true},
			{Key: "time_tracking", MinimumPlan: billingdomain.PlanFree},
		},
	)
	if err != nil {
		t.Fatalf("new billing service: %v", err)
	}

	tenantService, err := tenantapplication.NewService(tenantpostgres.NewStore(database.Pool), billingService)
	if err != nil {
		t.Fatalf("new tenant service: %v", err)
	}
	tenantResult, err := tenantService.CreateOrganization(ctx, tenantapplication.CreateOrganizationCommand{
		Name:          "Membership Org",
		WorkspaceName: "Membership Workspace",
	})
	if err != nil {
		t.Fatalf("create organization: %v", err)
	}

	service, err := membershipapplication.NewService(membershippostgres.NewStore(database.Pool))
	if err != nil {
		t.Fatalf("new membership service: %v", err)
	}

	for _, user := range []struct {
		id       int64
		email    string
		fullName string
	}{
		{id: 1001, email: "owner-one@example.com", fullName: "Owner One"},
		{id: 1002, email: "owner-two@example.com", fullName: "Owner Two"},
	} {
		record, registerErr := identitydomain.RegisterUser(identitydomain.RegisterParams{
			ID:       user.id,
			Email:    user.email,
			FullName: user.fullName,
			Password: "secret1",
			APIToken: user.email + "-token",
		})
		if registerErr != nil {
			t.Fatalf("register identity user %d: %v", user.id, registerErr)
		}
		if saveErr := identitypostgres.NewUserRepository(database.Pool).Save(ctx, record); saveErr != nil {
			t.Fatalf("save identity user %d: %v", user.id, saveErr)
		}
	}

	ownerOne, err := service.EnsureWorkspaceOwner(ctx, membershipapplication.EnsureWorkspaceOwnerCommand{
		WorkspaceID: int64(tenantResult.WorkspaceID),
		UserID:      1001,
	})
	if err != nil {
		t.Fatalf("ensure owner one: %v", err)
	}
	ownerTwo, err := service.EnsureWorkspaceOwner(ctx, membershipapplication.EnsureWorkspaceOwnerCommand{
		WorkspaceID: int64(tenantResult.WorkspaceID),
		UserID:      1002,
	})
	if err != nil {
		t.Fatalf("ensure owner two: %v", err)
	}

	members, err := service.ListWorkspaceMembers(ctx, int64(tenantResult.WorkspaceID), *ownerOne.UserID)
	if err != nil {
		t.Fatalf("list members: %v", err)
	}
	if len(members) != 2 {
		t.Fatalf("expected two owner members, got %#v", members)
	}

	invited, err := service.InviteWorkspaceMember(ctx, membershipapplication.InviteWorkspaceMemberCommand{
		WorkspaceID: int64(tenantResult.WorkspaceID),
		RequestedBy: *ownerOne.UserID,
		Email:       "invitee@example.com",
		Role:        rolePtr(membershipdomain.WorkspaceRoleAdmin),
	})
	if err != nil {
		t.Fatalf("invite member: %v", err)
	}
	if invited.State != membershipdomain.WorkspaceMemberStateInvited {
		t.Fatalf("expected invited state, got %#v", invited)
	}

	updated, err := service.UpdateWorkspaceMemberRateCost(ctx, membershipapplication.UpdateWorkspaceMemberRateCostCommand{
		WorkspaceID: int64(tenantResult.WorkspaceID),
		MemberID:    ownerTwo.ID,
		RequestedBy: *ownerOne.UserID,
		HourlyRate:  float64Ptr(120),
		LaborCost:   float64Ptr(75),
	})
	if err != nil {
		t.Fatalf("update rate cost: %v", err)
	}
	if updated.HourlyRate == nil || *updated.HourlyRate != 120 {
		t.Fatalf("expected hourly rate 120, got %#v", updated.HourlyRate)
	}

	disabled, err := service.DisableWorkspaceMember(ctx, int64(tenantResult.WorkspaceID), ownerTwo.ID, *ownerOne.UserID)
	if err != nil {
		t.Fatalf("disable member: %v", err)
	}
	if disabled.State != membershipdomain.WorkspaceMemberStateDisabled {
		t.Fatalf("expected disabled state, got %#v", disabled)
	}

	restored, err := service.RestoreWorkspaceMember(ctx, int64(tenantResult.WorkspaceID), ownerTwo.ID, *ownerOne.UserID)
	if err != nil {
		t.Fatalf("restore member: %v", err)
	}
	if restored.State != membershipdomain.WorkspaceMemberStateRestored {
		t.Fatalf("expected restored state, got %#v", restored)
	}

	removed, err := service.RemoveWorkspaceMember(ctx, int64(tenantResult.WorkspaceID), ownerTwo.ID, *ownerOne.UserID)
	if err != nil {
		t.Fatalf("remove member: %v", err)
	}
	if removed.State != membershipdomain.WorkspaceMemberStateRemoved {
		t.Fatalf("expected removed state, got %#v", removed)
	}
}

func TestServiceEnsureWorkspaceOwnerRequiresExistingIdentityUserWithPostgresStore(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	service, err := membershipapplication.NewService(membershippostgres.NewStore(database.Pool))
	if err != nil {
		t.Fatalf("new membership service: %v", err)
	}

	_, err = service.EnsureWorkspaceOwner(ctx, membershipapplication.EnsureWorkspaceOwnerCommand{
		WorkspaceID: 1,
		UserID:      9999,
	})
	if err != membershipapplication.ErrWorkspaceIdentityUserNotFound {
		t.Fatalf("expected ErrWorkspaceIdentityUserNotFound, got %v", err)
	}
}

func rolePtr(role membershipdomain.WorkspaceRole) *membershipdomain.WorkspaceRole {
	return &role
}

func float64Ptr(value float64) *float64 {
	return &value
}
