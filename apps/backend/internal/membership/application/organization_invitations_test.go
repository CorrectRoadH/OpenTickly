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
	membershippostgres "opentoggl/backend/apps/backend/internal/membership/infra/postgres"
	tenantapplication "opentoggl/backend/apps/backend/internal/tenant/application"
	tenantpostgres "opentoggl/backend/apps/backend/internal/tenant/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestServicePersistsOrganizationInvitations(t *testing.T) {
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

	sender, err := identitydomain.RegisterUser(identitydomain.RegisterParams{
		ID:       2001,
		Email:    "owner@example.com",
		FullName: "Owner User",
		Password: "secret1",
		APIToken: "owner-token",
	})
	if err != nil {
		t.Fatalf("register sender: %v", err)
	}
	if err := identitypostgres.NewUserRepository(database.Pool).Save(ctx, sender); err != nil {
		t.Fatalf("save sender: %v", err)
	}

	service, err := membershipapplication.NewService(membershippostgres.NewStore(database.Pool))
	if err != nil {
		t.Fatalf("new membership service: %v", err)
	}

	invitations, err := service.CreateOrganizationInvitations(ctx, membershipapplication.CreateOrganizationInvitationsCommand{
		OrganizationID:   int64(tenantResult.OrganizationID),
		OrganizationName: "Membership Org",
		SenderUserID:     sender.ID(),
		SenderName:       sender.FullName(),
		SenderEmail:      sender.Email(),
		Emails:           []string{"invitee@example.com", "invitee-two@example.com"},
		Workspaces: []membershipapplication.InvitationWorkspaceAssignment{
			{WorkspaceID: int64(tenantResult.WorkspaceID)},
		},
	})
	if err != nil {
		t.Fatalf("create invitations: %v", err)
	}
	if len(invitations) != 2 {
		t.Fatalf("expected two invitations, got %#v", invitations)
	}

	loaded, err := service.GetOrganizationInvitation(ctx, invitations[0].Code)
	if err != nil {
		t.Fatalf("get invitation: %v", err)
	}
	if loaded.Email != "invitee@example.com" || loaded.OrganizationName != "Membership Org" {
		t.Fatalf("expected loaded invitation metadata, got %#v", loaded)
	}

	resent, err := service.ResendOrganizationInvitation(ctx, int64(tenantResult.OrganizationID), loaded.ID)
	if err != nil {
		t.Fatalf("resend invitation: %v", err)
	}
	if resent.ID != loaded.ID || resent.Code != loaded.Code {
		t.Fatalf("expected resend to keep invitation identity, got %#v", resent)
	}

	accepted, err := service.AcceptOrganizationInvitation(ctx, invitations[0].Code)
	if err != nil {
		t.Fatalf("accept invitation: %v", err)
	}
	if accepted.Status != membershipapplication.InvitationStatusAccepted {
		t.Fatalf("expected accepted invitation, got %#v", accepted)
	}

	rejected, err := service.RejectOrganizationInvitation(ctx, invitations[1].Code)
	if err != nil {
		t.Fatalf("reject invitation: %v", err)
	}
	if rejected.Status != membershipapplication.InvitationStatusRejected {
		t.Fatalf("expected rejected invitation, got %#v", rejected)
	}
}
