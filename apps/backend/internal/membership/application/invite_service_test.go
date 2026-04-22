package application_test

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"
	"opentoggl/backend/apps/backend/internal/log"
)

// fakeEmailSender captures the last message sent so tests can make assertions
// about subject/recipient without running an actual SMTP server.
type fakeEmailSender struct {
	configured bool
	lastTo     string
	lastSubj   string
	lastBody   string
	sendErr    error
	calls      int
}

func newFakeEmailSender() *fakeEmailSender {
	return &fakeEmailSender{configured: true}
}

func (f *fakeEmailSender) IsConfigured() bool { return f.configured }

func (f *fakeEmailSender) Send(ctx context.Context, to, subject, body string) error {
	f.calls++
	f.lastTo = to
	f.lastSubj = subject
	f.lastBody = body
	return f.sendErr
}

// fakeSiteURLReader returns a fixed site URL so invite link assertions are
// stable across runs.
type fakeSiteURLReader struct{ url string }

func (f *fakeSiteURLReader) ReadSiteURL(context.Context) string { return f.url }

// inMemoryInviteStore provides just enough Store surface to exercise the
// service-layer invite paths without a database. It intentionally omits
// bookkeeping the service does not touch (organization invitations, etc.).
type inMemoryInviteStore struct {
	manager       membershipapplication.WorkspaceMemberView
	members       map[int64]membershipapplication.WorkspaceMemberView
	byToken       map[string]int64
	inviteInfo    map[string]membershipapplication.InviteTokenInfoView
	acceptedCalls []membershipapplication.AcceptInviteCommand
	acceptedResp  membershipapplication.AcceptedInviteView
	nextID        int64
}

func newInMemoryInviteStore(manager membershipapplication.WorkspaceMemberView) *inMemoryInviteStore {
	store := &inMemoryInviteStore{
		manager:    manager,
		members:    map[int64]membershipapplication.WorkspaceMemberView{manager.ID: manager},
		byToken:    map[string]int64{},
		inviteInfo: map[string]membershipapplication.InviteTokenInfoView{},
		nextID:     manager.ID + 1,
	}
	return store
}

func (s *inMemoryInviteStore) EnsureOrganizationMember(context.Context, membershipapplication.EnsureOrganizationMemberCommand) (membershipapplication.OrganizationMemberView, error) {
	return membershipapplication.OrganizationMemberView{}, nil
}
func (s *inMemoryInviteStore) ListOrganizationMembers(context.Context, int64) ([]membershipapplication.OrganizationMemberView, error) {
	return nil, nil
}
func (s *inMemoryInviteStore) FindOrganizationMemberByUserID(context.Context, int64, int64) (membershipapplication.OrganizationMemberView, bool, error) {
	return membershipapplication.OrganizationMemberView{}, false, nil
}
func (s *inMemoryInviteStore) EnsureWorkspaceOwner(context.Context, membershipapplication.EnsureWorkspaceOwnerCommand) (membershipapplication.WorkspaceMemberView, error) {
	return membershipapplication.WorkspaceMemberView{}, nil
}
func (s *inMemoryInviteStore) ListWorkspaceMembers(context.Context, int64) ([]membershipapplication.WorkspaceMemberView, error) {
	out := make([]membershipapplication.WorkspaceMemberView, 0, len(s.members))
	for _, v := range s.members {
		out = append(out, v)
	}
	return out, nil
}
func (s *inMemoryInviteStore) FindWorkspaceMemberByID(_ context.Context, workspaceID int64, memberID int64) (membershipapplication.WorkspaceMemberView, bool, error) {
	view, ok := s.members[memberID]
	if !ok || view.WorkspaceID != workspaceID {
		return membershipapplication.WorkspaceMemberView{}, false, nil
	}
	return view, true, nil
}
func (s *inMemoryInviteStore) FindWorkspaceMemberByUserID(_ context.Context, workspaceID int64, userID int64) (membershipapplication.WorkspaceMemberView, bool, error) {
	for _, view := range s.members {
		if view.UserID == nil || *view.UserID != userID || view.WorkspaceID != workspaceID {
			continue
		}
		return view, true, nil
	}
	return membershipapplication.WorkspaceMemberView{}, false, nil
}
func (s *inMemoryInviteStore) FindWorkspaceMemberByEmail(_ context.Context, workspaceID int64, email string) (membershipapplication.WorkspaceMemberView, bool, error) {
	for _, view := range s.members {
		if view.WorkspaceID != workspaceID {
			continue
		}
		if strings.EqualFold(view.Email, email) {
			return view, true, nil
		}
	}
	return membershipapplication.WorkspaceMemberView{}, false, nil
}
func (s *inMemoryInviteStore) ReinviteWorkspaceMember(_ context.Context, command membershipapplication.ReinviteWorkspaceMemberCommand) (membershipapplication.WorkspaceMemberView, error) {
	view, ok := s.members[command.MemberID]
	if !ok {
		return membershipapplication.WorkspaceMemberView{}, membershipapplication.ErrWorkspaceMemberNotFound
	}
	if view.State != membershipdomain.WorkspaceMemberStateInvited && view.State != membershipdomain.WorkspaceMemberStateRemoved {
		return membershipapplication.WorkspaceMemberView{}, membershipapplication.ErrWorkspaceMemberNotFound
	}
	token := command.InviteToken
	expires := command.InviteTokenExpiresAt
	view.State = membershipdomain.WorkspaceMemberStateInvited
	view.InviteToken = &token
	view.InviteTokenExpiresAt = &expires
	view.UserID = nil
	if command.Role != nil {
		view.Role = *command.Role
	}
	s.members[view.ID] = view
	s.byToken[token] = view.ID
	return view, nil
}
func (s *inMemoryInviteStore) InviteWorkspaceMember(_ context.Context, command membershipapplication.InviteWorkspaceMemberCommand) (membershipapplication.WorkspaceMemberView, error) {
	id := s.nextID
	s.nextID++
	token := command.InviteToken
	expires := command.InviteTokenExpiresAt
	view := membershipapplication.WorkspaceMemberView{
		ID:                   id,
		WorkspaceID:          command.WorkspaceID,
		Email:                command.Email,
		FullName:             command.Email,
		Role:                 membershipdomain.WorkspaceRoleMember,
		State:                membershipdomain.WorkspaceMemberStateInvited,
		InviteToken:          &token,
		InviteTokenExpiresAt: &expires,
	}
	s.members[id] = view
	if token != "" {
		s.byToken[token] = id
		s.inviteInfo[token] = membershipapplication.InviteTokenInfoView{
			WorkspaceID:   command.WorkspaceID,
			WorkspaceName: "Test Workspace",
			Email:         command.Email,
			Status:        membershipapplication.InviteTokenStatusPending,
			ExpiresAt:     &expires,
		}
	}
	return view, nil
}
func (s *inMemoryInviteStore) ResendWorkspaceInvite(_ context.Context, command membershipapplication.ResendWorkspaceInviteCommand) (membershipapplication.WorkspaceMemberView, error) {
	view, ok := s.members[command.MemberID]
	if !ok || view.State != membershipdomain.WorkspaceMemberStateInvited {
		return membershipapplication.WorkspaceMemberView{}, membershipapplication.ErrWorkspaceMemberNotFound
	}
	token := command.InviteToken
	expires := command.InviteTokenExpiresAt
	view.InviteToken = &token
	view.InviteTokenExpiresAt = &expires
	s.members[view.ID] = view
	s.byToken[token] = view.ID
	return view, nil
}
func (s *inMemoryInviteStore) FindInviteByToken(_ context.Context, token string) (membershipapplication.InviteTokenInfoView, bool, error) {
	info, ok := s.inviteInfo[token]
	if !ok {
		return membershipapplication.InviteTokenInfoView{}, false, nil
	}
	return info, true, nil
}
func (s *inMemoryInviteStore) AcceptInvite(_ context.Context, command membershipapplication.AcceptInviteCommand) (membershipapplication.AcceptedInviteView, error) {
	s.acceptedCalls = append(s.acceptedCalls, command)
	return s.acceptedResp, nil
}
func (s *inMemoryInviteStore) SaveWorkspaceMember(context.Context, membershipapplication.WorkspaceMemberView) error {
	return nil
}
func (s *inMemoryInviteStore) CreateOrganizationInvitations(context.Context, membershipapplication.CreateOrganizationInvitationsCommand) ([]membershipapplication.OrganizationInvitationView, error) {
	return nil, nil
}
func (s *inMemoryInviteStore) GetOrganizationInvitationByCode(context.Context, string) (membershipapplication.OrganizationInvitationView, bool, error) {
	return membershipapplication.OrganizationInvitationView{}, false, nil
}
func (s *inMemoryInviteStore) GetOrganizationInvitationByID(context.Context, int64, int64) (membershipapplication.OrganizationInvitationView, bool, error) {
	return membershipapplication.OrganizationInvitationView{}, false, nil
}
func (s *inMemoryInviteStore) UpdateOrganizationInvitationStatus(context.Context, string, membershipapplication.InvitationStatus) (membershipapplication.OrganizationInvitationView, bool, error) {
	return membershipapplication.OrganizationInvitationView{}, false, nil
}
func (s *inMemoryInviteStore) TouchOrganizationInvitation(context.Context, int64, int64) (membershipapplication.OrganizationInvitationView, bool, error) {
	return membershipapplication.OrganizationInvitationView{}, false, nil
}

func makeManager() membershipapplication.WorkspaceMemberView {
	managerUserID := int64(42)
	return membershipapplication.WorkspaceMemberView{
		ID:          1,
		WorkspaceID: 10,
		UserID:      &managerUserID,
		Email:       "manager@example.com",
		FullName:    "Manager One",
		Role:        membershipdomain.WorkspaceRoleAdmin,
		State:       membershipdomain.WorkspaceMemberStateJoined,
	}
}

func TestInviteWorkspaceMemberFailsWhenSMTPNotConfigured(t *testing.T) {
	manager := makeManager()
	store := newInMemoryInviteStore(manager)
	sender := &fakeEmailSender{configured: false}

	service, err := membershipapplication.NewService(
		store,
		membershipapplication.WithLogger(log.NopLogger()),
		membershipapplication.WithEmailSender(sender),
	)
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	_, err = service.InviteWorkspaceMember(context.Background(), membershipapplication.InviteWorkspaceMemberCommand{
		WorkspaceID: manager.WorkspaceID,
		RequestedBy: *manager.UserID,
		Email:       "invitee@example.com",
	})
	if !errors.Is(err, membershipapplication.ErrSMTPNotConfigured) {
		t.Fatalf("expected ErrSMTPNotConfigured, got %v", err)
	}
	if sender.calls != 0 {
		t.Fatalf("expected no email send calls, got %d", sender.calls)
	}
}

func TestInviteWorkspaceMemberFailsWhenSiteURLMissing(t *testing.T) {
	cases := []struct {
		name   string
		reader membershipapplication.SiteURLReader
	}{
		{name: "no reader configured", reader: nil},
		{name: "reader returns blank", reader: &fakeSiteURLReader{url: ""}},
		{name: "reader returns whitespace", reader: &fakeSiteURLReader{url: "   "}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			manager := makeManager()
			store := newInMemoryInviteStore(manager)
			sender := newFakeEmailSender()

			options := []membershipapplication.ServiceOption{
				membershipapplication.WithLogger(log.NopLogger()),
				membershipapplication.WithEmailSender(sender),
			}
			if tc.reader != nil {
				options = append(options, membershipapplication.WithSiteURLReader(tc.reader))
			}
			service, err := membershipapplication.NewService(store, options...)
			if err != nil {
				t.Fatalf("new service: %v", err)
			}

			_, err = service.InviteWorkspaceMember(context.Background(), membershipapplication.InviteWorkspaceMemberCommand{
				WorkspaceID: manager.WorkspaceID,
				RequestedBy: *manager.UserID,
				Email:       "invitee@example.com",
			})
			if !errors.Is(err, membershipapplication.ErrSiteURLNotConfigured) {
				t.Fatalf("expected ErrSiteURLNotConfigured, got %v", err)
			}
			if sender.calls != 0 {
				t.Fatalf("expected zero email sends (pre-flight rejected), got %d", sender.calls)
			}
			if len(store.byToken) != 0 {
				t.Fatalf("expected no invite rows to be written, got %d", len(store.byToken))
			}
		})
	}
}

func TestInviteWorkspaceMemberGeneratesTokenAndSendsEmail(t *testing.T) {
	manager := makeManager()
	store := newInMemoryInviteStore(manager)
	sender := newFakeEmailSender()

	service, err := membershipapplication.NewService(
		store,
		membershipapplication.WithLogger(log.NopLogger()),
		membershipapplication.WithEmailSender(sender),
		membershipapplication.WithSiteURLReader(&fakeSiteURLReader{url: "https://example.test"}),
	)
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	view, err := service.InviteWorkspaceMember(context.Background(), membershipapplication.InviteWorkspaceMemberCommand{
		WorkspaceID: manager.WorkspaceID,
		RequestedBy: *manager.UserID,
		Email:       "invitee@example.com",
	})
	if err != nil {
		t.Fatalf("invite: %v", err)
	}
	if view.InviteToken == nil || len(*view.InviteToken) != 64 {
		t.Fatalf("expected 64-char hex token, got %#v", view.InviteToken)
	}
	if view.InviteTokenExpiresAt == nil || time.Until(*view.InviteTokenExpiresAt) < 6*24*time.Hour {
		t.Fatalf("expected ~7-day expiry, got %#v", view.InviteTokenExpiresAt)
	}
	if sender.calls != 1 {
		t.Fatalf("expected one email send, got %d", sender.calls)
	}
	if sender.lastTo != "invitee@example.com" {
		t.Fatalf("expected recipient invitee@example.com, got %q", sender.lastTo)
	}
	if got := sender.lastSubj; got == "" || !contains(got, "OpenToggl") {
		t.Fatalf("expected subject to mention OpenToggl, got %q", got)
	}
}

func TestInviteWorkspaceMemberIsIdempotent(t *testing.T) {
	cases := []struct {
		name          string
		priorState    membershipdomain.WorkspaceMemberState
		wantRotated   bool
		wantErr       error
		wantSendCalls int
	}{
		{name: "prior invited rotates token and resends", priorState: membershipdomain.WorkspaceMemberStateInvited, wantRotated: true, wantSendCalls: 1},
		{name: "prior removed rotates token and resends", priorState: membershipdomain.WorkspaceMemberStateRemoved, wantRotated: true, wantSendCalls: 1},
		{name: "prior joined is conflict", priorState: membershipdomain.WorkspaceMemberStateJoined, wantRotated: false, wantErr: membershipapplication.ErrWorkspaceMemberExists, wantSendCalls: 0},
		{name: "prior disabled is conflict", priorState: membershipdomain.WorkspaceMemberStateDisabled, wantRotated: false, wantErr: membershipapplication.ErrWorkspaceMemberExists, wantSendCalls: 0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			manager := makeManager()
			store := newInMemoryInviteStore(manager)
			// Seed an existing row for the target email in the requested state.
			priorToken := "old-token"
			priorExpires := time.Now().Add(24 * time.Hour)
			priorView := membershipapplication.WorkspaceMemberView{
				ID:                   99,
				WorkspaceID:          manager.WorkspaceID,
				Email:                "invitee@example.com",
				FullName:             "invitee@example.com",
				Role:                 membershipdomain.WorkspaceRoleMember,
				State:                tc.priorState,
				InviteToken:          &priorToken,
				InviteTokenExpiresAt: &priorExpires,
			}
			store.members[priorView.ID] = priorView

			sender := newFakeEmailSender()
			service, err := membershipapplication.NewService(
				store,
				membershipapplication.WithLogger(log.NopLogger()),
				membershipapplication.WithEmailSender(sender),
				membershipapplication.WithSiteURLReader(&fakeSiteURLReader{url: "https://example.test"}),
			)
			if err != nil {
				t.Fatalf("new service: %v", err)
			}

			result, err := service.InviteWorkspaceMember(context.Background(), membershipapplication.InviteWorkspaceMemberCommand{
				WorkspaceID: manager.WorkspaceID,
				RequestedBy: *manager.UserID,
				Email:       "invitee@example.com",
			})

			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("expected %v, got %v", tc.wantErr, err)
				}
			} else if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if tc.wantRotated {
				if result.ID != priorView.ID {
					t.Fatalf("expected same row id reused (rotate), got %d vs %d", result.ID, priorView.ID)
				}
				if result.State != membershipdomain.WorkspaceMemberStateInvited {
					t.Fatalf("expected state invited after rotate, got %s", result.State)
				}
				if result.InviteToken == nil || *result.InviteToken == priorToken {
					t.Fatalf("expected new token, got %#v", result.InviteToken)
				}
			}
			if sender.calls != tc.wantSendCalls {
				t.Fatalf("expected %d email send calls, got %d", tc.wantSendCalls, sender.calls)
			}
		})
	}
}

func TestClaimInviteRejectsEmailMismatch(t *testing.T) {
	manager := makeManager()
	store := newInMemoryInviteStore(manager)
	store.inviteInfo["good-token"] = membershipapplication.InviteTokenInfoView{
		WorkspaceID:   manager.WorkspaceID,
		WorkspaceName: "Test Workspace",
		Email:         "invitee@example.com",
		Status:        membershipapplication.InviteTokenStatusPending,
	}

	service, err := membershipapplication.NewService(
		store,
		membershipapplication.WithLogger(log.NopLogger()),
		membershipapplication.WithEmailSender(newFakeEmailSender()),
	)
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	_, err = service.ClaimInvite(context.Background(), membershipapplication.AcceptInviteCommand{
		Token:     "good-token",
		UserID:    999,
		UserEmail: "someone-else@example.com",
	})
	if !errors.Is(err, membershipapplication.ErrInviteEmailMismatch) {
		t.Fatalf("expected ErrInviteEmailMismatch, got %v", err)
	}
	if len(store.acceptedCalls) != 0 {
		t.Fatalf("expected no AcceptInvite calls after mismatch, got %d", len(store.acceptedCalls))
	}
}

func TestClaimInviteRejectsExpiredToken(t *testing.T) {
	manager := makeManager()
	store := newInMemoryInviteStore(manager)
	past := time.Now().Add(-1 * time.Hour)
	store.inviteInfo["expired-token"] = membershipapplication.InviteTokenInfoView{
		WorkspaceID:   manager.WorkspaceID,
		WorkspaceName: "Test Workspace",
		Email:         "invitee@example.com",
		ExpiresAt:     &past,
		Status:        membershipapplication.InviteTokenStatusPending,
	}

	service, err := membershipapplication.NewService(
		store,
		membershipapplication.WithLogger(log.NopLogger()),
		membershipapplication.WithEmailSender(newFakeEmailSender()),
	)
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	_, err = service.ClaimInvite(context.Background(), membershipapplication.AcceptInviteCommand{
		Token:     "expired-token",
		UserID:    1,
		UserEmail: "invitee@example.com",
	})
	if !errors.Is(err, membershipapplication.ErrInviteTokenExpired) {
		t.Fatalf("expected ErrInviteTokenExpired, got %v", err)
	}
}

func contains(haystack, needle string) bool {
	return len(haystack) >= len(needle) && (stringIndex(haystack, needle) >= 0)
}

// stringIndex is a tiny wrapper so the test file keeps its imports tight.
func stringIndex(haystack, needle string) int {
	for i := 0; i+len(needle) <= len(haystack); i++ {
		if haystack[i:i+len(needle)] == needle {
			return i
		}
	}
	return -1
}
