package application

import (
	"context"
	"strings"

	"opentoggl/backend/apps/backend/internal/xptr"

	"github.com/samber/lo"
)

func (service *Service) UpdateTimeEntry(ctx context.Context, command UpdateTimeEntryCommand) (TimeEntryView, error) {
	service.logger.InfoContext(ctx, "updating time entry",
		"workspace_id", command.WorkspaceID,
		"user_id", command.UserID,
		"entry_id", command.TimeEntryID,
	)

	current, ok, err := service.store.GetTimeEntry(ctx, command.WorkspaceID, command.UserID, command.TimeEntryID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get time entry for update",
			"workspace_id", command.WorkspaceID,
			"user_id", command.UserID,
			"entry_id", command.TimeEntryID,
			"error", err.Error(),
		)
		return TimeEntryView{}, err
	}
	if !ok {
		service.logger.WarnContext(ctx, "time entry not found for update",
			"workspace_id", command.WorkspaceID,
			"user_id", command.UserID,
			"entry_id", command.TimeEntryID,
		)
		return TimeEntryView{}, ErrTimeEntryNotFound
	}

	if command.ProjectID != nil {
		if *command.ProjectID == 0 {
			current.ProjectID = nil
		} else {
			current.ProjectID = command.ProjectID
		}
	}
	if command.TaskID != nil {
		current.TaskID = command.TaskID
	}
	clientID, err := service.resolveTrackingReferences(ctx, command.WorkspaceID, current.ProjectID, current.TaskID)
	if err != nil {
		service.logger.WarnContext(ctx, "failed to resolve tracking references on update",
			"workspace_id", command.WorkspaceID,
			"error", err.Error(),
		)
		return TimeEntryView{}, err
	}
	current.ClientID = clientID

	if command.Description != nil {
		current.Description = strings.TrimSpace(*command.Description)
	}
	if command.Billable != nil {
		current.Billable = *command.Billable
	}
	if command.ReplaceTags {
		current.TagIDs = append([]int64(nil), command.TagIDs...)
	}

	start := current.Start
	stop := current.Stop
	var duration *int
	if command.Start != nil {
		start = command.Start.UTC()
	}
	if command.Stop != nil {
		stop = xptr.CloneUTC(command.Stop)
	}
	if command.Duration != nil {
		duration = command.Duration
	} else if command.Start == nil && command.Stop == nil {
		duration = lo.ToPtr(current.Duration)
	}

	start, stop, computedDuration, err := normalizeTimeEntryRange(start, stop, duration)
	if err != nil {
		service.logger.WarnContext(ctx, "invalid time entry range on update",
			"workspace_id", command.WorkspaceID,
			"entry_id", command.TimeEntryID,
			"error", err.Error(),
		)
		return TimeEntryView{}, err
	}
	current.Start = start
	current.Stop = stop
	current.Duration = computedDuration
	current.UpdatedAt = service.now()

	// Check for running timer conflict BEFORE persisting when the result is a running entry.
	// This matches CreateTimeEntry's pre-mutation conflict check and prevents partial mutations.
	if stop == nil {
		existing, ok, err := service.store.GetCurrentTimeEntry(ctx, current.UserID)
		if err != nil {
			return TimeEntryView{}, err
		}
		if ok && existing.ID != current.ID {
			service.logger.WarnContext(ctx, "running time entry already exists",
				"user_id", current.UserID,
			)
			return TimeEntryView{}, ErrRunningTimeEntryExists
		}
	}

	updated, err := service.store.UpdateTimeEntry(ctx, current)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to update time entry",
			"workspace_id", command.WorkspaceID,
			"user_id", command.UserID,
			"entry_id", command.TimeEntryID,
			"error", err.Error(),
		)
		return TimeEntryView{}, err
	}
	if stop == nil {
		if err := service.store.SetRunningTimeEntry(ctx, current.UserID, current.ID); err != nil {
			service.logger.ErrorContext(ctx, "failed to set running time entry after update",
				"user_id", current.UserID,
				"entry_id", current.ID,
				"error", err.Error(),
			)
			return TimeEntryView{}, err
		}
	} else {
		if err := service.store.ClearRunningTimeEntry(ctx, current.UserID); err != nil {
			service.logger.ErrorContext(ctx, "failed to clear running time entry after update",
				"user_id", current.UserID,
				"entry_id", current.ID,
				"error", err.Error(),
			)
			return TimeEntryView{}, err
		}
	}

	service.logger.InfoContext(ctx, "time entry updated",
		"entry_id", updated.ID,
		"workspace_id", command.WorkspaceID,
		"user_id", command.UserID,
		"duration_seconds", computedDuration,
	)
	return updated, nil
}

func (service *Service) PatchTimeEntries(
	ctx context.Context,
	workspaceID int64,
	userID int64,
	timeEntryIDs []int64,
	patches []TimeEntryPatch,
) ([]int64, error) {
	success := make([]int64, 0, len(timeEntryIDs))
	for _, timeEntryID := range timeEntryIDs {
		update := UpdateTimeEntryCommand{
			WorkspaceID: workspaceID,
			TimeEntryID: timeEntryID,
			UserID:      userID,
		}
		for _, patch := range patches {
			if !strings.EqualFold(strings.TrimSpace(patch.Op), "replace") {
				continue
			}
			switch strings.TrimSpace(patch.Path) {
			case "/description":
				value, _ := patch.Value.(string)
				update.Description = &value
			case "/billable":
				value, _ := patch.Value.(bool)
				update.Billable = &value
			}
		}
		if _, err := service.UpdateTimeEntry(ctx, update); err != nil {
			return nil, err
		}
		success = append(success, timeEntryID)
	}
	return success, nil
}

func (service *Service) StopTimeEntry(ctx context.Context, workspaceID int64, userID int64, timeEntryID int64) (TimeEntryView, error) {
	current, err := service.GetTimeEntry(ctx, workspaceID, userID, timeEntryID)
	if err != nil {
		return TimeEntryView{}, err
	}
	stop := service.now()
	return service.UpdateTimeEntry(ctx, UpdateTimeEntryCommand{
		WorkspaceID: workspaceID,
		TimeEntryID: timeEntryID,
		UserID:      userID,
		Stop:        &stop,
		Duration:    lo.ToPtr(int(stop.Sub(current.Start).Seconds())),
	})
}

func (service *Service) DeleteTimeEntry(ctx context.Context, workspaceID int64, userID int64, timeEntryID int64) error {
	service.logger.InfoContext(ctx, "deleting time entry",
		"workspace_id", workspaceID,
		"user_id", userID,
		"entry_id", timeEntryID,
	)

	entry, ok, err := service.store.GetTimeEntry(ctx, workspaceID, userID, timeEntryID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get time entry for deletion",
			"workspace_id", workspaceID,
			"user_id", userID,
			"entry_id", timeEntryID,
			"error", err.Error(),
		)
		return err
	}
	if !ok {
		service.logger.WarnContext(ctx, "time entry not found for deletion",
			"workspace_id", workspaceID,
			"user_id", userID,
			"entry_id", timeEntryID,
		)
		return ErrTimeEntryNotFound
	}
	if err := service.store.DeleteTimeEntry(ctx, workspaceID, userID, timeEntryID); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete time entry",
			"workspace_id", workspaceID,
			"user_id", userID,
			"entry_id", timeEntryID,
			"error", err.Error(),
		)
		return err
	}
	if entry.Stop == nil {
		if err := service.store.ClearRunningTimeEntry(ctx, userID); err != nil {
			service.logger.ErrorContext(ctx, "failed to clear running time entry after deletion",
				"user_id", userID,
				"entry_id", timeEntryID,
				"error", err.Error(),
			)
			return err
		}
	}

	service.logger.InfoContext(ctx, "time entry deleted",
		"workspace_id", workspaceID,
		"user_id", userID,
		"entry_id", timeEntryID,
	)
	return nil
}
