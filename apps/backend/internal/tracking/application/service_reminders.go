package application

import "context"

func (service *Service) ListReminders(ctx context.Context, workspaceID int64) ([]ReminderView, error) {
	reminders, err := service.store.ListReminders(ctx, workspaceID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to list reminders",
			"workspace_id", workspaceID,
			"error", err.Error(),
		)
		return nil, err
	}
	return reminders, nil
}

func (service *Service) GetReminder(ctx context.Context, workspaceID int64, reminderID int64) (ReminderView, error) {
	reminder, ok, err := service.store.GetReminder(ctx, workspaceID, reminderID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get reminder",
			"workspace_id", workspaceID,
			"reminder_id", reminderID,
			"error", err.Error(),
		)
		return ReminderView{}, err
	}
	if !ok {
		service.logger.WarnContext(ctx, "reminder not found",
			"workspace_id", workspaceID,
			"reminder_id", reminderID,
		)
		return ReminderView{}, ErrReminderNotFound
	}
	return reminder, nil
}

func (service *Service) UpsertReminder(ctx context.Context, command UpsertReminderCommand) (ReminderView, error) {
	service.logger.InfoContext(ctx, "upserting reminder",
		"workspace_id", command.WorkspaceID,
		"reminder_id", command.ReminderID,
	)
	if command.ReminderID == nil {
		reminder, err := service.store.CreateReminder(ctx, CreateReminderRecord{
			WorkspaceID:          command.WorkspaceID,
			Frequency:            command.Frequency,
			ThresholdHours:       command.ThresholdHours,
			EmailReminderEnabled: command.EmailReminderEnabled,
			SlackReminderEnabled: command.SlackReminderEnabled,
			UserIDs:              command.UserIDs,
			GroupIDs:             command.GroupIDs,
		})
		if err != nil {
			service.logger.ErrorContext(ctx, "failed to create reminder",
				"workspace_id", command.WorkspaceID,
				"error", err.Error(),
			)
			return ReminderView{}, err
		}
		service.logger.InfoContext(ctx, "reminder created",
			"reminder_id", reminder.ID,
		)
		return reminder, nil
	}

	current, err := service.GetReminder(ctx, command.WorkspaceID, *command.ReminderID)
	if err != nil {
		return ReminderView{}, err
	}
	current.Frequency = command.Frequency
	current.ThresholdHours = command.ThresholdHours
	current.EmailReminderEnabled = command.EmailReminderEnabled
	current.SlackReminderEnabled = command.SlackReminderEnabled
	current.UserIDs = append([]int64(nil), command.UserIDs...)
	current.GroupIDs = append([]int64(nil), command.GroupIDs...)
	current.UpdatedAt = service.now()
	updated, err := service.store.UpdateReminder(ctx, current)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to update reminder",
			"workspace_id", command.WorkspaceID,
			"reminder_id", *command.ReminderID,
			"error", err.Error(),
		)
		return ReminderView{}, err
	}
	service.logger.InfoContext(ctx, "reminder updated",
		"reminder_id", updated.ID,
	)
	return updated, nil
}

func (service *Service) DeleteReminder(ctx context.Context, workspaceID int64, reminderID int64) error {
	service.logger.InfoContext(ctx, "deleting reminder",
		"workspace_id", workspaceID,
		"reminder_id", reminderID,
	)
	if err := service.store.DeleteReminder(ctx, workspaceID, reminderID); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete reminder",
			"workspace_id", workspaceID,
			"reminder_id", reminderID,
			"error", err.Error(),
		)
		return err
	}
	service.logger.InfoContext(ctx, "reminder deleted",
		"workspace_id", workspaceID,
		"reminder_id", reminderID,
	)
	return nil
}
