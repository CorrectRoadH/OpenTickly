package application

import (
	"errors"
	"fmt"

	"opentoggl/backend/apps/backend/internal/log"
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
)

type Service struct {
	store  Store
	logger log.Logger
}

func NewService(store Store, logger log.Logger) (*Service, error) {
	if store == nil {
		return nil, ErrStoreRequired
	}
	if logger == nil {
		return nil, ErrLoggerRequired
	}
	return &Service{store: store, logger: logger}, nil
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
