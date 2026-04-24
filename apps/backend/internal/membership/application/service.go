package application

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"opentoggl/backend/apps/backend/internal/log"
	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"
	"opentoggl/backend/apps/backend/internal/xptr"
)

// WorkspaceInviteTokenTTL is the validity window applied to every workspace
// invite token, matching the documented 7-day expiry policy.
const WorkspaceInviteTokenTTL = 7 * 24 * time.Hour

var (
	ErrStoreRequired                 = errors.New("membership store is required")
	ErrLoggerRequired                = errors.New("membership logger is required")
	ErrWorkspaceIdentityUserNotFound = errors.New("workspace identity user not found")
	ErrWorkspaceMemberNotFound       = errors.New("workspace member not found")
	ErrWorkspaceManagerRequired      = errors.New("workspace manager role is required")
	ErrWorkspaceMemberExists         = errors.New("workspace member already exists")
	ErrWorkspaceMemberEmailBlank     = errors.New("workspace member email is required")
	ErrInvitationNotFound            = errors.New("organization invitation not found")
	ErrInvitationEmailsRequired      = errors.New("organization invitation emails are required")
	ErrInvitationWorkspacesRequired  = errors.New("organization invitation workspaces are required")
	ErrInvitationEmailInvalid        = errors.New("organization invitation email is invalid")
	ErrInvitationStateConflict       = errors.New("organization invitation state conflict")
	ErrSMTPNotConfigured             = errors.New("smtp is not configured")
	ErrSiteURLNotConfigured          = errors.New("site url is not configured")
	ErrInviteTokenInvalid            = errors.New("workspace invite token is invalid")
	ErrInviteTokenExpired            = errors.New("workspace invite token has expired")
	ErrInviteTokenAlreadyConsumed    = errors.New("workspace invite token already consumed")
	ErrInviteEmailMismatch           = errors.New("invite email does not match current user")
)

// EmailSender delivers transactional emails. A membership Service with no
// EmailSender configured rejects invite operations that require delivery with
// ErrSMTPNotConfigured; inviting workspace members is not allowed without it.
type EmailSender interface {
	IsConfigured() bool
	Send(ctx context.Context, to string, subject string, bodyHTML string) error
}

// SiteURLReader returns the configured public site URL used to compose invite
// links. Returning an empty string is an error: without a site URL we cannot
// mint an invite link recipients can actually open.
type SiteURLReader interface {
	ReadSiteURL(ctx context.Context) string
}

type Service struct {
	store         Store
	logger        log.Logger
	emailSender   EmailSender
	siteURLReader SiteURLReader
	now           func() time.Time
}

func NewService(store Store, opts ...ServiceOption) (*Service, error) {
	if store == nil {
		return nil, ErrStoreRequired
	}
	svc := &Service{store: store, now: time.Now}
	for _, opt := range opts {
		opt(svc)
	}
	if svc.logger == nil {
		return nil, ErrLoggerRequired
	}
	return svc, nil
}

// ServiceOption configures optional dependencies on the membership Service.
type ServiceOption func(*Service)

// WithLogger sets the logger for the membership Service.
func WithLogger(logger log.Logger) ServiceOption {
	return func(s *Service) { s.logger = logger }
}

// WithEmailSender configures the email sender used to deliver workspace
// invite emails. Without this option the Service refuses to create invites.
func WithEmailSender(sender EmailSender) ServiceOption {
	return func(s *Service) { s.emailSender = sender }
}

// WithSiteURLReader configures the source of the public site URL used to
// compose invite links.
func WithSiteURLReader(reader SiteURLReader) ServiceOption {
	return func(s *Service) { s.siteURLReader = reader }
}

// WithClock overrides the Service's notion of wall-clock time — useful when
// unit-testing token expiry behavior without waiting real time.
func WithClock(clock func() time.Time) ServiceOption {
	return func(s *Service) {
		if clock != nil {
			s.now = clock
		}
	}
}

func (service *Service) EnsureOrganizationMember(
	ctx context.Context,
	command EnsureOrganizationMemberCommand,
) (OrganizationMemberView, error) {
	return service.store.EnsureOrganizationMember(ctx, command)
}

func (service *Service) ListOrganizationMembers(
	ctx context.Context,
	organizationID int64,
) ([]OrganizationMemberView, error) {
	return service.store.ListOrganizationMembers(ctx, organizationID)
}

func (service *Service) EnsureWorkspaceOwner(
	ctx context.Context,
	command EnsureWorkspaceOwnerCommand,
) (WorkspaceMemberView, error) {
	return service.store.EnsureWorkspaceOwner(ctx, command)
}

func (service *Service) ListWorkspaceMembers(
	ctx context.Context,
	workspaceID int64,
	requestedBy int64,
) ([]WorkspaceMemberView, error) {
	if err := service.requireManager(ctx, workspaceID, requestedBy); err != nil {
		return nil, err
	}
	return service.store.ListWorkspaceMembers(ctx, workspaceID)
}

func (service *Service) InviteWorkspaceMember(
	ctx context.Context,
	command InviteWorkspaceMemberCommand,
) (WorkspaceMemberView, error) {
	if err := service.requireManager(ctx, command.WorkspaceID, command.RequestedBy); err != nil {
		return WorkspaceMemberView{}, err
	}
	command.Email = normalizeEmail(command.Email)
	if command.Email == "" {
		return WorkspaceMemberView{}, ErrWorkspaceMemberEmailBlank
	}
	if service.emailSender == nil || !service.emailSender.IsConfigured() {
		return WorkspaceMemberView{}, ErrSMTPNotConfigured
	}
	if _, err := service.resolveSiteURL(ctx); err != nil {
		return WorkspaceMemberView{}, err
	}

	role := membershipdomain.WorkspaceRoleMember
	if command.Role != nil {
		role = *command.Role
	}
	if _, err := membershipdomain.NewWorkspaceMember(
		0,
		command.Email,
		command.Email,
		role,
		membershipdomain.WorkspaceMemberStateInvited,
		nil,
		nil,
	); err != nil {
		return WorkspaceMemberView{}, err
	}

	token, err := newWorkspaceInviteToken()
	if err != nil {
		return WorkspaceMemberView{}, err
	}
	expiresAt := service.now().Add(WorkspaceInviteTokenTTL)
	command.InviteToken = token
	command.InviteTokenExpiresAt = expiresAt

	// Idempotent re-invite: if a row already exists for this (workspace, email)
	// and its state permits reissuing an invite, rotate the token on it instead
	// of failing with ErrWorkspaceMemberExists. This makes repeated Invite
	// clicks safe — critical when a previous send failed at the SMTP layer and
	// left an invited row behind. joined/disabled/restored rows still surface
	// as conflicts (managers must use Restore, not Invite).
	existing, found, err := service.store.FindWorkspaceMemberByEmail(ctx, command.WorkspaceID, command.Email)
	if err != nil {
		return WorkspaceMemberView{}, err
	}
	var member WorkspaceMemberView
	if found {
		switch existing.State {
		case membershipdomain.WorkspaceMemberStateInvited, membershipdomain.WorkspaceMemberStateRemoved:
			member, err = service.store.ReinviteWorkspaceMember(ctx, ReinviteWorkspaceMemberCommand{
				WorkspaceID:          command.WorkspaceID,
				MemberID:             existing.ID,
				InvitedBy:            command.RequestedBy,
				Role:                 command.Role,
				InviteToken:          token,
				InviteTokenExpiresAt: expiresAt,
			})
			if err != nil {
				return WorkspaceMemberView{}, err
			}
		default:
			return WorkspaceMemberView{}, ErrWorkspaceMemberExists
		}
	} else {
		member, err = service.store.InviteWorkspaceMember(ctx, command)
		if err != nil {
			return WorkspaceMemberView{}, err
		}
	}

	if err := service.sendInviteEmail(ctx, command.WorkspaceID, command.RequestedBy, member); err != nil {
		service.logger.ErrorContext(ctx, "failed to send workspace invite email",
			"workspace_id", command.WorkspaceID,
			"member_id", member.ID,
			"error", err.Error(),
		)
		return WorkspaceMemberView{}, err
	}
	return member, nil
}

// ResendWorkspaceInvite regenerates an invite token and re-sends the invite
// email for a member still in the invited state. It is rejected with
// ErrSMTPNotConfigured when the Service has no working email sender.
func (service *Service) ResendWorkspaceInvite(
	ctx context.Context,
	command ResendWorkspaceInviteCommand,
) (WorkspaceMemberView, error) {
	if err := service.requireManager(ctx, command.WorkspaceID, command.RequestedBy); err != nil {
		return WorkspaceMemberView{}, err
	}
	if service.emailSender == nil || !service.emailSender.IsConfigured() {
		return WorkspaceMemberView{}, ErrSMTPNotConfigured
	}
	if _, err := service.resolveSiteURL(ctx); err != nil {
		return WorkspaceMemberView{}, err
	}

	token, err := newWorkspaceInviteToken()
	if err != nil {
		return WorkspaceMemberView{}, err
	}
	command.InviteToken = token
	command.InviteTokenExpiresAt = service.now().Add(WorkspaceInviteTokenTTL)

	member, err := service.store.ResendWorkspaceInvite(ctx, command)
	if err != nil {
		return WorkspaceMemberView{}, err
	}

	if err := service.sendInviteEmail(ctx, command.WorkspaceID, command.RequestedBy, member); err != nil {
		service.logger.ErrorContext(ctx, "failed to resend workspace invite email",
			"workspace_id", command.WorkspaceID,
			"member_id", member.ID,
			"error", err.Error(),
		)
		return WorkspaceMemberView{}, err
	}
	return member, nil
}

// GetInviteByToken returns the public invite summary used by the accept page.
// A not_found token surfaces as ErrInviteTokenInvalid so the HTTP layer can
// translate it to 404; expired/consumed tokens are returned as structured
// views so the UI can render tailored messaging.
func (service *Service) GetInviteByToken(
	ctx context.Context,
	token string,
) (InviteTokenInfoView, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return InviteTokenInfoView{}, ErrInviteTokenInvalid
	}
	info, ok, err := service.store.FindInviteByToken(ctx, token)
	if err != nil {
		return InviteTokenInfoView{}, err
	}
	if !ok {
		return InviteTokenInfoView{}, ErrInviteTokenInvalid
	}
	if info.Status == InviteTokenStatusPending && info.ExpiresAt != nil && service.now().After(*info.ExpiresAt) {
		info.Status = InviteTokenStatusExpired
	}
	return info, nil
}

// ClaimInvite performs the post-authentication join: set user_id, transition
// invited→joined, clear the token, upsert an org membership row, and pre-fill
// the user home so the session shell doesn't auto-create a personal org.
func (service *Service) ClaimInvite(
	ctx context.Context,
	command AcceptInviteCommand,
) (AcceptedInviteView, error) {
	command.Token = strings.TrimSpace(command.Token)
	if command.Token == "" {
		return AcceptedInviteView{}, ErrInviteTokenInvalid
	}
	if command.UserID <= 0 {
		return AcceptedInviteView{}, ErrInviteTokenInvalid
	}
	command.UserEmail = normalizeEmail(command.UserEmail)

	info, ok, err := service.store.FindInviteByToken(ctx, command.Token)
	if err != nil {
		return AcceptedInviteView{}, err
	}
	if !ok {
		return AcceptedInviteView{}, ErrInviteTokenInvalid
	}
	switch info.Status {
	case InviteTokenStatusConsumed:
		return AcceptedInviteView{}, ErrInviteTokenAlreadyConsumed
	case InviteTokenStatusExpired:
		return AcceptedInviteView{}, ErrInviteTokenExpired
	}
	if info.ExpiresAt != nil && service.now().After(*info.ExpiresAt) {
		return AcceptedInviteView{}, ErrInviteTokenExpired
	}
	if command.UserEmail != "" && normalizeEmail(info.Email) != command.UserEmail {
		return AcceptedInviteView{}, ErrInviteEmailMismatch
	}

	accepted, err := service.store.AcceptInvite(ctx, command)
	if err != nil {
		return AcceptedInviteView{}, err
	}
	return accepted, nil
}

// sendInviteEmail looks up inviter + workspace context and delivers the
// invite email through the configured email sender.
func (service *Service) sendInviteEmail(
	ctx context.Context,
	workspaceID int64,
	inviterUserID int64,
	member WorkspaceMemberView,
) error {
	if member.InviteToken == nil {
		return fmt.Errorf("member is missing invite token")
	}
	siteURL, err := service.resolveSiteURL(ctx)
	if err != nil {
		return err
	}

	inviterName := ""
	if inviterUserID > 0 {
		if view, ok, lookupErr := service.store.FindWorkspaceMemberByUserID(ctx, workspaceID, inviterUserID); lookupErr == nil && ok {
			inviterName = strings.TrimSpace(view.FullName)
			if inviterName == "" {
				inviterName = view.Email
			}
		}
	}

	workspaceName := strings.TrimSpace(member.FullName)
	if workspaceName == "" {
		workspaceName = "OpenTickly"
	}
	// Workspace name is not carried on the member row; fall back to a
	// generic string if we can't resolve it here. The AcceptInvite flow
	// returns the real workspace name separately.
	// (See composeInviteEmail for the full subject/body.)

	expiresAt := time.Time{}
	if member.InviteTokenExpiresAt != nil {
		expiresAt = *member.InviteTokenExpiresAt
	}

	subject, body := composeInviteEmail(inviterName, workspaceNameForInvite(ctx, service, workspaceID), *member.InviteToken, siteURL, expiresAt)
	return service.emailSender.Send(ctx, member.Email, subject, body)
}

// resolveSiteURL returns the configured public site URL or
// ErrSiteURLNotConfigured when none is set. Invite emails must carry a
// clickable link, so shipping an invite with a broken URL is never acceptable.
func (service *Service) resolveSiteURL(ctx context.Context) (string, error) {
	if service.siteURLReader == nil {
		return "", ErrSiteURLNotConfigured
	}
	siteURL := strings.TrimSpace(service.siteURLReader.ReadSiteURL(ctx))
	if siteURL == "" {
		return "", ErrSiteURLNotConfigured
	}
	return siteURL, nil
}

// workspaceNameForInvite returns a best-effort human-readable workspace name
// for invite-email copy. It does not fail the invite flow if the lookup
// errors — the email just falls back to "your OpenTickly workspace".
func workspaceNameForInvite(ctx context.Context, service *Service, workspaceID int64) string {
	type workspaceNameLookup interface {
		WorkspaceName(ctx context.Context, workspaceID int64) (string, bool, error)
	}
	if lookup, ok := service.store.(workspaceNameLookup); ok {
		if name, found, err := lookup.WorkspaceName(ctx, workspaceID); err == nil && found && strings.TrimSpace(name) != "" {
			return name
		}
	}
	return "your OpenTickly workspace"
}

// composeInviteEmail builds the HTML email body used for both the initial
// invite and resend flows. The markup mirrors instance_admin_email_verifier
// so the visual style stays consistent across transactional email.
func composeInviteEmail(inviterName, workspaceName, token, siteURL string, expiresAt time.Time) (string, string) {
	acceptURL := fmt.Sprintf("%s/accept-invite?token=%s", strings.TrimRight(siteURL, "/"), token)
	subject := fmt.Sprintf("You've been invited to %s on OpenTickly", workspaceName)
	inviterBlurb := "Someone"
	if strings.TrimSpace(inviterName) != "" {
		inviterBlurb = inviterName
	}
	expiryHint := "This invite link expires in 7 days."
	if !expiresAt.IsZero() {
		expiryHint = fmt.Sprintf("This invite link expires on %s (UTC).", expiresAt.UTC().Format("2006-01-02 15:04"))
	}
	body := fmt.Sprintf(`<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
<h2 style="color: #1a1a1a;">You've been invited to %s</h2>
<p>%s has invited you to join <strong>%s</strong> on OpenTickly.</p>
<p style="text-align: center; margin: 32px 0;">
  <a href="%s" style="background: #e05d26; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
    Accept invitation
  </a>
</p>
<p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
<p style="color: #666; font-size: 14px; word-break: break-all;">%s</p>
<p style="color: #999; font-size: 12px;">%s</p>
</div>`, workspaceName, inviterBlurb, workspaceName, acceptURL, acceptURL, expiryHint)
	return subject, body
}

func (service *Service) DisableWorkspaceMember(
	ctx context.Context,
	workspaceID int64,
	memberID int64,
	requestedBy int64,
) (WorkspaceMemberView, error) {
	return service.transitionWorkspaceMember(
		ctx,
		workspaceID,
		memberID,
		requestedBy,
		func(member *membershipdomain.WorkspaceMember) error { return member.Disable() },
	)
}

func (service *Service) RestoreWorkspaceMember(
	ctx context.Context,
	workspaceID int64,
	memberID int64,
	requestedBy int64,
) (WorkspaceMemberView, error) {
	return service.transitionWorkspaceMember(
		ctx,
		workspaceID,
		memberID,
		requestedBy,
		func(member *membershipdomain.WorkspaceMember) error { return member.Restore() },
	)
}

func (service *Service) RemoveWorkspaceMember(
	ctx context.Context,
	workspaceID int64,
	memberID int64,
	requestedBy int64,
) (WorkspaceMemberView, error) {
	return service.transitionWorkspaceMember(
		ctx,
		workspaceID,
		memberID,
		requestedBy,
		func(member *membershipdomain.WorkspaceMember) error { return member.Remove() },
	)
}

func (service *Service) UpdateWorkspaceMemberRateCost(
	ctx context.Context,
	command UpdateWorkspaceMemberRateCostCommand,
) (WorkspaceMemberView, error) {
	if err := service.requireManager(ctx, command.WorkspaceID, command.RequestedBy); err != nil {
		return WorkspaceMemberView{}, err
	}

	view, ok, err := service.store.FindWorkspaceMemberByID(ctx, command.WorkspaceID, command.MemberID)
	if err != nil {
		return WorkspaceMemberView{}, err
	}
	if !ok {
		return WorkspaceMemberView{}, ErrWorkspaceMemberNotFound
	}

	member, err := toDomainMember(view)
	if err != nil {
		return WorkspaceMemberView{}, err
	}
	if err := member.UpdateRateCost(command.HourlyRate, command.LaborCost); err != nil {
		return WorkspaceMemberView{}, err
	}

	view.HourlyRate = xptr.Clone(member.HourlyRate)
	view.LaborCost = xptr.Clone(member.LaborCost)
	if err := service.store.SaveWorkspaceMember(ctx, view); err != nil {
		return WorkspaceMemberView{}, err
	}
	return view, nil
}

func (service *Service) UpdateWorkspaceMember(
	ctx context.Context,
	command UpdateWorkspaceMemberCommand,
) (WorkspaceMemberView, error) {
	if err := service.requireManager(ctx, command.WorkspaceID, command.RequestedBy); err != nil {
		return WorkspaceMemberView{}, err
	}

	view, ok, err := service.store.FindWorkspaceMemberByID(ctx, command.WorkspaceID, command.MemberID)
	if err != nil {
		return WorkspaceMemberView{}, err
	}
	if !ok {
		return WorkspaceMemberView{}, ErrWorkspaceMemberNotFound
	}

	member, err := toDomainMember(view)
	if err != nil {
		return WorkspaceMemberView{}, err
	}
	if command.Role != nil {
		member, err = membershipdomain.NewWorkspaceMember(
			view.ID,
			view.Email,
			view.FullName,
			*command.Role,
			member.State,
			member.HourlyRate,
			member.LaborCost,
		)
		if err != nil {
			return WorkspaceMemberView{}, err
		}
	}
	if command.HourlyRate != nil || command.LaborCost != nil {
		hourlyRate := member.HourlyRate
		if command.HourlyRate != nil {
			hourlyRate = command.HourlyRate
		}
		laborCost := member.LaborCost
		if command.LaborCost != nil {
			laborCost = command.LaborCost
		}
		if err := member.UpdateRateCost(hourlyRate, laborCost); err != nil {
			return WorkspaceMemberView{}, err
		}
	}

	view.Role = member.Role
	view.HourlyRate = xptr.Clone(member.HourlyRate)
	view.LaborCost = xptr.Clone(member.LaborCost)
	if err := service.store.SaveWorkspaceMember(ctx, view); err != nil {
		return WorkspaceMemberView{}, err
	}
	return view, nil
}

func (service *Service) CreateOrganizationInvitations(
	ctx context.Context,
	command CreateOrganizationInvitationsCommand,
) ([]OrganizationInvitationView, error) {
	if command.OrganizationID <= 0 || command.SenderUserID <= 0 {
		return nil, ErrInvitationEmailInvalid
	}
	if len(command.Workspaces) == 0 {
		return nil, ErrInvitationWorkspacesRequired
	}

	emails := normalizeInvitationEmails(command.Emails)
	if len(emails) == 0 {
		return nil, ErrInvitationEmailsRequired
	}
	command.Invitations = make([]OrganizationInvitationDraft, 0, len(emails))
	for _, email := range emails {
		if !strings.Contains(email, "@") {
			return nil, ErrInvitationEmailInvalid
		}
		code, err := newInvitationCode()
		if err != nil {
			return nil, err
		}
		command.Invitations = append(command.Invitations, OrganizationInvitationDraft{
			Email: email,
			Code:  code,
		})
	}

	return service.store.CreateOrganizationInvitations(ctx, command)
}

func (service *Service) GetOrganizationInvitation(
	ctx context.Context,
	code string,
) (OrganizationInvitationView, error) {
	invitation, ok, err := service.store.GetOrganizationInvitationByCode(ctx, strings.TrimSpace(code))
	if err != nil {
		return OrganizationInvitationView{}, err
	}
	if !ok {
		return OrganizationInvitationView{}, ErrInvitationNotFound
	}
	return invitation, nil
}

func (service *Service) AcceptOrganizationInvitation(
	ctx context.Context,
	code string,
) (OrganizationInvitationView, error) {
	return service.updateInvitationStatus(ctx, code, InvitationStatusAccepted)
}

func (service *Service) RejectOrganizationInvitation(
	ctx context.Context,
	code string,
) (OrganizationInvitationView, error) {
	return service.updateInvitationStatus(ctx, code, InvitationStatusRejected)
}

func (service *Service) ResendOrganizationInvitation(
	ctx context.Context,
	organizationID int64,
	invitationID int64,
) (OrganizationInvitationView, error) {
	invitation, ok, err := service.store.TouchOrganizationInvitation(ctx, organizationID, invitationID)
	if err != nil {
		return OrganizationInvitationView{}, err
	}
	if !ok {
		return OrganizationInvitationView{}, ErrInvitationNotFound
	}
	return invitation, nil
}

func (service *Service) transitionWorkspaceMember(
	ctx context.Context,
	workspaceID int64,
	memberID int64,
	requestedBy int64,
	transition func(*membershipdomain.WorkspaceMember) error,
) (WorkspaceMemberView, error) {
	if err := service.requireManager(ctx, workspaceID, requestedBy); err != nil {
		return WorkspaceMemberView{}, err
	}

	view, ok, err := service.store.FindWorkspaceMemberByID(ctx, workspaceID, memberID)
	if err != nil {
		return WorkspaceMemberView{}, err
	}
	if !ok {
		return WorkspaceMemberView{}, ErrWorkspaceMemberNotFound
	}

	member, err := toDomainMember(view)
	if err != nil {
		return WorkspaceMemberView{}, err
	}
	if err := transition(member); err != nil {
		return WorkspaceMemberView{}, err
	}

	view.State = member.State
	if err := service.store.SaveWorkspaceMember(ctx, view); err != nil {
		return WorkspaceMemberView{}, err
	}
	return view, nil
}

func (service *Service) requireManager(ctx context.Context, workspaceID int64, requestedBy int64) error {
	requester, ok, err := service.store.FindWorkspaceMemberByUserID(ctx, workspaceID, requestedBy)
	if err != nil {
		return err
	}
	if !ok {
		return ErrWorkspaceManagerRequired
	}

	member, err := toDomainMember(requester)
	if err != nil {
		return err
	}
	if !member.CanManageMembers() || !member.CanCreateBusinessChange() {
		return ErrWorkspaceManagerRequired
	}
	return nil
}

func toDomainMember(view WorkspaceMemberView) (*membershipdomain.WorkspaceMember, error) {
	return membershipdomain.NewWorkspaceMember(
		view.ID,
		view.Email,
		view.FullName,
		view.Role,
		view.State,
		view.HourlyRate,
		view.LaborCost,
	)
}

func normalizeEmail(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func normalizeInvitationEmails(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	normalized := make([]string, 0, len(values))
	for _, value := range values {
		email := normalizeEmail(value)
		if email == "" {
			continue
		}
		if _, ok := seen[email]; ok {
			continue
		}
		seen[email] = struct{}{}
		normalized = append(normalized, email)
	}
	return normalized
}

func (service *Service) updateInvitationStatus(
	ctx context.Context,
	code string,
	status InvitationStatus,
) (OrganizationInvitationView, error) {
	invitation, ok, err := service.store.UpdateOrganizationInvitationStatus(ctx, strings.TrimSpace(code), status)
	if err != nil {
		return OrganizationInvitationView{}, err
	}
	if !ok {
		return OrganizationInvitationView{}, ErrInvitationNotFound
	}
	if invitation.Status != status {
		return OrganizationInvitationView{}, ErrInvitationStateConflict
	}
	return invitation, nil
}

func newInvitationCode() (string, error) {
	buffer := make([]byte, 16)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return hex.EncodeToString(buffer), nil
}

// newWorkspaceInviteToken generates the 32-byte (64 hex-char) plaintext token
// used by workspace member invites.
func newWorkspaceInviteToken() (string, error) {
	buffer := make([]byte, 32)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return hex.EncodeToString(buffer), nil
}
