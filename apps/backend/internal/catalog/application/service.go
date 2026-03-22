package application

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"opentoggl/backend/apps/backend/internal/catalog/domain"
)

var (
	ErrStoreRequired    = errors.New("catalog store is required")
	ErrProjectNotFound  = errors.New("catalog project not found")
	ErrInvalidWorkspace = errors.New("catalog workspace id must be positive")
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

func (service *Service) ListClients(ctx context.Context, workspaceID int64, filter ListClientsFilter) ([]ClientView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	filter.Name = strings.TrimSpace(filter.Name)
	filter.Status = normalizeClientStatus(filter.Status)
	return service.store.ListClients(ctx, workspaceID, filter)
}

func (service *Service) CreateClient(ctx context.Context, command CreateClientCommand) (ClientView, error) {
	name, err := domain.NormalizeCatalogName(command.Name)
	if err != nil {
		return ClientView{}, err
	}
	command.Name = name
	return service.store.CreateClient(ctx, command)
}

func (service *Service) ListGroups(ctx context.Context, workspaceID int64) ([]GroupView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	return service.store.ListGroups(ctx, workspaceID)
}

func (service *Service) CreateGroup(ctx context.Context, command CreateGroupCommand) (GroupView, error) {
	name, err := domain.NormalizeCatalogName(command.Name)
	if err != nil {
		return GroupView{}, err
	}
	command.Name = name
	return service.store.CreateGroup(ctx, command)
}

func (service *Service) ListTags(ctx context.Context, workspaceID int64, filter ListTagsFilter) ([]TagView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	filter.Search = strings.TrimSpace(filter.Search)
	filter.Page = normalizePage(filter.Page, 1)
	filter.PerPage = normalizePerPage(filter.PerPage, 200, 200)
	return service.store.ListTags(ctx, workspaceID, filter)
}

func (service *Service) CreateTag(ctx context.Context, command CreateTagCommand) (TagView, error) {
	name, err := domain.NormalizeCatalogName(command.Name)
	if err != nil {
		return TagView{}, err
	}
	command.Name = name
	return service.store.CreateTag(ctx, command)
}

func (service *Service) ListProjectUsers(
	ctx context.Context,
	workspaceID int64,
	filter ListProjectUsersFilter,
) ([]ProjectUserView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	return service.store.ListProjectUsers(ctx, workspaceID, filter)
}

func (service *Service) ListProjects(ctx context.Context, workspaceID int64, filter ListProjectsFilter) ([]ProjectView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	filter.Name = strings.TrimSpace(filter.Name)
	filter.Search = strings.TrimSpace(filter.Search)
	filter.Page = normalizePage(filter.Page, 1)
	filter.PerPage = normalizePerPage(filter.PerPage, 151, 200)
	filter.SortField = normalizeProjectSortField(filter.SortField)
	filter.SortOrder = normalizeSortOrder(filter.SortOrder)
	return service.store.ListProjects(ctx, workspaceID, filter)
}

func (service *Service) CreateProject(ctx context.Context, command CreateProjectCommand) (ProjectView, error) {
	name, err := domain.NormalizeCatalogName(command.Name)
	if err != nil {
		return ProjectView{}, err
	}
	command.Name = name
	if command.Active == nil {
		command.Active = boolPtr(true)
	}
	return service.store.CreateProject(ctx, command)
}

func (service *Service) UpdateProject(ctx context.Context, command UpdateProjectCommand) (ProjectView, error) {
	current, ok, err := service.store.GetProject(ctx, command.WorkspaceID, command.ProjectID)
	if err != nil {
		return ProjectView{}, err
	}
	if !ok {
		return ProjectView{}, ErrProjectNotFound
	}

	if command.Name != nil {
		name, err := domain.NormalizeCatalogName(*command.Name)
		if err != nil {
			return ProjectView{}, err
		}
		current.Name = name
	}
	if command.ClientID != nil {
		current.ClientID = command.ClientID
	}
	if command.Active != nil {
		current.Active = *command.Active
	}
	if command.Template != nil {
		current.Template = *command.Template
	}
	if command.Recurring != nil {
		current.Recurring = *command.Recurring
	}

	if err := service.store.UpdateProject(ctx, current); err != nil {
		return ProjectView{}, err
	}
	return service.loadProject(ctx, command.WorkspaceID, command.ProjectID)
}

func (service *Service) SetProjectPinned(ctx context.Context, command SetProjectPinnedCommand) (ProjectView, error) {
	if _, ok, err := service.store.GetProject(ctx, command.WorkspaceID, command.ProjectID); err != nil {
		return ProjectView{}, err
	} else if !ok {
		return ProjectView{}, ErrProjectNotFound
	}
	if err := service.store.SetProjectPinned(ctx, command.WorkspaceID, command.ProjectID, command.Pinned); err != nil {
		return ProjectView{}, err
	}
	return service.loadProject(ctx, command.WorkspaceID, command.ProjectID)
}

func (service *Service) ListTasks(ctx context.Context, workspaceID int64, filter ListTasksFilter) (TaskPage, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return TaskPage{}, err
	}
	filter.Search = strings.TrimSpace(filter.Search)
	if filter.Active == nil {
		filter.Active = boolPtr(true)
	}
	filter.Page = normalizePage(filter.Page, 1)
	filter.PerPage = normalizePerPage(filter.PerPage, 50, 200)
	filter.SortField = normalizeTaskSortField(filter.SortField)
	filter.SortOrder = normalizeSortOrder(filter.SortOrder)
	return service.store.ListTasks(ctx, workspaceID, filter)
}

func (service *Service) CreateTask(ctx context.Context, command CreateTaskCommand) (TaskView, error) {
	if err := requireWorkspaceID(command.WorkspaceID); err != nil {
		return TaskView{}, err
	}
	if command.ProjectID != nil {
		if _, ok, err := service.store.GetProject(ctx, command.WorkspaceID, *command.ProjectID); err != nil {
			return TaskView{}, err
		} else if !ok {
			return TaskView{}, ErrProjectNotFound
		}
	}
	name, err := domain.NormalizeCatalogName(command.Name)
	if err != nil {
		return TaskView{}, err
	}
	command.Name = name
	if command.Active == nil {
		command.Active = boolPtr(true)
	}
	return service.store.CreateTask(ctx, command)
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

func boolPtr(value bool) *bool {
	return &value
}

func (service *Service) loadProject(ctx context.Context, workspaceID int64, projectID int64) (ProjectView, error) {
	project, ok, err := service.store.GetProject(ctx, workspaceID, projectID)
	if err != nil {
		return ProjectView{}, err
	}
	if !ok {
		return ProjectView{}, ErrProjectNotFound
	}
	return project, nil
}
