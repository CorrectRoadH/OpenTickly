package application

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"opentoggl/backend/apps/backend/internal/catalog/domain"
	"opentoggl/backend/apps/backend/internal/log"

	"github.com/samber/lo"
)

var (
	ErrStoreRequired        = errors.New("catalog store is required")
	ErrLoggerRequired       = errors.New("catalog logger is required")
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
	service.logger.InfoContext(ctx, "creating client",
		"workspace_id", command.WorkspaceID,
		"name", command.Name,
	)
	name, err := domain.NormalizeCatalogName(command.Name)
	if err != nil {
		service.logger.WarnContext(ctx, "invalid client data",
			"workspace_id", command.WorkspaceID,
			"error", err.Error(),
		)
		return ClientView{}, err
	}
	command.Name = name
	view, err := service.store.CreateClient(ctx, command)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to create client",
			"workspace_id", command.WorkspaceID,
			"error", err.Error(),
		)
		return ClientView{}, err
	}
	service.logger.InfoContext(ctx, "client created",
		"workspace_id", command.WorkspaceID,
		"client_id", view.ID,
	)
	return view, nil
}

func (service *Service) GetClient(ctx context.Context, workspaceID int64, clientID int64) (ClientView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return ClientView{}, err
	}
	return service.loadClient(ctx, workspaceID, clientID)
}

func (service *Service) UpdateClient(ctx context.Context, command UpdateClientCommand) (ClientView, error) {
	service.logger.InfoContext(ctx, "updating client",
		"workspace_id", command.WorkspaceID,
		"client_id", command.ClientID,
	)
	current, ok, err := service.store.GetClient(ctx, command.WorkspaceID, command.ClientID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get client for update",
			"workspace_id", command.WorkspaceID,
			"client_id", command.ClientID,
			"error", err.Error(),
		)
		return ClientView{}, err
	}
	if !ok {
		service.logger.WarnContext(ctx, "client not found for update",
			"workspace_id", command.WorkspaceID,
			"client_id", command.ClientID,
		)
		return ClientView{}, ErrClientNotFound
	}

	if command.Name != nil {
		name, err := domain.NormalizeCatalogName(*command.Name)
		if err != nil {
			service.logger.WarnContext(ctx, "invalid client name",
				"workspace_id", command.WorkspaceID,
				"client_id", command.ClientID,
				"error", err.Error(),
			)
			return ClientView{}, err
		}
		current.Name = name
	}
	if command.Notes != nil {
		current.Notes = *command.Notes
	}

	if err := service.store.UpdateClient(ctx, current); err != nil {
		service.logger.ErrorContext(ctx, "failed to update client",
			"workspace_id", command.WorkspaceID,
			"client_id", command.ClientID,
			"error", err.Error(),
		)
		return ClientView{}, err
	}
	view, err := service.loadClient(ctx, command.WorkspaceID, command.ClientID)
	if err != nil {
		return ClientView{}, err
	}
	service.logger.InfoContext(ctx, "client updated",
		"workspace_id", command.WorkspaceID,
		"client_id", view.ID,
	)
	return view, nil
}

func (service *Service) DeleteClients(ctx context.Context, workspaceID int64, clientIDs []int64) error {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return err
	}
	if len(clientIDs) == 0 {
		return nil
	}
	service.logger.InfoContext(ctx, "deleting clients",
		"workspace_id", workspaceID,
		"client_ids", clientIDs,
	)
	if _, err := service.ListClientsByIDs(ctx, workspaceID, clientIDs); err != nil {
		return err
	}
	if err := service.store.DeleteClients(ctx, workspaceID, clientIDs); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete clients",
			"workspace_id", workspaceID,
			"client_ids", clientIDs,
			"error", err.Error(),
		)
		return err
	}
	service.logger.InfoContext(ctx, "clients deleted",
		"workspace_id", workspaceID,
		"client_ids", clientIDs,
	)
	return nil
}

func (service *Service) ArchiveClient(ctx context.Context, workspaceID int64, clientID int64) ([]int64, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	service.logger.InfoContext(ctx, "archiving client",
		"workspace_id", workspaceID,
		"client_id", clientID,
	)
	if _, ok, err := service.store.GetClient(ctx, workspaceID, clientID); err != nil {
		service.logger.ErrorContext(ctx, "failed to get client for archive",
			"workspace_id", workspaceID,
			"client_id", clientID,
			"error", err.Error(),
		)
		return nil, err
	} else if !ok {
		service.logger.WarnContext(ctx, "client not found for archive",
			"workspace_id", workspaceID,
			"client_id", clientID,
		)
		return nil, ErrClientNotFound
	}
	projectIDs, err := service.store.ArchiveClientAndProjects(ctx, workspaceID, clientID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to archive client",
			"workspace_id", workspaceID,
			"client_id", clientID,
			"error", err.Error(),
		)
		return nil, err
	}
	service.logger.InfoContext(ctx, "client archived",
		"workspace_id", workspaceID,
		"client_id", clientID,
		"archived_project_ids", projectIDs,
	)
	return projectIDs, nil
}

func (service *Service) RestoreClient(ctx context.Context, command RestoreClientCommand) (ClientView, error) {
	if err := requireWorkspaceID(command.WorkspaceID); err != nil {
		return ClientView{}, err
	}
	service.logger.InfoContext(ctx, "restoring client",
		"workspace_id", command.WorkspaceID,
		"client_id", command.ClientID,
		"project_ids", command.ProjectIDs,
		"restore_all_projects", command.RestoreAllProjects,
	)
	if _, ok, err := service.store.GetClient(ctx, command.WorkspaceID, command.ClientID); err != nil {
		service.logger.ErrorContext(ctx, "failed to get client for restore",
			"workspace_id", command.WorkspaceID,
			"client_id", command.ClientID,
			"error", err.Error(),
		)
		return ClientView{}, err
	} else if !ok {
		service.logger.WarnContext(ctx, "client not found for restore",
			"workspace_id", command.WorkspaceID,
			"client_id", command.ClientID,
		)
		return ClientView{}, ErrClientNotFound
	}
	for _, projectID := range command.ProjectIDs {
		project, ok, err := service.store.GetProject(ctx, command.WorkspaceID, projectID)
		if err != nil {
			service.logger.ErrorContext(ctx, "failed to get project for restore",
				"workspace_id", command.WorkspaceID,
				"client_id", command.ClientID,
				"project_id", projectID,
				"error", err.Error(),
			)
			return ClientView{}, err
		}
		if !ok || project.ClientID == nil || *project.ClientID != command.ClientID {
			service.logger.WarnContext(ctx, "project not found for restore",
				"workspace_id", command.WorkspaceID,
				"client_id", command.ClientID,
				"project_id", projectID,
			)
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
		service.logger.ErrorContext(ctx, "failed to restore client",
			"workspace_id", command.WorkspaceID,
			"client_id", command.ClientID,
			"error", err.Error(),
		)
		return ClientView{}, err
	}
	view, err := service.loadClient(ctx, command.WorkspaceID, command.ClientID)
	if err != nil {
		return ClientView{}, err
	}
	service.logger.InfoContext(ctx, "client restored",
		"workspace_id", command.WorkspaceID,
		"client_id", command.ClientID,
	)
	return view, nil
}

func (service *Service) ListGroups(ctx context.Context, organizationID int64) ([]GroupView, error) {
	if organizationID <= 0 {
		return nil, fmt.Errorf("%w: %d", ErrInvalidWorkspace, organizationID)
	}
	return service.store.ListGroups(ctx, organizationID)
}

func (service *Service) GetGroup(ctx context.Context, organizationID int64, groupID int64) (GroupView, error) {
	return service.loadGroup(ctx, organizationID, groupID)
}

func (service *Service) CreateGroup(ctx context.Context, command CreateGroupCommand) (GroupView, error) {
	service.logger.InfoContext(ctx, "creating group",
		"organization_id", command.OrganizationID,
		"name", command.Name,
	)
	name, err := domain.NormalizeCatalogName(command.Name)
	if err != nil {
		service.logger.WarnContext(ctx, "invalid group data",
			"organization_id", command.OrganizationID,
			"error", err.Error(),
		)
		return GroupView{}, err
	}
	command.Name = name
	view, err := service.store.CreateGroup(ctx, command)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to create group",
			"organization_id", command.OrganizationID,
			"error", err.Error(),
		)
		return GroupView{}, err
	}
	service.logger.InfoContext(ctx, "group created",
		"organization_id", command.OrganizationID,
		"group_id", view.ID,
	)
	return view, nil
}

func (service *Service) UpdateGroup(ctx context.Context, organizationID int64, groupID int64, name string) (GroupView, error) {
	service.logger.InfoContext(ctx, "updating group",
		"organization_id", organizationID,
		"group_id", groupID,
	)
	current, ok, err := service.store.GetGroup(ctx, organizationID, groupID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get group for update",
			"organization_id", organizationID,
			"group_id", groupID,
			"error", err.Error(),
		)
		return GroupView{}, err
	}
	if !ok {
		service.logger.WarnContext(ctx, "group not found for update",
			"organization_id", organizationID,
			"group_id", groupID,
		)
		return GroupView{}, ErrGroupNotFound
	}
	normalized, err := domain.NormalizeCatalogName(name)
	if err != nil {
		service.logger.WarnContext(ctx, "invalid group name",
			"organization_id", organizationID,
			"group_id", groupID,
			"error", err.Error(),
		)
		return GroupView{}, err
	}
	current.Name = normalized
	if err := service.store.UpdateGroup(ctx, current); err != nil {
		service.logger.ErrorContext(ctx, "failed to update group",
			"organization_id", organizationID,
			"group_id", groupID,
			"error", err.Error(),
		)
		return GroupView{}, err
	}
	view, err := service.loadGroup(ctx, organizationID, groupID)
	if err != nil {
		return GroupView{}, err
	}
	service.logger.InfoContext(ctx, "group updated",
		"organization_id", organizationID,
		"group_id", groupID,
	)
	return view, nil
}

func (service *Service) DeleteGroup(ctx context.Context, organizationID int64, groupID int64) error {
	service.logger.InfoContext(ctx, "deleting group",
		"organization_id", organizationID,
		"group_id", groupID,
	)
	if _, ok, err := service.store.GetGroup(ctx, organizationID, groupID); err != nil {
		service.logger.ErrorContext(ctx, "failed to get group for deletion",
			"organization_id", organizationID,
			"group_id", groupID,
			"error", err.Error(),
		)
		return err
	} else if !ok {
		service.logger.WarnContext(ctx, "group not found for deletion",
			"organization_id", organizationID,
			"group_id", groupID,
		)
		return ErrGroupNotFound
	}
	if err := service.store.DeleteGroup(ctx, organizationID, groupID); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete group",
			"organization_id", organizationID,
			"group_id", groupID,
			"error", err.Error(),
		)
		return err
	}
	service.logger.InfoContext(ctx, "group deleted",
		"organization_id", organizationID,
		"group_id", groupID,
	)
	return nil
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
	service.logger.InfoContext(ctx, "creating tag",
		"workspace_id", command.WorkspaceID,
		"name", command.Name,
	)
	name, err := domain.NormalizeCatalogName(command.Name)
	if err != nil {
		service.logger.WarnContext(ctx, "invalid tag data",
			"workspace_id", command.WorkspaceID,
			"error", err.Error(),
		)
		return TagView{}, err
	}
	command.Name = name
	view, err := service.store.CreateTag(ctx, command)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to create tag",
			"workspace_id", command.WorkspaceID,
			"error", err.Error(),
		)
		return TagView{}, err
	}
	service.logger.InfoContext(ctx, "tag created",
		"workspace_id", command.WorkspaceID,
		"tag_id", view.ID,
	)
	return view, nil
}

func (service *Service) EnsureTagsByName(ctx context.Context, workspaceID int64, createdBy int64, names []string) ([]int64, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	return service.store.EnsureTagsByName(ctx, workspaceID, createdBy, names)
}

func (service *Service) GetTag(ctx context.Context, workspaceID int64, tagID int64) (TagView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return TagView{}, err
	}
	return service.loadTag(ctx, workspaceID, tagID)
}

func (service *Service) UpdateTag(ctx context.Context, command UpdateTagCommand) (TagView, error) {
	service.logger.InfoContext(ctx, "updating tag",
		"workspace_id", command.WorkspaceID,
		"tag_id", command.TagID,
	)
	current, ok, err := service.store.GetTag(ctx, command.WorkspaceID, command.TagID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get tag for update",
			"workspace_id", command.WorkspaceID,
			"tag_id", command.TagID,
			"error", err.Error(),
		)
		return TagView{}, err
	}
	if !ok {
		service.logger.WarnContext(ctx, "tag not found for update",
			"workspace_id", command.WorkspaceID,
			"tag_id", command.TagID,
		)
		return TagView{}, ErrTagNotFound
	}

	if command.Name != nil {
		name, err := domain.NormalizeCatalogName(*command.Name)
		if err != nil {
			service.logger.WarnContext(ctx, "invalid tag name",
				"workspace_id", command.WorkspaceID,
				"tag_id", command.TagID,
				"error", err.Error(),
			)
			return TagView{}, err
		}
		current.Name = name
	}

	if err := service.store.UpdateTag(ctx, current); err != nil {
		service.logger.ErrorContext(ctx, "failed to update tag",
			"workspace_id", command.WorkspaceID,
			"tag_id", command.TagID,
			"error", err.Error(),
		)
		return TagView{}, err
	}
	view, err := service.loadTag(ctx, command.WorkspaceID, command.TagID)
	if err != nil {
		return TagView{}, err
	}
	service.logger.InfoContext(ctx, "tag updated",
		"workspace_id", command.WorkspaceID,
		"tag_id", command.TagID,
	)
	return view, nil
}

func (service *Service) DeleteTag(ctx context.Context, workspaceID int64, tagID int64) error {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return err
	}
	service.logger.InfoContext(ctx, "deleting tag",
		"workspace_id", workspaceID,
		"tag_id", tagID,
	)
	if _, ok, err := service.store.GetTag(ctx, workspaceID, tagID); err != nil {
		service.logger.ErrorContext(ctx, "failed to get tag for deletion",
			"workspace_id", workspaceID,
			"tag_id", tagID,
			"error", err.Error(),
		)
		return err
	} else if !ok {
		service.logger.WarnContext(ctx, "tag not found for deletion",
			"workspace_id", workspaceID,
			"tag_id", tagID,
		)
		return ErrTagNotFound
	}
	if err := service.store.DeleteTag(ctx, workspaceID, tagID); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete tag",
			"workspace_id", workspaceID,
			"tag_id", tagID,
			"error", err.Error(),
		)
		return err
	}
	service.logger.InfoContext(ctx, "tag deleted",
		"workspace_id", workspaceID,
		"tag_id", tagID,
	)
	return nil
}

func (service *Service) DeleteTags(ctx context.Context, workspaceID int64, tagIDs []int64) error {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return err
	}
	if len(tagIDs) == 0 {
		return nil
	}
	service.logger.InfoContext(ctx, "deleting tags",
		"workspace_id", workspaceID,
		"tag_ids", tagIDs,
	)
	if err := service.store.DeleteTags(ctx, workspaceID, tagIDs); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete tags",
			"workspace_id", workspaceID,
			"tag_ids", tagIDs,
			"error", err.Error(),
		)
		return err
	}
	service.logger.InfoContext(ctx, "tags deleted",
		"workspace_id", workspaceID,
		"tag_ids", tagIDs,
	)
	return nil
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
	service.logger.InfoContext(ctx, "creating project user",
		"workspace_id", command.WorkspaceID,
		"project_id", command.ProjectID,
		"user_id", command.UserID,
	)
	if _, ok, err := service.store.GetProject(ctx, command.WorkspaceID, command.ProjectID); err != nil {
		service.logger.ErrorContext(ctx, "failed to get project for project user creation",
			"workspace_id", command.WorkspaceID,
			"project_id", command.ProjectID,
			"error", err.Error(),
		)
		return ProjectUserView{}, err
	} else if !ok {
		service.logger.WarnContext(ctx, "project not found for project user creation",
			"workspace_id", command.WorkspaceID,
			"project_id", command.ProjectID,
		)
		return ProjectUserView{}, ErrProjectNotFound
	}
	view, err := service.store.CreateProjectUser(ctx, command)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to create project user",
			"workspace_id", command.WorkspaceID,
			"project_id", command.ProjectID,
			"user_id", command.UserID,
			"error", err.Error(),
		)
		return ProjectUserView{}, err
	}
	service.logger.InfoContext(ctx, "project user created",
		"workspace_id", command.WorkspaceID,
		"project_id", command.ProjectID,
		"user_id", command.UserID,
	)
	return view, nil
}

func (service *Service) UpdateProjectUser(ctx context.Context, command UpdateProjectUserCommand) (ProjectUserView, error) {
	if err := requireWorkspaceID(command.WorkspaceID); err != nil {
		return ProjectUserView{}, err
	}
	service.logger.InfoContext(ctx, "updating project user",
		"workspace_id", command.WorkspaceID,
		"project_id", command.ProjectID,
		"user_id", command.UserID,
	)
	if _, ok, err := service.store.GetProject(ctx, command.WorkspaceID, command.ProjectID); err != nil {
		service.logger.ErrorContext(ctx, "failed to get project for project user update",
			"workspace_id", command.WorkspaceID,
			"project_id", command.ProjectID,
			"error", err.Error(),
		)
		return ProjectUserView{}, err
	} else if !ok {
		service.logger.WarnContext(ctx, "project not found for project user update",
			"workspace_id", command.WorkspaceID,
			"project_id", command.ProjectID,
		)
		return ProjectUserView{}, ErrProjectNotFound
	}

	current, ok, err := service.store.GetProjectUser(ctx, command.WorkspaceID, command.ProjectID, command.UserID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get project user for update",
			"workspace_id", command.WorkspaceID,
			"project_id", command.ProjectID,
			"user_id", command.UserID,
			"error", err.Error(),
		)
		return ProjectUserView{}, err
	}
	if !ok {
		service.logger.WarnContext(ctx, "project user not found for update",
			"workspace_id", command.WorkspaceID,
			"project_id", command.ProjectID,
			"user_id", command.UserID,
		)
		return ProjectUserView{}, ErrProjectUserNotFound
	}

	current.Role = projectUserRole(command.Manager)
	if err := service.store.UpdateProjectUser(ctx, current); err != nil {
		service.logger.ErrorContext(ctx, "failed to update project user",
			"workspace_id", command.WorkspaceID,
			"project_id", command.ProjectID,
			"user_id", command.UserID,
			"error", err.Error(),
		)
		return ProjectUserView{}, err
	}
	updated, ok, err := service.store.GetProjectUser(ctx, command.WorkspaceID, command.ProjectID, command.UserID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get updated project user",
			"workspace_id", command.WorkspaceID,
			"project_id", command.ProjectID,
			"user_id", command.UserID,
			"error", err.Error(),
		)
		return ProjectUserView{}, err
	}
	if !ok {
		service.logger.WarnContext(ctx, "project user not found after update",
			"workspace_id", command.WorkspaceID,
			"project_id", command.ProjectID,
			"user_id", command.UserID,
		)
		return ProjectUserView{}, ErrProjectUserNotFound
	}
	service.logger.InfoContext(ctx, "project user updated",
		"workspace_id", command.WorkspaceID,
		"project_id", command.ProjectID,
		"user_id", command.UserID,
	)
	return updated, nil
}

func (service *Service) DeleteProjectUser(ctx context.Context, workspaceID int64, projectID int64, userID int64) error {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return err
	}
	service.logger.InfoContext(ctx, "deleting project user",
		"workspace_id", workspaceID,
		"project_id", projectID,
		"user_id", userID,
	)
	if _, ok, err := service.store.GetProject(ctx, workspaceID, projectID); err != nil {
		service.logger.ErrorContext(ctx, "failed to get project for project user deletion",
			"workspace_id", workspaceID,
			"project_id", projectID,
			"error", err.Error(),
		)
		return err
	} else if !ok {
		service.logger.WarnContext(ctx, "project not found for project user deletion",
			"workspace_id", workspaceID,
			"project_id", projectID,
		)
		return ErrProjectNotFound
	}
	if _, ok, err := service.store.GetProjectUser(ctx, workspaceID, projectID, userID); err != nil {
		service.logger.ErrorContext(ctx, "failed to get project user for deletion",
			"workspace_id", workspaceID,
			"project_id", projectID,
			"user_id", userID,
			"error", err.Error(),
		)
		return err
	} else if !ok {
		service.logger.WarnContext(ctx, "project user not found for deletion",
			"workspace_id", workspaceID,
			"project_id", projectID,
			"user_id", userID,
		)
		return ErrProjectUserNotFound
	}
	if err := service.store.DeleteProjectUser(ctx, workspaceID, projectID, userID); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete project user",
			"workspace_id", workspaceID,
			"project_id", projectID,
			"user_id", userID,
			"error", err.Error(),
		)
		return err
	}
	service.logger.InfoContext(ctx, "project user deleted",
		"workspace_id", workspaceID,
		"project_id", projectID,
		"user_id", userID,
	)
	return nil
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
	service.logger.InfoContext(ctx, "creating project",
		"workspace_id", command.WorkspaceID,
		"name", command.Name,
		"client_id", command.ClientID,
	)
	name, err := domain.NormalizeCatalogName(command.Name)
	if err != nil {
		service.logger.WarnContext(ctx, "invalid project data",
			"workspace_id", command.WorkspaceID,
			"error", err.Error(),
		)
		return ProjectView{}, err
	}
	command.Name = name
	if command.Active == nil {
		command.Active = lo.ToPtr(true)
	}
	view, err := service.store.CreateProject(ctx, command)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to create project",
			"workspace_id", command.WorkspaceID,
			"error", err.Error(),
		)
		return ProjectView{}, err
	}
	service.logger.InfoContext(ctx, "project created",
		"workspace_id", command.WorkspaceID,
		"project_id", view.ID,
	)
	return view, nil
}

func (service *Service) GetProject(ctx context.Context, workspaceID int64, projectID int64) (ProjectView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return ProjectView{}, err
	}
	return service.loadProject(ctx, workspaceID, projectID)
}

func (service *Service) UpdateProject(ctx context.Context, command UpdateProjectCommand) (ProjectView, error) {
	service.logger.InfoContext(ctx, "updating project",
		"workspace_id", command.WorkspaceID,
		"project_id", command.ProjectID,
	)
	current, ok, err := service.store.GetProject(ctx, command.WorkspaceID, command.ProjectID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get project for update",
			"workspace_id", command.WorkspaceID,
			"project_id", command.ProjectID,
			"error", err.Error(),
		)
		return ProjectView{}, err
	}
	if !ok {
		service.logger.WarnContext(ctx, "project not found for update",
			"workspace_id", command.WorkspaceID,
			"project_id", command.ProjectID,
		)
		return ProjectView{}, ErrProjectNotFound
	}

	if command.Name != nil {
		name, err := domain.NormalizeCatalogName(*command.Name)
		if err != nil {
			service.logger.WarnContext(ctx, "invalid project name",
				"workspace_id", command.WorkspaceID,
				"project_id", command.ProjectID,
				"error", err.Error(),
			)
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
		service.logger.ErrorContext(ctx, "failed to update project",
			"workspace_id", command.WorkspaceID,
			"project_id", command.ProjectID,
			"error", err.Error(),
		)
		return ProjectView{}, err
	}
	view, err := service.loadProject(ctx, command.WorkspaceID, command.ProjectID)
	if err != nil {
		return ProjectView{}, err
	}
	service.logger.InfoContext(ctx, "project updated",
		"workspace_id", command.WorkspaceID,
		"project_id", command.ProjectID,
	)
	return view, nil
}

func (service *Service) SetProjectPinned(ctx context.Context, command SetProjectPinnedCommand) (ProjectView, error) {
	service.logger.InfoContext(ctx, "setting project pinned",
		"workspace_id", command.WorkspaceID,
		"project_id", command.ProjectID,
		"pinned", command.Pinned,
	)
	if _, ok, err := service.store.GetProject(ctx, command.WorkspaceID, command.ProjectID); err != nil {
		service.logger.ErrorContext(ctx, "failed to get project for set pinned",
			"workspace_id", command.WorkspaceID,
			"project_id", command.ProjectID,
			"error", err.Error(),
		)
		return ProjectView{}, err
	} else if !ok {
		service.logger.WarnContext(ctx, "project not found for set pinned",
			"workspace_id", command.WorkspaceID,
			"project_id", command.ProjectID,
		)
		return ProjectView{}, ErrProjectNotFound
	}
	if err := service.store.SetProjectPinned(ctx, command.WorkspaceID, command.ProjectID, command.Pinned); err != nil {
		service.logger.ErrorContext(ctx, "failed to set project pinned",
			"workspace_id", command.WorkspaceID,
			"project_id", command.ProjectID,
			"error", err.Error(),
		)
		return ProjectView{}, err
	}
	view, err := service.loadProject(ctx, command.WorkspaceID, command.ProjectID)
	if err != nil {
		return ProjectView{}, err
	}
	service.logger.InfoContext(ctx, "project pinned set",
		"workspace_id", command.WorkspaceID,
		"project_id", command.ProjectID,
	)
	return view, nil
}

func (service *Service) DeleteProject(ctx context.Context, workspaceID int64, projectID int64) error {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return err
	}
	service.logger.InfoContext(ctx, "deleting project",
		"workspace_id", workspaceID,
		"project_id", projectID,
	)
	if _, ok, err := service.store.GetProject(ctx, workspaceID, projectID); err != nil {
		service.logger.ErrorContext(ctx, "failed to get project for deletion",
			"workspace_id", workspaceID,
			"project_id", projectID,
			"error", err.Error(),
		)
		return err
	} else if !ok {
		service.logger.WarnContext(ctx, "project not found for deletion",
			"workspace_id", workspaceID,
			"project_id", projectID,
		)
		return ErrProjectNotFound
	}
	if err := service.store.DeleteProject(ctx, workspaceID, projectID); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete project",
			"workspace_id", workspaceID,
			"project_id", projectID,
			"error", err.Error(),
		)
		return err
	}
	service.logger.InfoContext(ctx, "project deleted",
		"workspace_id", workspaceID,
		"project_id", projectID,
	)
	return nil
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
	service.logger.InfoContext(ctx, "creating task",
		"workspace_id", command.WorkspaceID,
		"project_id", command.ProjectID,
		"name", command.Name,
	)
	if command.ProjectID != nil {
		if _, ok, err := service.store.GetProject(ctx, command.WorkspaceID, *command.ProjectID); err != nil {
			service.logger.ErrorContext(ctx, "failed to get project for task creation",
				"workspace_id", command.WorkspaceID,
				"project_id", *command.ProjectID,
				"error", err.Error(),
			)
			return TaskView{}, err
		} else if !ok {
			service.logger.WarnContext(ctx, "project not found for task creation",
				"workspace_id", command.WorkspaceID,
				"project_id", *command.ProjectID,
			)
			return TaskView{}, ErrProjectNotFound
		}
	}
	name, err := domain.NormalizeCatalogName(command.Name)
	if err != nil {
		service.logger.WarnContext(ctx, "invalid task data",
			"workspace_id", command.WorkspaceID,
			"error", err.Error(),
		)
		return TaskView{}, err
	}
	command.Name = name
	if command.Active == nil {
		command.Active = lo.ToPtr(true)
	}
	view, err := service.store.CreateTask(ctx, command)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to create task",
			"workspace_id", command.WorkspaceID,
			"error", err.Error(),
		)
		return TaskView{}, err
	}
	service.logger.InfoContext(ctx, "task created",
		"workspace_id", command.WorkspaceID,
		"task_id", view.ID,
	)
	return view, nil
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
	service.logger.InfoContext(ctx, "updating task",
		"workspace_id", command.WorkspaceID,
		"project_id", command.ProjectID,
		"task_id", command.TaskID,
	)
	current, err := service.GetTask(ctx, command.WorkspaceID, command.ProjectID, command.TaskID)
	if err != nil {
		return TaskView{}, err
	}

	if command.Name != nil {
		name, err := domain.NormalizeCatalogName(*command.Name)
		if err != nil {
			service.logger.WarnContext(ctx, "invalid task name",
				"workspace_id", command.WorkspaceID,
				"task_id", command.TaskID,
				"error", err.Error(),
			)
			return TaskView{}, err
		}
		current.Name = name
	}
	if command.Active != nil {
		current.Active = *command.Active
	}

	if err := service.store.UpdateTask(ctx, current); err != nil {
		service.logger.ErrorContext(ctx, "failed to update task",
			"workspace_id", command.WorkspaceID,
			"task_id", command.TaskID,
			"error", err.Error(),
		)
		return TaskView{}, err
	}
	view, err := service.GetTask(ctx, command.WorkspaceID, command.ProjectID, command.TaskID)
	if err != nil {
		return TaskView{}, err
	}
	service.logger.InfoContext(ctx, "task updated",
		"workspace_id", command.WorkspaceID,
		"task_id", command.TaskID,
	)
	return view, nil
}

func (service *Service) DeleteTask(ctx context.Context, workspaceID int64, projectID int64, taskID int64) error {
	service.logger.InfoContext(ctx, "deleting task",
		"workspace_id", workspaceID,
		"project_id", projectID,
		"task_id", taskID,
	)
	if _, err := service.GetTask(ctx, workspaceID, projectID, taskID); err != nil {
		return err
	}
	if err := service.store.DeleteTask(ctx, workspaceID, taskID); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete task",
			"workspace_id", workspaceID,
			"task_id", taskID,
			"error", err.Error(),
		)
		return err
	}
	service.logger.InfoContext(ctx, "task deleted",
		"workspace_id", workspaceID,
		"task_id", taskID,
	)
	return nil
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

func (service *Service) loadGroup(ctx context.Context, organizationID int64, groupID int64) (GroupView, error) {
	group, ok, err := service.store.GetGroup(ctx, organizationID, groupID)
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
	service.logger.InfoContext(ctx, "patching projects",
		"workspace_id", workspaceID,
		"project_ids", projectIDs,
	)

	// Load all projects
	for _, projectID := range projectIDs {
		if _, ok, err := service.store.GetProject(ctx, workspaceID, projectID); err != nil {
			service.logger.ErrorContext(ctx, "failed to get project for patching",
				"workspace_id", workspaceID,
				"project_id", projectID,
				"error", err.Error(),
			)
			return nil, err
		} else if !ok {
			service.logger.WarnContext(ctx, "project not found for patching",
				"workspace_id", workspaceID,
				"project_id", projectID,
			)
			return nil, ErrProjectNotFound
		}
	}

	if err := service.store.PatchProjects(ctx, workspaceID, projectIDs, commands); err != nil {
		service.logger.ErrorContext(ctx, "failed to patch projects",
			"workspace_id", workspaceID,
			"project_ids", projectIDs,
			"error", err.Error(),
		)
		return nil, err
	}
	service.logger.InfoContext(ctx, "projects patched",
		"workspace_id", workspaceID,
		"project_ids", projectIDs,
	)
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
	service.logger.InfoContext(ctx, "patching tasks",
		"workspace_id", workspaceID,
		"project_id", projectID,
		"task_ids", taskIDs,
	)
	if _, ok, err := service.store.GetProject(ctx, workspaceID, projectID); err != nil {
		service.logger.ErrorContext(ctx, "failed to get project for patching tasks",
			"workspace_id", workspaceID,
			"project_id", projectID,
			"error", err.Error(),
		)
		return nil, err
	} else if !ok {
		service.logger.WarnContext(ctx, "project not found for patching tasks",
			"workspace_id", workspaceID,
			"project_id", projectID,
		)
		return nil, ErrProjectNotFound
	}
	if len(taskIDs) == 0 {
		return nil, nil
	}

	for _, taskID := range taskIDs {
		task, ok, err := service.store.GetTask(ctx, workspaceID, taskID)
		if err != nil {
			service.logger.ErrorContext(ctx, "failed to get task for patching",
				"workspace_id", workspaceID,
				"task_id", taskID,
				"error", err.Error(),
			)
			return nil, err
		}
		if !ok || task.ProjectID == nil || *task.ProjectID != projectID {
			service.logger.WarnContext(ctx, "task not found for patching",
				"workspace_id", workspaceID,
				"task_id", taskID,
			)
			return nil, ErrTaskNotFound
		}
	}

	if err := service.store.PatchTasks(ctx, workspaceID, projectID, taskIDs, commands); err != nil {
		service.logger.ErrorContext(ctx, "failed to patch tasks",
			"workspace_id", workspaceID,
			"task_ids", taskIDs,
			"error", err.Error(),
		)
		return nil, err
	}
	service.logger.InfoContext(ctx, "tasks patched",
		"workspace_id", workspaceID,
		"task_ids", taskIDs,
	)
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
	service.logger.InfoContext(ctx, "patching project users",
		"workspace_id", workspaceID,
		"project_user_ids", projectUserIDs,
	)

	for _, pair := range projectUserIDs {
		projectID, userID := pair[0], pair[1]
		if _, ok, err := service.store.GetProjectUser(ctx, workspaceID, projectID, userID); err != nil {
			service.logger.ErrorContext(ctx, "failed to get project user for patching",
				"workspace_id", workspaceID,
				"project_id", projectID,
				"user_id", userID,
				"error", err.Error(),
			)
			return nil, err
		} else if !ok {
			service.logger.WarnContext(ctx, "project user not found for patching",
				"workspace_id", workspaceID,
				"project_id", projectID,
				"user_id", userID,
			)
			return nil, ErrProjectUserNotFound
		}
	}

	if err := service.store.PatchProjectUsers(ctx, workspaceID, projectUserIDs, commands); err != nil {
		service.logger.ErrorContext(ctx, "failed to patch project users",
			"workspace_id", workspaceID,
			"error", err.Error(),
		)
		return nil, err
	}
	service.logger.InfoContext(ctx, "project users patched",
		"workspace_id", workspaceID,
	)
	return projectUserIDs, nil
}
