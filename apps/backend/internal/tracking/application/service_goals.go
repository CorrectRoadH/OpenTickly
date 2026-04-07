package application

import (
	"context"
	"strings"

	"opentoggl/backend/apps/backend/internal/xptr"
)

func (service *Service) ListGoals(ctx context.Context, workspaceID int64, filter ListGoalsFilter) ([]GoalView, error) {
	filter.Page = normalizePage(filter.Page, 1)
	filter.PerPage = normalizePage(filter.PerPage, 20)
	goals, err := service.store.ListGoals(ctx, workspaceID, filter)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to list goals",
			"workspace_id", workspaceID,
			"error", err.Error(),
		)
		return nil, err
	}
	return goals, nil
}

func (service *Service) GetGoal(ctx context.Context, workspaceID int64, userID int64, goalID int64) (GoalView, error) {
	goal, ok, err := service.store.GetGoal(ctx, workspaceID, userID, goalID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get goal",
			"workspace_id", workspaceID,
			"user_id", userID,
			"goal_id", goalID,
			"error", err.Error(),
		)
		return GoalView{}, err
	}
	if !ok {
		service.logger.WarnContext(ctx, "goal not found",
			"workspace_id", workspaceID,
			"user_id", userID,
			"goal_id", goalID,
		)
		return GoalView{}, ErrGoalNotFound
	}
	return goal, nil
}

func (service *Service) CreateGoal(ctx context.Context, command CreateGoalCommand) (GoalView, error) {
	service.logger.InfoContext(ctx, "creating goal",
		"workspace_id", command.WorkspaceID,
		"user_id", command.UserID,
		"name", command.Name,
	)
	goal, err := service.store.CreateGoal(ctx, CreateGoalRecord{
		WorkspaceID:   command.WorkspaceID,
		UserID:        command.UserID,
		CreatorUserID: command.CreatorUserID,
		Name:          strings.TrimSpace(command.Name),
		Active:        true,
		Billable:      command.Billable,
		Comparison:    strings.TrimSpace(command.Comparison),
		Recurrence:    strings.TrimSpace(command.Recurrence),
		Icon:          strings.TrimSpace(command.Icon),
		TargetSeconds: command.TargetSeconds,
		StartDate:     command.StartDate.UTC(),
		EndDate:       command.EndDate,
		ProjectIDs:    command.ProjectIDs,
		TaskIDs:       command.TaskIDs,
		TagIDs:        command.TagIDs,
	})
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to create goal",
			"workspace_id", command.WorkspaceID,
			"user_id", command.UserID,
			"error", err.Error(),
		)
		return GoalView{}, err
	}
	service.logger.InfoContext(ctx, "goal created",
		"goal_id", goal.ID,
		"workspace_id", command.WorkspaceID,
	)
	return goal, nil
}

func (service *Service) UpdateGoal(ctx context.Context, command UpdateGoalCommand) (GoalView, error) {
	service.logger.InfoContext(ctx, "updating goal",
		"workspace_id", command.WorkspaceID,
		"user_id", command.UserID,
		"goal_id", command.GoalID,
	)
	current, err := service.GetGoal(ctx, command.WorkspaceID, command.UserID, command.GoalID)
	if err != nil {
		return GoalView{}, err
	}
	if command.Active != nil {
		current.Active = *command.Active
	}
	if command.Name != nil {
		current.Name = strings.TrimSpace(*command.Name)
	}
	if command.Comparison != nil {
		current.Comparison = strings.TrimSpace(*command.Comparison)
	}
	if command.Icon != nil {
		current.Icon = strings.TrimSpace(*command.Icon)
	}
	if command.TargetSeconds != nil {
		current.TargetSeconds = *command.TargetSeconds
	}
	if command.EndDate != nil {
		current.EndDate = xptr.CloneUTC(command.EndDate)
	}
	current.UpdatedAt = service.now()

	updated, err := service.store.UpdateGoal(ctx, current)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to update goal",
			"workspace_id", command.WorkspaceID,
			"user_id", command.UserID,
			"goal_id", command.GoalID,
			"error", err.Error(),
		)
		return GoalView{}, err
	}
	service.logger.InfoContext(ctx, "goal updated",
		"goal_id", updated.ID,
		"workspace_id", command.WorkspaceID,
	)
	return updated, nil
}

func (service *Service) DeleteGoal(ctx context.Context, workspaceID int64, userID int64, goalID int64) error {
	service.logger.InfoContext(ctx, "deleting goal",
		"workspace_id", workspaceID,
		"user_id", userID,
		"goal_id", goalID,
	)
	if err := service.store.DeleteGoal(ctx, workspaceID, userID, goalID); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete goal",
			"workspace_id", workspaceID,
			"user_id", userID,
			"goal_id", goalID,
			"error", err.Error(),
		)
		return err
	}
	service.logger.InfoContext(ctx, "goal deleted",
		"workspace_id", workspaceID,
		"user_id", userID,
		"goal_id", goalID,
	)
	return nil
}
