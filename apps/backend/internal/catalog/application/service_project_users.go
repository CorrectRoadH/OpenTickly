package application

import (
	"context"
)

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
