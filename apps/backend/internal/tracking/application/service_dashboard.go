package application

import (
	"context"
	"slices"
	"time"
)

func (service *Service) ListWorkspaceTimeEntries(
	ctx context.Context,
	workspaceID int64,
	since *time.Time,
) ([]TimeEntryView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	return service.store.ListWorkspaceTimeEntries(ctx, workspaceID, since)
}

func (service *Service) ListWorkspaceDashboardActivities(
	ctx context.Context,
	workspaceID int64,
	since *time.Time,
) ([]DashboardActivityView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	entries, err := service.store.ListWorkspaceTimeEntries(ctx, workspaceID, since)
	if err != nil {
		return nil, err
	}
	activities := make([]DashboardActivityView, 0, len(entries))
	for _, entry := range entries {
		activities = append(activities, DashboardActivityView{
			ID:          entry.ID,
			UserID:      entry.UserID,
			ProjectID:   entry.ProjectID,
			Description: entry.Description,
			Duration:    entry.Duration,
			Stop:        entry.Stop,
		})
	}
	slices.SortFunc(activities, func(left DashboardActivityView, right DashboardActivityView) int {
		return compareDashboardActivityRecency(left, right)
	})
	return activities, nil
}

func (service *Service) ListWorkspaceTopActivities(
	ctx context.Context,
	workspaceID int64,
	since *time.Time,
) ([]DashboardActivityView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	entries, err := service.store.ListWorkspaceTimeEntries(ctx, workspaceID, since)
	if err != nil {
		return nil, err
	}
	activities := make([]DashboardActivityView, 0, len(entries))
	for _, entry := range entries {
		activities = append(activities, DashboardActivityView{
			ID:          entry.ID,
			UserID:      entry.UserID,
			ProjectID:   entry.ProjectID,
			Description: entry.Description,
			Duration:    entry.Duration,
			Stop:        entry.Stop,
		})
	}
	slices.SortFunc(activities, func(left DashboardActivityView, right DashboardActivityView) int {
		switch {
		case left.Duration != right.Duration:
			if left.Duration > right.Duration {
				return -1
			}
			return 1
		default:
			return compareDashboardActivityRecency(left, right)
		}
	})
	return activities, nil
}

func (service *Service) ListWorkspaceMostActiveUsers(
	ctx context.Context,
	workspaceID int64,
	since *time.Time,
) ([]MostActiveUserView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	if since == nil {
		defaultSince := service.now().Add(-7 * 24 * time.Hour)
		since = &defaultSince
	}
	entries, err := service.store.ListWorkspaceTimeEntries(ctx, workspaceID, since)
	if err != nil {
		return nil, err
	}

	nowEpoch := int(service.now().Unix())
	durationByUser := make(map[int64]int)
	for _, entry := range entries {
		d := entry.Duration
		if d < 0 {
			d = max(0, nowEpoch+d)
		}
		durationByUser[entry.UserID] += d
	}
	users := make([]MostActiveUserView, 0, len(durationByUser))
	for userID, duration := range durationByUser {
		users = append(users, MostActiveUserView{
			UserID:   userID,
			Duration: duration,
		})
	}
	slices.SortFunc(users, func(left MostActiveUserView, right MostActiveUserView) int {
		switch {
		case left.Duration != right.Duration:
			if left.Duration > right.Duration {
				return -1
			}
			return 1
		case left.UserID < right.UserID:
			return -1
		case left.UserID > right.UserID:
			return 1
		default:
			return 0
		}
	})
	if len(users) > 5 {
		users = users[:5]
	}
	return users, nil
}

func (service *Service) GetProjectStatistics(
	ctx context.Context,
	workspaceID int64,
	projectID int64,
) (ProjectStatisticsView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return ProjectStatisticsView{}, err
	}
	if _, err := service.catalog.GetProject(ctx, workspaceID, projectID); err != nil {
		service.logger.WarnContext(ctx, "project not found for statistics",
			"workspace_id", workspaceID,
			"project_id", projectID,
			"error", err.Error(),
		)
		return ProjectStatisticsView{}, err
	}
	stats, err := service.store.GetProjectStatistics(ctx, workspaceID, projectID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get project statistics",
			"workspace_id", workspaceID,
			"project_id", projectID,
			"error", err.Error(),
		)
		return ProjectStatisticsView{}, err
	}
	return stats, nil
}
