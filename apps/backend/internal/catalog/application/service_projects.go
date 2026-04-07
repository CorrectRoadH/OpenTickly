package application

import (
	"context"
	"strings"

	"opentoggl/backend/apps/backend/internal/catalog/domain"

	"github.com/samber/lo"
)

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
