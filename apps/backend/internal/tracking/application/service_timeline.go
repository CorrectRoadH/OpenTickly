package application

import "context"

func (service *Service) ListTimelineEvents(
	ctx context.Context,
	userID int64,
	startTimestamp int,
	endTimestamp int,
) ([]TimelineEventView, error) {
	events, err := service.store.ListTimelineEvents(ctx, userID, startTimestamp, endTimestamp)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to list timeline events",
			"user_id", userID,
			"error", err.Error(),
		)
		return nil, err
	}
	return events, nil
}

func (service *Service) ReplaceTimelineEvents(
	ctx context.Context,
	userID int64,
	events []TimelineEventView,
) error {
	service.logger.InfoContext(ctx, "replacing timeline events",
		"user_id", userID,
		"event_count", len(events),
	)
	for index := range events {
		events[index].UserID = userID
	}
	if err := service.store.ReplaceTimelineEvents(ctx, userID, events); err != nil {
		service.logger.ErrorContext(ctx, "failed to replace timeline events",
			"user_id", userID,
			"error", err.Error(),
		)
		return err
	}
	return nil
}

func (service *Service) DeleteTimelineEvents(ctx context.Context, userID int64) error {
	service.logger.InfoContext(ctx, "deleting timeline events",
		"user_id", userID,
	)
	if err := service.store.DeleteTimelineEvents(ctx, userID); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete timeline events",
			"user_id", userID,
			"error", err.Error(),
		)
		return err
	}
	return nil
}
