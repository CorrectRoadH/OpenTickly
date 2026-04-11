package application

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"

	"opentoggl/backend/apps/backend/internal/log"
	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"
	"opentoggl/backend/apps/backend/internal/xptr"
)

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
	ErrSMTPNotConfigured             = errors.New("email sending is not configured; configure SMTP in Instance Admin before sending invitations")
)

// SMTPChecker checks if SMTP is configured. Optional — when nil, SMTP check is skipped.
type SMTPChecker interface {
	IsSMTPConfigured() bool
}

type Service struct {
	store       Store
	smtpChecker SMTPChecker
	logger      log.Logger
}

func NewService(store Store, opts ...ServiceOption) (*Service, error) {
	if store == nil {
		return nil, ErrStoreRequired
	}
	svc := &Service{store: store}
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

// WithSMTPChecker sets the SMTP checker for invitation gating.
func WithSMTPChecker(checker SMTPChecker) ServiceOption {
	return func(s *Service) { s.smtpChecker = checker }
}

// WithLogger sets the logger for the membership Service.
func WithLogger(logger log.Logger) ServiceOption {
	return func(s *Service) { s.logger = logger }
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
	if err := service.requireSMTP(); err != nil {
		return WorkspaceMemberView{}, err
	}
	if err := service.requireManager(ctx, command.WorkspaceID, command.RequestedBy); err != nil {
		return WorkspaceMemberView{}, err
	}
	command.Email = normalizeEmail(command.Email)
	if command.Email == "" {
		return WorkspaceMemberView{}, ErrWorkspaceMemberEmailBlank
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

	member, err := service.store.InviteWorkspaceMember(ctx, command)
	if err != nil {
		return WorkspaceMemberView{}, err
	}
	return member, nil
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
	if err := service.requireSMTP(); err != nil {
		return nil, err
	}
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

func (service *Service) requireSMTP() error {
	if service.smtpChecker != nil && !service.smtpChecker.IsSMTPConfigured() {
		return ErrSMTPNotConfigured
	}
	return nil
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
