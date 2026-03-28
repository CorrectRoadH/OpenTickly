package application

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"opentoggl/backend/apps/backend/internal/catalog/domain"

	"github.com/samber/lo"
)

var (
	ErrStoreRequired        = errors.New("catalog store is required")
	ErrClientNotFound       = errors.New("catalog client not found")
	ErrGroupNotFound        = errors.New("catalog group not found")
	ErrProjectNotFound      = errors.New("catalog project not found")
	ErrProjectGroupNotFound = errors.New("catalog project group not found")
	ErrProjectUserNotFound  = errors.New("catalog project user not found")
	ErrTagNotFound          = errors.New("catalog tag not found")
	ErrTaskNotFound         = errors.New("catalog task not found")
	ErrInvalidWorkspace     = errors.New("catalog workspace id must be positive")
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

func (service *Service) ListClientsByIDs(ctx context.Context, workspaceID int64, clientIDs []int64) ([]ClientView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	if len(clientIDs) == 0 {
		return []ClientView{}, nil
	}
	clients, err := service.store.ListClientsByIDs(ctx, workspaceID, clientIDs)
	if err != nil {
		return nil, err
	}
	if len(clients) != len(clientIDs) {
		return nil, ErrClientNotFound
	}
	return clients, nil
}

func (service *Service) CreateClient(ctx context.Context, command CreateClientCommand) (ClientView, error) {
	name, err := domain.NormalizeCatalogName(command.Name)
	if err != nil {
		return ClientView{}, err
	}
	command.Name = name
	return service.store.CreateClient(ctx, command)
}

func (service *Service) GetClient(ctx context.Context, workspaceID int64, clientID int64) (ClientView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return ClientView{}, err
	}
	return service.loadClient(ctx, workspaceID, clientID)
}

func (service *Service) UpdateClient(ctx context.Context, command UpdateClientCommand) (ClientView, error) {
	current, ok, err := service.store.GetClient(ctx, command.WorkspaceID, command.ClientID)
	if err != nil {
		return ClientView{}, err
	}
	if !ok {
		return ClientView{}, ErrClientNotFound
	}

	if command.Name != nil {
		name, err := domain.NormalizeCatalogName(*command.Name)
		if err != nil {
			return ClientView{}, err
		}
		current.Name = name
	}
	if command.Notes != nil {
		current.Notes = *command.Notes
	}

	if err := service.store.UpdateClient(ctx, current); err != nil {
		return ClientView{}, err
	}
	return service.loadClient(ctx, command.WorkspaceID, command.ClientID)
}

func (service *Service) DeleteClients(ctx context.Context, workspaceID int64, clientIDs []int64) error {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return err
	}
	if len(clientIDs) == 0 {
		return nil
	}
	if _, err := service.ListClientsByIDs(ctx, workspaceID, clientIDs); err != nil {
		return err
	}
	return service.store.DeleteClients(ctx, workspaceID, clientIDs)
}

func (service *Service) ArchiveClient(ctx context.Context, workspaceID int64, clientID int64) ([]int64, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	if _, ok, err := service.store.GetClient(ctx, workspaceID, clientID); err != nil {
		return nil, err
	} else if !ok {
		return nil, ErrClientNotFound
	}
	return service.store.ArchiveClientAndProjects(ctx, workspaceID, clientID)
}

func (service *Service) RestoreClient(ctx context.Context, command RestoreClientCommand) (ClientView, error) {
	if err := requireWorkspaceID(command.WorkspaceID); err != nil {
		return ClientView{}, err
	}
	if _, ok, err := service.store.GetClient(ctx, command.WorkspaceID, command.ClientID); err != nil {
		return ClientView{}, err
	} else if !ok {
		return ClientView{}, ErrClientNotFound
	}
	for _, projectID := range command.ProjectIDs {
		project, ok, err := service.store.GetProject(ctx, command.WorkspaceID, projectID)
		if err != nil {
			return ClientView{}, err
		}
		if !ok || project.ClientID == nil || *project.ClientID != command.ClientID {
			return ClientView{}, ErrProjectNotFound
		}
	}
	if err := service.store.RestoreClientAndProjects(
		ctx,
		command.WorkspaceID,
		command.ClientID,
		command.ProjectIDs,
		command.RestoreAllProjects || len(command.ProjectIDs) == 0,
	); err != nil {
		return ClientView{}, err
	}
	return service.loadClient(ctx, command.WorkspaceID, command.ClientID)
}

func (service *Service) ListGroups(ctx context.Context, workspaceID int64) ([]GroupView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	return service.store.ListGroups(ctx, workspaceID)
}

func (service *Service) GetGroup(ctx context.Context, workspaceID int64, groupID int64) (GroupView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return GroupView{}, err
	}
	return service.loadGroup(ctx, workspaceID, groupID)
}

func (service *Service) CreateGroup(ctx context.Context, command CreateGroupCommand) (GroupView, error) {
	name, err := domain.NormalizeCatalogName(command.Name)
	if err != nil {
		return GroupView{}, err
	}
	command.Name = name
	return service.store.CreateGroup(ctx, command)
}

func (service *Service) UpdateGroup(ctx context.Context, workspaceID int64, groupID int64, name string) (GroupView, error) {
	current, ok, err := service.store.GetGroup(ctx, workspaceID, groupID)
	if err != nil {
		return GroupView{}, err
	}
	if !ok {
		return GroupView{}, ErrGroupNotFound
	}
	normalized, err := domain.NormalizeCatalogName(name)
	if err != nil {
		return GroupView{}, err
	}
	current.Name = normalized
	if err := service.store.UpdateGroup(ctx, current); err != nil {
		return GroupView{}, err
	}
	return service.loadGroup(ctx, workspaceID, groupID)
}

func (service *Service) DeleteGroup(ctx context.Context, workspaceID int64, groupID int64) error {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return err
	}
	if _, ok, err := service.store.GetGroup(ctx, workspaceID, groupID); err != nil {
		return err
	} else if !ok {
		return ErrGroupNotFound
	}
	return service.store.DeleteGroup(ctx, workspaceID, groupID)
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

func (service *Service) GetTag(ctx context.Context, workspaceID int64, tagID int64) (TagView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return TagView{}, err
	}
	return service.loadTag(ctx, workspaceID, tagID)
}

func (service *Service) UpdateTag(ctx context.Context, command UpdateTagCommand) (TagView, error) {
	current, ok, err := service.store.GetTag(ctx, command.WorkspaceID, command.TagID)
	if err != nil {
		return TagView{}, err
	}
	if !ok {
		return TagView{}, ErrTagNotFound
	}

	if command.Name != nil {
		name, err := domain.NormalizeCatalogName(*command.Name)
		if err != nil {
			return TagView{}, err
		}
		current.Name = name
	}

	if err := service.store.UpdateTag(ctx, current); err != nil {
		return TagView{}, err
	}
	return service.loadTag(ctx, command.WorkspaceID, command.TagID)
}

func (service *Service) DeleteTag(ctx context.Context, workspaceID int64, tagID int64) error {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return err
	}
	if _, ok, err := service.store.GetTag(ctx, workspaceID, tagID); err != nil {
		return err
	} else if !ok {
		return ErrTagNotFound
	}
	return service.store.DeleteTag(ctx, workspaceID, tagID)
}

func (service *Service) DeleteTags(ctx context.Context, workspaceID int64, tagIDs []int64) error {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return err
	}
	if len(tagIDs) == 0 {
		return nil
	}
	return service.store.DeleteTags(ctx, workspaceID, tagIDs)
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

func (service *Service) CreateProjectUser(ctx context.Context, command CreateProjectUserCommand) (ProjectUserView, error) {
	if err := requireWorkspaceID(command.WorkspaceID); err != nil {
		return ProjectUserView{}, err
	}
	if _, ok, err := service.store.GetProject(ctx, command.WorkspaceID, command.ProjectID); err != nil {
		return ProjectUserView{}, err
	} else if !ok {
		return ProjectUserView{}, ErrProjectNotFound
	}
	return service.store.CreateProjectUser(ctx, command)
}

func (service *Service) UpdateProjectUser(ctx context.Context, command UpdateProjectUserCommand) (ProjectUserView, error) {
	if err := requireWorkspaceID(command.WorkspaceID); err != nil {
		return ProjectUserView{}, err
	}
	if _, ok, err := service.store.GetProject(ctx, command.WorkspaceID, command.ProjectID); err != nil {
		return ProjectUserView{}, err
	} else if !ok {
		return ProjectUserView{}, ErrProjectNotFound
	}

	current, ok, err := service.store.GetProjectUser(ctx, command.WorkspaceID, command.ProjectID, command.UserID)
	if err != nil {
		return ProjectUserView{}, err
	}
	if !ok {
		return ProjectUserView{}, ErrProjectUserNotFound
	}

	current.Role = projectUserRole(command.Manager)
	if err := service.store.UpdateProjectUser(ctx, current); err != nil {
		return ProjectUserView{}, err
	}
	updated, ok, err := service.store.GetProjectUser(ctx, command.WorkspaceID, command.ProjectID, command.UserID)
	if err != nil {
		return ProjectUserView{}, err
	}
	if !ok {
		return ProjectUserView{}, ErrProjectUserNotFound
	}
	return updated, nil
}

func (service *Service) DeleteProjectUser(ctx context.Context, workspaceID int64, projectID int64, userID int64) error {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return err
	}
	if _, ok, err := service.store.GetProject(ctx, workspaceID, projectID); err != nil {
		return err
	} else if !ok {
		return ErrProjectNotFound
	}
	if _, ok, err := service.store.GetProjectUser(ctx, workspaceID, projectID, userID); err != nil {
		return err
	} else if !ok {
		return ErrProjectUserNotFound
	}
	return service.store.DeleteProjectUser(ctx, workspaceID, projectID, userID)
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
		command.Active = lo.ToPtr(true)
	}
	return service.store.CreateProject(ctx, command)
}

func (service *Service) GetProject(ctx context.Context, workspaceID int64, projectID int64) (ProjectView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return ProjectView{}, err
	}
	return service.loadProject(ctx, workspaceID, projectID)
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
	if command.Color != nil {
		current.Color = *command.Color
	}
	if command.IsPrivate != nil {
		current.IsPrivate = *command.IsPrivate
	}
	if command.Billable != nil {
		current.Billable = *command.Billable
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

func (service *Service) DeleteProject(ctx context.Context, workspaceID int64, projectID int64) error {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return err
	}
	if _, ok, err := service.store.GetProject(ctx, workspaceID, projectID); err != nil {
		return err
	} else if !ok {
		return ErrProjectNotFound
	}
	return service.store.DeleteProject(ctx, workspaceID, projectID)
}

func (service *Service) CountProjectTasks(ctx context.Context, workspaceID int64, projectIDs []int64) ([]ProjectCountView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	for _, projectID := range projectIDs {
		if _, ok, err := service.store.GetProject(ctx, workspaceID, projectID); err != nil {
			return nil, err
		} else if !ok {
			return nil, ErrProjectNotFound
		}
	}
	return service.store.CountProjectTasks(ctx, workspaceID, projectIDs)
}

func (service *Service) CountProjectUsers(ctx context.Context, workspaceID int64, projectIDs []int64) ([]ProjectCountView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	for _, projectID := range projectIDs {
		if _, ok, err := service.store.GetProject(ctx, workspaceID, projectID); err != nil {
			return nil, err
		} else if !ok {
			return nil, ErrProjectNotFound
		}
	}
	return service.store.CountProjectUsers(ctx, workspaceID, projectIDs)
}

func (service *Service) ListTasks(ctx context.Context, workspaceID int64, filter ListTasksFilter) (TaskPage, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return TaskPage{}, err
	}
	filter.Search = strings.TrimSpace(filter.Search)
	if filter.Active == nil && !filter.IncludeAll {
		filter.Active = lo.ToPtr(true)
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
		command.Active = lo.ToPtr(true)
	}
	return service.store.CreateTask(ctx, command)
}

func (service *Service) GetTask(ctx context.Context, workspaceID int64, projectID int64, taskID int64) (TaskView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return TaskView{}, err
	}
	if _, ok, err := service.store.GetProject(ctx, workspaceID, projectID); err != nil {
		return TaskView{}, err
	} else if !ok {
		return TaskView{}, ErrProjectNotFound
	}

	task, ok, err := service.store.GetTask(ctx, workspaceID, taskID)
	if err != nil {
		return TaskView{}, err
	}
	if !ok || task.ProjectID == nil || *task.ProjectID != projectID {
		return TaskView{}, ErrTaskNotFound
	}
	return task, nil
}

func (service *Service) UpdateTask(ctx context.Context, command UpdateTaskCommand) (TaskView, error) {
	current, err := service.GetTask(ctx, command.WorkspaceID, command.ProjectID, command.TaskID)
	if err != nil {
		return TaskView{}, err
	}

	if command.Name != nil {
		name, err := domain.NormalizeCatalogName(*command.Name)
		if err != nil {
			return TaskView{}, err
		}
		current.Name = name
	}
	if command.Active != nil {
		current.Active = *command.Active
	}

	if err := service.store.UpdateTask(ctx, current); err != nil {
		return TaskView{}, err
	}
	return service.GetTask(ctx, command.WorkspaceID, command.ProjectID, command.TaskID)
}

func (service *Service) DeleteTask(ctx context.Context, workspaceID int64, projectID int64, taskID int64) error {
	if _, err := service.GetTask(ctx, workspaceID, projectID, taskID); err != nil {
		return err
	}
	return service.store.DeleteTask(ctx, workspaceID, taskID)
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

func (service *Service) loadClient(ctx context.Context, workspaceID int64, clientID int64) (ClientView, error) {
	client, ok, err := service.store.GetClient(ctx, workspaceID, clientID)
	if err != nil {
		return ClientView{}, err
	}
	if !ok {
		return ClientView{}, ErrClientNotFound
	}
	return client, nil
}

func (service *Service) loadTag(ctx context.Context, workspaceID int64, tagID int64) (TagView, error) {
	tag, ok, err := service.store.GetTag(ctx, workspaceID, tagID)
	if err != nil {
		return TagView{}, err
	}
	if !ok {
		return TagView{}, ErrTagNotFound
	}
	return tag, nil
}

func (service *Service) loadGroup(ctx context.Context, workspaceID int64, groupID int64) (GroupView, error) {
	group, ok, err := service.store.GetGroup(ctx, workspaceID, groupID)
	if err != nil {
		return GroupView{}, err
	}
	if !ok {
		return GroupView{}, ErrGroupNotFound
	}
	return group, nil
}

func (service *Service) PatchProjects(
	ctx context.Context,
	workspaceID int64,
	projectIDs []int64,
	commands []PatchProjectCommand,
) ([]int64, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	if len(projectIDs) == 0 {
		return nil, nil
	}

	// Load all projects
	for _, projectID := range projectIDs {
		if _, ok, err := service.store.GetProject(ctx, workspaceID, projectID); err != nil {
			return nil, err
		} else if !ok {
			return nil, ErrProjectNotFound
		}
	}

	if err := service.store.PatchProjects(ctx, workspaceID, projectIDs, commands); err != nil {
		return nil, err
	}
	return projectIDs, nil
}

func (service *Service) PatchTasks(
	ctx context.Context,
	workspaceID int64,
	projectID int64,
	taskIDs []int64,
	commands []PatchTaskCommand,
) ([]int64, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	if _, ok, err := service.store.GetProject(ctx, workspaceID, projectID); err != nil {
		return nil, err
	} else if !ok {
		return nil, ErrProjectNotFound
	}
	if len(taskIDs) == 0 {
		return nil, nil
	}

	for _, taskID := range taskIDs {
		task, ok, err := service.store.GetTask(ctx, workspaceID, taskID)
		if err != nil {
			return nil, err
		}
		if !ok || task.ProjectID == nil || *task.ProjectID != projectID {
			return nil, ErrTaskNotFound
		}
	}

	if err := service.store.PatchTasks(ctx, workspaceID, projectID, taskIDs, commands); err != nil {
		return nil, err
	}
	return taskIDs, nil
}

func (service *Service) PatchProjectUsers(
	ctx context.Context,
	workspaceID int64,
	projectUserIDs [][2]int64,
	commands []PatchProjectUserCommand,
) ([][2]int64, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	if len(projectUserIDs) == 0 {
		return nil, nil
	}

	for _, pair := range projectUserIDs {
		projectID, userID := pair[0], pair[1]
		if _, ok, err := service.store.GetProjectUser(ctx, workspaceID, projectID, userID); err != nil {
			return nil, err
		} else if !ok {
			return nil, ErrProjectUserNotFound
		}
	}

	if err := service.store.PatchProjectUsers(ctx, workspaceID, projectUserIDs, commands); err != nil {
		return nil, err
	}
	return projectUserIDs, nil
}
