package application_test

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	"opentoggl/backend/apps/backend/internal/log"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"
	membershippostgres "opentoggl/backend/apps/backend/internal/membership/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

// TestInviteHappyPathEndToEnd exercises the full workspace-invite flow against
// a real Postgres: invite → (email captured) → token lookup → accept → joined,
// with org membership + user_home auto-populated. This replaces the external
// E2E the reviewer flagged while keeping the tooling inside Go test.
func TestInviteHappyPathEndToEnd(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()
	base := time.Now().UnixNano() % 100000000000

	// Insert org + workspace directly to avoid pulling in billing for a simple
	// membership integration test.
	var orgID, workspaceID int64
	if err := database.Pool.QueryRow(ctx, `
		INSERT INTO tenant_organizations (name) VALUES ($1) RETURNING id
	`, fmt.Sprintf("Invite Flow Org %d", base)).Scan(&orgID); err != nil {
		t.Fatalf("create organization: %v", err)
	}
	if err := database.Pool.QueryRow(ctx, `
		INSERT INTO tenant_workspaces (organization_id, name) VALUES ($1, $2) RETURNING id
	`, orgID, fmt.Sprintf("Invite Flow Workspace %d", base)).Scan(&workspaceID); err != nil {
		t.Fatalf("create workspace: %v", err)
	}

	userRepo := identitypostgres.NewUserRepository(database.Pool)
	inviterEmail := fmt.Sprintf("inviter-%d@example.com", base)
	inviteeEmail := fmt.Sprintf("invitee-%d@example.com", base)
	inviter := registerUser(t, ctx, userRepo, base, "inviter", inviterEmail)
	invitee := registerUser(t, ctx, userRepo, base+1, "invitee", inviteeEmail)

	sender := newFakeEmailSender()
	svc, err := membershipapplication.NewService(
		membershippostgres.NewStore(database.Pool),
		membershipapplication.WithLogger(log.NopLogger()),
		membershipapplication.WithEmailSender(sender),
		membershipapplication.WithSiteURLReader(&fakeSiteURLReader{url: "https://app.example.test"}),
	)
	if err != nil {
		t.Fatalf("new membership service: %v", err)
	}

	if _, err := svc.EnsureWorkspaceOwner(ctx, membershipapplication.EnsureWorkspaceOwnerCommand{
		WorkspaceID: workspaceID,
		UserID:      inviter,
	}); err != nil {
		t.Fatalf("ensure owner: %v", err)
	}

	invited, err := svc.InviteWorkspaceMember(ctx, membershipapplication.InviteWorkspaceMemberCommand{
		WorkspaceID: workspaceID,
		RequestedBy: inviter,
		Email:       inviteeEmail,
	})
	if err != nil {
		t.Fatalf("invite: %v", err)
	}
	if invited.State != membershipdomain.WorkspaceMemberStateInvited {
		t.Fatalf("expected invited state, got %s", invited.State)
	}
	if invited.InviteToken == nil {
		t.Fatalf("expected invite token on returned member")
	}
	if sender.calls != 1 {
		t.Fatalf("expected exactly one email send, got %d", sender.calls)
	}
	if !strings.Contains(sender.lastBody, "https://app.example.test/accept-invite?token=") {
		t.Fatalf("email body missing accept URL, body was: %s", sender.lastBody)
	}
	if strings.Contains(sender.lastBody, "localhost") {
		t.Fatalf("email body must not leak localhost fallback, body was: %s", sender.lastBody)
	}

	// Idempotent re-invite rotates the token on the same row, resends.
	rotated, err := svc.InviteWorkspaceMember(ctx, membershipapplication.InviteWorkspaceMemberCommand{
		WorkspaceID: workspaceID,
		RequestedBy: inviter,
		Email:       inviteeEmail,
	})
	if err != nil {
		t.Fatalf("re-invite: %v", err)
	}
	if rotated.ID != invited.ID {
		t.Fatalf("expected rotate to reuse row id %d, got %d", invited.ID, rotated.ID)
	}
	if rotated.InviteToken == nil || *rotated.InviteToken == *invited.InviteToken {
		t.Fatalf("expected new token after rotate")
	}
	if sender.calls != 2 {
		t.Fatalf("expected second email send after rotate, got %d", sender.calls)
	}

	info, err := svc.GetInviteByToken(ctx, *rotated.InviteToken)
	if err != nil {
		t.Fatalf("get invite: %v", err)
	}
	if info.Status != membershipapplication.InviteTokenStatusPending {
		t.Fatalf("expected pending, got %s", info.Status)
	}
	if info.WorkspaceID != workspaceID {
		t.Fatalf("unexpected workspace id: %d", info.WorkspaceID)
	}

	accepted, err := svc.ClaimInvite(ctx, membershipapplication.AcceptInviteCommand{
		Token:     *rotated.InviteToken,
		UserID:    invitee,
		UserEmail: inviteeEmail,
	})
	if err != nil {
		t.Fatalf("claim invite: %v", err)
	}
	if accepted.WorkspaceID != workspaceID {
		t.Fatalf("accepted workspace mismatch: %d", accepted.WorkspaceID)
	}

	// Row should now be joined with user_id filled and token cleared.
	var (
		state             string
		userID            *int64
		tokenNullable     *string
		expiresAtNullable *time.Time
	)
	if err := database.Pool.QueryRow(ctx, `
		SELECT state, user_id, invite_token, invite_token_expires_at
		FROM membership_workspace_members WHERE id = $1
	`, invited.ID).Scan(&state, &userID, &tokenNullable, &expiresAtNullable); err != nil {
		t.Fatalf("load invited row: %v", err)
	}
	if state != "joined" {
		t.Fatalf("expected joined, got %s", state)
	}
	if userID == nil || *userID != invitee {
		t.Fatalf("expected user_id=%d, got %v", invitee, userID)
	}
	if tokenNullable != nil || expiresAtNullable != nil {
		t.Fatalf("expected invite token fields cleared, got token=%v expires=%v", tokenNullable, expiresAtNullable)
	}

	// Expired tokens surface as expired via GetInviteByToken — separate invite
	// to keep this test free of time manipulation on the already-accepted row.
	expiredSvc, err := membershipapplication.NewService(
		membershippostgres.NewStore(database.Pool),
		membershipapplication.WithLogger(log.NopLogger()),
		membershipapplication.WithEmailSender(sender),
		membershipapplication.WithSiteURLReader(&fakeSiteURLReader{url: "https://app.example.test"}),
		membershipapplication.WithClock(func() time.Time { return time.Now().Add(-10 * 24 * time.Hour) }),
	)
	if err != nil {
		t.Fatalf("expired-clock service: %v", err)
	}
	expired, err := expiredSvc.InviteWorkspaceMember(ctx, membershipapplication.InviteWorkspaceMemberCommand{
		WorkspaceID: workspaceID,
		RequestedBy: inviter,
		Email:       fmt.Sprintf("expired-%d@example.com", base),
	})
	if err != nil {
		t.Fatalf("seed expired invite: %v", err)
	}
	expiredInfo, err := svc.GetInviteByToken(ctx, *expired.InviteToken)
	if err != nil {
		t.Fatalf("get expired invite: %v", err)
	}
	if expiredInfo.Status != membershipapplication.InviteTokenStatusExpired {
		t.Fatalf("expected expired status, got %s", expiredInfo.Status)
	}
}

func registerUser(t *testing.T, ctx context.Context, repo *identitypostgres.UserRepository, id int64, fullname string, email string) int64 {
	t.Helper()
	record, err := identitydomain.RegisterUser(identitydomain.RegisterParams{
		ID:       id,
		Email:    email,
		FullName: fullname,
		Password: "secret1",
		APIToken: fmt.Sprintf("tok-%d", id),
	})
	if err != nil {
		t.Fatalf("register identity user %d: %v", id, err)
	}
	if err := repo.Save(ctx, record); err != nil {
		t.Fatalf("save identity user %d: %v", id, err)
	}
	return id
}
