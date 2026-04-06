package application_test

import (
	"context"
	"fmt"
	"testing"
	"time"

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
	"opentoggl/backend/apps/backend/internal/log"

	"github.com/samber/lo"
)

// uniqueTestID generates a unique base identifier for test isolation
func uniqueTestID(t *testing.T) int64 {
	return time.Now().UnixNano() % 100000000000 // nanoseconds truncated to avoid overflow
}

func TestServicePersistsWorkspaceMemberLifecycleWithPostgresStore(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	// Generate unique IDs to avoid collisions when tests run in parallel
	baseID := uniqueTestID(t)
	ownerOneID := baseID
	ownerTwoID := baseID + 1
	ownerOneEmail := fmt.Sprintf("owner-one-%d@example.com", baseID)
	ownerTwoEmail := fmt.Sprintf("owner-two-%d@example.com", baseID)
	inviteeEmail := fmt.Sprintf("invitee-%d@example.com", baseID)

	billingService, err := billingapplication.NewService(
		billingpostgres.NewAccountRepository(database.Pool),
		billingpostgres.NewWorkspaceOwnershipLookup(database.Pool),
		[]billingdomain.CapabilityRule{
			{Key: "reports.profitability", MinimumPlan: billingdomain.PlanEnterprise},
			{Key: "reports.summary", MinimumPlan: billingdomain.PlanStarter, RequiresQuota: true},
			{Key: "time_tracking", MinimumPlan: billingdomain.PlanFree},
		},
		log.NopLogger(),
	)
	if err != nil {
		t.Fatalf("new billing service: %v", err)
	}

	tenantService, err := tenantapplication.NewService(tenantpostgres.NewStore(database.Pool), billingService, log.NopLogger())
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

	service, err := membershipapplication.NewService(membershippostgres.NewStore(database.Pool), membershipapplication.WithLogger(log.NopLogger()))
	if err != nil {
		t.Fatalf("new membership service: %v", err)
	}

	for _, user := range []struct {
		id       int64
		email    string
		fullName string
	}{
		{id: ownerOneID, email: ownerOneEmail, fullName: "Owner One"},
		{id: ownerTwoID, email: ownerTwoEmail, fullName: "Owner Two"},
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
		UserID:      ownerOneID,
	})
	if err != nil {
		t.Fatalf("ensure owner one: %v", err)
	}
	ownerTwo, err := service.EnsureWorkspaceOwner(ctx, membershipapplication.EnsureWorkspaceOwnerCommand{
		WorkspaceID: int64(tenantResult.WorkspaceID),
		UserID:      ownerTwoID,
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
		Email:       inviteeEmail,
		Role:        lo.ToPtr(membershipdomain.WorkspaceRoleAdmin),
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
		HourlyRate:  lo.ToPtr(120.0),
		LaborCost:   lo.ToPtr(75.0),
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

// TestServiceListMembersWithLegacyOwnerRole verifies that workspace members
// created with role='owner' (v0.0.17 data) can still be listed after upgrade.
// This is a regression test for the missing migration of 'owner' → 'admin'.
func TestServiceListMembersWithLegacyOwnerRole(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	baseID := uniqueTestID(t)
	ownerEmail := fmt.Sprintf("legacy-owner-%d@example.com", baseID)

	billingService, err := billingapplication.NewService(
		billingpostgres.NewAccountRepository(database.Pool),
		billingpostgres.NewWorkspaceOwnershipLookup(database.Pool),
		[]billingdomain.CapabilityRule{
			{Key: "time_tracking", MinimumPlan: billingdomain.PlanFree},
		},
		log.NopLogger(),
	)
	if err != nil {
		t.Fatalf("new billing service: %v", err)
	}

	tenantService, err := tenantapplication.NewService(tenantpostgres.NewStore(database.Pool), billingService, log.NopLogger())
	if err != nil {
		t.Fatalf("new tenant service: %v", err)
	}
	tenantResult, err := tenantService.CreateOrganization(ctx, tenantapplication.CreateOrganizationCommand{
		Name:          "Legacy Owner Org",
		WorkspaceName: "Legacy Owner Workspace",
	})
	if err != nil {
		t.Fatalf("create organization: %v", err)
	}

	// Register the identity user.
	record, registerErr := identitydomain.RegisterUser(identitydomain.RegisterParams{
		ID:       baseID,
		Email:    ownerEmail,
		FullName: "Legacy Owner",
		Password: "secret1",
		APIToken: ownerEmail + "-token",
	})
	if registerErr != nil {
		t.Fatalf("register identity user: %v", registerErr)
	}
	if saveErr := identitypostgres.NewUserRepository(database.Pool).Save(ctx, record); saveErr != nil {
		t.Fatalf("save identity user: %v", saveErr)
	}

	// Simulate v0.0.17 upgraded DB: temporarily widen the constraint to allow
	// 'owner', insert a legacy row, then restore the current constraint.
	// This mirrors what a real v0.0.17 database looks like before migration.
	_, err = database.Pool.Exec(ctx, `
		alter table membership_workspace_members
			drop constraint membership_workspace_members_role_check,
			add constraint membership_workspace_members_role_check
				check (role in ('owner', 'admin', 'member', 'projectlead', 'teamlead'))
	`)
	if err != nil {
		t.Fatalf("widen role constraint: %v", err)
	}
	_, err = database.Pool.Exec(ctx, `
		insert into membership_workspace_members
			(workspace_id, user_id, email, full_name, role, state, created_by)
		values ($1, $2, $3, $4, 'owner', 'joined', $2)
	`, tenantResult.WorkspaceID, baseID, ownerEmail, "Legacy Owner")
	if err != nil {
		t.Fatalf("insert legacy owner member: %v", err)
	}

	service, err := membershipapplication.NewService(membershippostgres.NewStore(database.Pool), membershipapplication.WithLogger(log.NopLogger()))
	if err != nil {
		t.Fatalf("new membership service: %v", err)
	}

	// This should succeed: the owner should be treated as admin.
	members, err := service.ListWorkspaceMembers(ctx, int64(tenantResult.WorkspaceID), baseID)
	if err != nil {
		t.Fatalf("list members with legacy owner role: %v", err)
	}
	if len(members) != 1 {
		t.Fatalf("expected 1 member, got %d", len(members))
	}
	// After migration, role should be normalized to 'admin'.
	if members[0].Role != membershipdomain.WorkspaceRoleAdmin {
		t.Fatalf("expected role admin, got %q", members[0].Role)
	}
}

func TestServiceEnsureWorkspaceOwnerRequiresExistingIdentityUserWithPostgresStore(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	service, err := membershipapplication.NewService(membershippostgres.NewStore(database.Pool), membershipapplication.WithLogger(log.NopLogger()))
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
