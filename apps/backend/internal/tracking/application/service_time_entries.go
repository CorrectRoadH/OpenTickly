package application

import (
	"context"
	"strings"

	"github.com/samber/lo"
)

func (service *Service) CreateTimeEntry(ctx context.Context, command CreateTimeEntryCommand) (TimeEntryView, error) {
	if err := requireWorkspaceID(command.WorkspaceID); err != nil {
		return TimeEntryView{}, err
	}

	// Security: Validate that the caller is authorized to create entries for this UserID.
	// The authenticated user ID should be set in context by the HTTP transport layer.
	// If set, enforce that command.UserID matches the authenticated caller.
	if authenticatedUserID, ok := getAuthenticatedUserID(ctx); ok {
		if command.UserID != authenticatedUserID {
			service.logger.WarnContext(ctx, "create time entry denied: caller user_id mismatch",
				"command_user_id", command.UserID,
				"authenticated_user_id", authenticatedUserID,
			)
			return TimeEntryView{}, ErrTimeEntryNotFound
		}
	}

	// Enforce required time entry fields from workspace settings.
	settings, err := service.getWorkspaceSettings(ctx, command.WorkspaceID)
	if err != nil {
		return TimeEntryView{}, err
	}
	for _, field := range settings.RequiredTimeEntryFields() {
		switch field {
		case "project":
			if command.ProjectID == nil {
				return TimeEntryView{}, ErrRequiredFieldMissing
			}
		case "task":
			if command.TaskID == nil {
				return TimeEntryView{}, ErrRequiredFieldMissing
			}
		case "description":
			if strings.TrimSpace(command.Description) == "" {
				return TimeEntryView{}, ErrRequiredFieldMissing
			}
		case "tag":
			if len(command.TagIDs) == 0 {
				return TimeEntryView{}, ErrRequiredFieldMissing
			}
		}
	}

	service.logger.InfoContext(ctx, "creating time entry",
		"user_id", command.UserID,
		"workspace_id", command.WorkspaceID,
		"project_id", command.ProjectID,
		"task_id", command.TaskID,
		"description", command.Description,
		"billable", command.Billable,
	)

	clientID, err := service.resolveTrackingReferences(ctx, command.WorkspaceID, command.ProjectID, command.TaskID)
	if err != nil {
		service.logger.WarnContext(ctx, "failed to resolve tracking references",
			"workspace_id", command.WorkspaceID,
			"project_id", command.ProjectID,
			"task_id", command.TaskID,
			"error", err.Error(),
		)
		return TimeEntryView{}, err
	}

	start, stop, duration, err := normalizeTimeEntryRange(command.Start, command.Stop, command.Duration)
	if err != nil {
		service.logger.WarnContext(ctx, "invalid time entry range",
			"workspace_id", command.WorkspaceID,
			"error", err.Error(),
		)
		return TimeEntryView{}, err
	}

	if stop == nil {
		if existing, ok, err := service.store.GetCurrentTimeEntry(ctx, command.UserID); err != nil {
			return TimeEntryView{}, err
		} else if ok {
			service.logger.InfoContext(ctx, "auto-stopping existing running time entry",
				"user_id", command.UserID,
				"existing_entry_id", existing.ID,
			)
			stopTime := start
			if _, err := service.UpdateTimeEntry(ctx, UpdateTimeEntryCommand{
				WorkspaceID: existing.WorkspaceID,
				TimeEntryID: existing.ID,
				UserID:      command.UserID,
				Stop:        &stopTime,
				Duration:    lo.ToPtr(int(stopTime.Sub(existing.Start).Seconds())),
			}); err != nil {
				service.logger.ErrorContext(ctx, "failed to auto-stop existing running time entry",
					"user_id", command.UserID,
					"existing_entry_id", existing.ID,
					"error", err.Error(),
				)
				return TimeEntryView{}, err
			}
		}
	}

	entry, err := service.store.CreateTimeEntry(ctx, CreateTimeEntryRecord{
		WorkspaceID: command.WorkspaceID,
		UserID:      command.UserID,
		ClientID:    clientID,
		ProjectID:   command.ProjectID,
		TaskID:      command.TaskID,
		Description: strings.TrimSpace(command.Description),
		Billable:    command.Billable,
		Start:       start,
		Stop:        stop,
		Duration:    duration,
		CreatedWith: strings.TrimSpace(command.CreatedWith),
		TagIDs:      command.TagIDs,
		ExpenseIDs:  nil,
	})
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to create time entry",
			"user_id", command.UserID,
			"workspace_id", command.WorkspaceID,
			"error", err.Error(),
		)
		return TimeEntryView{}, err
	}

	if stop == nil {
		if err := service.store.SetRunningTimeEntry(ctx, command.UserID, entry.ID); err != nil {
			service.logger.ErrorContext(ctx, "failed to set running time entry",
				"user_id", command.UserID,
				"entry_id", entry.ID,
				"error", err.Error(),
			)
			return TimeEntryView{}, err
		}
	}

	service.logger.InfoContext(ctx, "time entry created",
		"entry_id", entry.ID,
		"user_id", command.UserID,
		"workspace_id", command.WorkspaceID,
		"duration_seconds", duration,
		"is_running", stop == nil,
	)
	return entry, nil
}

func (service *Service) ListTimeEntries(ctx context.Context, workspaceID int64, filter ListTimeEntriesFilter) ([]TimeEntryView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	return service.store.ListTimeEntries(ctx, workspaceID, filter)
}

func (service *Service) ListUserTimeEntries(ctx context.Context, filter ListTimeEntriesFilter) ([]TimeEntryView, error) {
	return service.store.ListTimeEntriesForUser(ctx, filter)
}

func (service *Service) SearchTimeEntries(ctx context.Context, workspaceID int64, userID int64, query string) ([]TimeEntrySearchView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	return service.store.SearchTimeEntries(ctx, workspaceID, userID, query)
}

func (service *Service) ListRecentTimeEntrySuggestions(ctx context.Context, workspaceID int64, userID int64, limit int) ([]TimeEntrySearchView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 8
	}
	return service.store.ListRecentTimeEntrySuggestions(ctx, workspaceID, userID, limit)
}

func (service *Service) GetTimeEntry(ctx context.Context, workspaceID int64, userID int64, timeEntryID int64) (TimeEntryView, error) {
	entry, ok, err := service.store.GetTimeEntry(ctx, workspaceID, userID, timeEntryID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get time entry",
			"workspace_id", workspaceID,
			"user_id", userID,
			"entry_id", timeEntryID,
			"error", err.Error(),
		)
		return TimeEntryView{}, err
	}
	if !ok {
		service.logger.WarnContext(ctx, "time entry not found",
			"workspace_id", workspaceID,
			"user_id", userID,
			"entry_id", timeEntryID,
		)
		return TimeEntryView{}, ErrTimeEntryNotFound
	}
	return entry, nil
}

func (service *Service) GetUserTimeEntry(ctx context.Context, userID int64, timeEntryID int64) (TimeEntryView, error) {
	entry, ok, err := service.store.GetTimeEntryForUser(ctx, userID, timeEntryID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get user time entry",
			"user_id", userID,
			"entry_id", timeEntryID,
			"error", err.Error(),
		)
		return TimeEntryView{}, err
	}
	if !ok {
		service.logger.WarnContext(ctx, "user time entry not found",
			"user_id", userID,
			"entry_id", timeEntryID,
		)
		return TimeEntryView{}, ErrTimeEntryNotFound
	}
	return entry, nil
}

func (service *Service) GetCurrentTimeEntry(ctx context.Context, userID int64) (TimeEntryView, error) {
	entry, ok, err := service.store.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get current time entry",
			"user_id", userID,
			"error", err.Error(),
		)
		return TimeEntryView{}, err
	}
	if !ok {
		return TimeEntryView{}, nil
	}
	return entry, nil
}
