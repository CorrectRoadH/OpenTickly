package application

import (
	"context"
	"strings"

	"opentoggl/backend/apps/backend/internal/catalog/domain"

	"github.com/samber/lo"
)

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
