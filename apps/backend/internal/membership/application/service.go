package application

import (
	"context"
	"errors"
	"strings"

	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"
)

var (
	ErrStoreRequired                 = errors.New("membership store is required")
	ErrWorkspaceIdentityUserNotFound = errors.New("workspace identity user not found")
	ErrWorkspaceMemberNotFound       = errors.New("workspace member not found")
	ErrWorkspaceManagerRequired      = errors.New("workspace manager role is required")
	ErrWorkspaceMemberExists         = errors.New("workspace member already exists")
	ErrWorkspaceMemberEmailBlank     = errors.New("workspace member email is required")
)

type Service struct {
	store Store
}

func NewService(store Store) (*Service, error) {
	if store == nil {
		return nil, ErrStoreRequired
	}

	return &Service{store: store}, nil
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

	view.HourlyRate = cloneOptionalFloat64(member.HourlyRate)
	view.LaborCost = cloneOptionalFloat64(member.LaborCost)
	if err := service.store.SaveWorkspaceMember(ctx, view); err != nil {
		return WorkspaceMemberView{}, err
	}
	return view, nil
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

func cloneOptionalFloat64(value *float64) *float64 {
	if value == nil {
		return nil
	}

	copyValue := *value
	return &copyValue
}
