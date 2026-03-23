package application

import (
	"context"
	"time"
)

func (service *Service) GetProjectRecurringPeriod(
	ctx context.Context,
	workspaceID int64,
	projectID int64,
	startDate *time.Time,
	endDate *time.Time,
) (*RecurringPeriodView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}

	project, err := service.GetProject(ctx, workspaceID, projectID)
	if err != nil {
		return nil, err
	}
	if !project.Recurring || project.PeriodStart == nil || project.PeriodEnd == nil {
		return nil, nil
	}
	if startDate != nil && project.PeriodEnd.Before(*startDate) {
		return nil, nil
	}
	if endDate != nil && project.PeriodStart.After(*endDate) {
		return nil, nil
	}

	return &RecurringPeriodView{
		StartDate: *project.PeriodStart,
		EndDate:   *project.PeriodEnd,
	}, nil
}
