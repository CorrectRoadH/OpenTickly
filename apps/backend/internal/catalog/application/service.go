package application

import (
	"context"
	"errors"
	"fmt"

	"opentoggl/backend/apps/backend/internal/log"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
)

var (
	ErrStoreRequired        = errors.New("catalog store is required")
	ErrLoggerRequired       = errors.New("catalog logger is required")
	ErrClientNotFound       = errors.New("catalog client not found")
	ErrGroupNotFound        = errors.New("catalog group not found")
	ErrGroupNameTaken       = errors.New("a team with this name already exists")
	ErrProjectNotFound      = errors.New("catalog project not found")
	ErrProjectGroupNotFound = errors.New("catalog project group not found")
	ErrProjectUserNotFound  = errors.New("catalog project user not found")
	ErrTagNotFound          = errors.New("catalog tag not found")
	ErrTaskNotFound         = errors.New("catalog task not found")
	ErrInvalidWorkspace     = errors.New("catalog workspace id must be positive")
	ErrPermissionDenied     = errors.New("catalog permission denied by workspace settings")
	ErrBillableEnforced     = errors.New("catalog workspace enforces billable projects")
)

// WorkspaceSettingsLookup resolves workspace-level policy settings.
// The catalog service uses this to enforce admin-only creation rules,
// billable enforcement, and default values for new projects.
type WorkspaceSettingsLookup interface {
	GetWorkspaceSettings(ctx context.Context, workspaceID int64) (tenantdomain.WorkspaceSettings, error)
}

// MemberRoleLookup resolves a user's role within a workspace.
// Used to check whether a user is an admin when workspace settings
// restrict certain operations to admins only.
type MemberRoleLookup interface {
	IsWorkspaceAdmin(ctx context.Context, workspaceID int64, userID int64) (bool, error)
}

type Service struct {
	store    Store
	settings WorkspaceSettingsLookup
	members  MemberRoleLookup
	logger   log.Logger
}

// ServiceOption configures optional dependencies on the catalog Service.
type ServiceOption func(*Service)

// WithWorkspaceSettings injects the workspace settings lookup dependency.
func WithWorkspaceSettings(lookup WorkspaceSettingsLookup) ServiceOption {
	return func(s *Service) { s.settings = lookup }
}

// WithMemberRoleLookup injects the member role lookup dependency.
func WithMemberRoleLookup(lookup MemberRoleLookup) ServiceOption {
	return func(s *Service) { s.members = lookup }
}

func NewService(store Store, logger log.Logger, opts ...ServiceOption) (*Service, error) {
	if store == nil {
		return nil, ErrStoreRequired
	}
	if logger == nil {
		return nil, ErrLoggerRequired
	}
	svc := &Service{store: store, logger: logger}
	for _, opt := range opts {
		opt(svc)
	}
	return svc, nil
}

func requireWorkspaceID(workspaceID int64) error {
	if workspaceID <= 0 {
		return fmt.Errorf("%w: %d", ErrInvalidWorkspace, workspaceID)
	}
	return nil
}

func normalizeClientStatus(status ClientStatus) ClientStatus {
	switch status {
	case ClientStatusActive, ClientStatusArchived:
		return status
	default:
		return ClientStatusBoth
	}
}

func normalizeProjectSortField(field ProjectSortField) ProjectSortField {
	if field == ProjectSortFieldCreatedAt {
		return field
	}
	return ProjectSortFieldName
}

func normalizeTaskSortField(field TaskSortField) TaskSortField {
	if field == TaskSortFieldCreatedAt {
		return field
	}
	return TaskSortFieldName
}

func projectUserRole(manager bool) string {
	if manager {
		return "admin"
	}
	return "member"
}

func normalizeSortOrder(order SortOrder) SortOrder {
	if order == SortOrderDescending {
		return order
	}
	return SortOrderAscending
}

func normalizePage(value int, fallback int) int {
	if value <= 0 {
		return fallback
	}
	return value
}

func normalizePerPage(value int, fallback int, maximum int) int {
	if value <= 0 {
		return fallback
	}
	if value > maximum {
		return maximum
	}
	return value
}

// requireAdminForSetting checks that the user is an admin when the workspace
// setting demands it. Returns nil if the check passes or is not applicable
// (no settings/members lookup configured).
func (service *Service) requireAdminForSetting(
	ctx context.Context,
	workspaceID int64,
	userID int64,
	settingEnabled bool,
) error {
	if !settingEnabled {
		return nil
	}
	if service.members == nil {
		return nil
	}
	isAdmin, err := service.members.IsWorkspaceAdmin(ctx, workspaceID, userID)
	if err != nil {
		return err
	}
	if !isAdmin {
		return ErrPermissionDenied
	}
	return nil
}

// getWorkspaceSettings returns workspace settings if a lookup is configured,
// otherwise returns default settings.
func (service *Service) getWorkspaceSettings(
	ctx context.Context,
	workspaceID int64,
) (tenantdomain.WorkspaceSettings, error) {
	if service.settings == nil {
		return tenantdomain.DefaultWorkspaceSettings(), nil
	}
	return service.settings.GetWorkspaceSettings(ctx, workspaceID)
}
