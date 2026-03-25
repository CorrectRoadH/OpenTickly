package application

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"opentoggl/backend/apps/backend/internal/log"
	"opentoggl/backend/apps/backend/internal/xptr"

	"github.com/samber/lo"
)

type Service struct {
	store   Store
	catalog CatalogQueries
	logger  log.Logger
	now     func() time.Time
}

// contextKeyAuthenticatedUserID is the context key for storing the authenticated user ID.
// The HTTP transport layer sets this value in context before calling service methods.
// Service methods use this to validate authorization.
type contextKeyAuthenticatedUserID struct{}

var authenticatedUserIDKey = contextKeyAuthenticatedUserID{}

// WithAuthenticatedUserID returns a new context with the authenticated user ID set.
// This should be called by the HTTP transport layer before invoking service methods.
func WithAuthenticatedUserID(ctx context.Context, userID int64) context.Context {
	return context.WithValue(ctx, authenticatedUserIDKey, userID)
}

// getAuthenticatedUserID extracts the authenticated user ID from context, if set.
// Returns (userID, true) if set, or (0, false) if not set.
func getAuthenticatedUserID(ctx context.Context) (int64, bool) {
	if userID, ok := ctx.Value(authenticatedUserIDKey).(int64); ok {
		return userID, true
	}
	return 0, false
}

func NewService(store Store, catalog CatalogQueries, logger log.Logger) (*Service, error) {
	switch {
	case store == nil:
		return nil, ErrStoreRequired
	case catalog == nil:
		return nil, ErrCatalogQueriesRequired
	case logger == nil:
		return nil, fmt.Errorf("logger is required")
	default:
		return &Service{
			store:   store,
			catalog: catalog,
			logger:  logger,
			now: func() time.Time {
				return time.Now().UTC()
			},
		}, nil
	}
}

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
		if _, ok, err := service.store.GetCurrentTimeEntry(ctx, command.UserID); err != nil {
			return TimeEntryView{}, err
		} else if ok {
			service.logger.WarnContext(ctx, "running time entry already exists",
				"user_id", command.UserID,
			)
			return TimeEntryView{}, ErrRunningTimeEntryExists
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

	durationByUser := make(map[int64]int)
	for _, entry := range entries {
		durationByUser[entry.UserID] += entry.Duration
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

	updated, err := service.store.UpdateTimeEntry(ctx, UpdateTimeEntryRecord{TimeEntryView: current})
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

func (service *Service) ListFavorites(ctx context.Context, workspaceID int64, userID int64) ([]FavoriteView, error) {
	favorites, err := service.store.ListFavorites(ctx, workspaceID, userID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to list favorites",
			"workspace_id", workspaceID,
			"user_id", userID,
			"error", err.Error(),
		)
		return nil, err
	}
	return favorites, nil
}

func (service *Service) UpsertFavorite(ctx context.Context, command UpsertFavoriteCommand) (FavoriteView, error) {
	service.logger.InfoContext(ctx, "upserting favorite",
		"workspace_id", command.WorkspaceID,
		"user_id", command.UserID,
		"favorite_id", command.FavoriteID,
		"project_id", command.ProjectID,
	)

	if _, err := service.resolveTrackingReferences(ctx, command.WorkspaceID, command.ProjectID, command.TaskID); err != nil {
		service.logger.WarnContext(ctx, "failed to resolve tracking references for favorite",
			"workspace_id", command.WorkspaceID,
			"project_id", command.ProjectID,
			"task_id", command.TaskID,
			"error", err.Error(),
		)
		return FavoriteView{}, err
	}

	if command.FavoriteID == nil {
		favorite, err := service.store.CreateFavorite(ctx, CreateFavoriteRecord{
			WorkspaceID: command.WorkspaceID,
			UserID:      command.UserID,
			ProjectID:   command.ProjectID,
			TaskID:      command.TaskID,
			Description: valueOrEmpty(command.Description),
			Billable:    lo.FromPtr(command.Billable),
			Public:      lo.FromPtr(command.Public),
			Rank:        lo.FromPtr(command.Rank),
			TagIDs:      command.TagIDs,
		})
		if err != nil {
			service.logger.ErrorContext(ctx, "failed to create favorite",
				"workspace_id", command.WorkspaceID,
				"user_id", command.UserID,
				"error", err.Error(),
			)
			return FavoriteView{}, err
		}
		service.logger.InfoContext(ctx, "favorite created",
			"favorite_id", favorite.ID,
		)
		return favorite, nil
	}

	favorites, err := service.store.ListFavorites(ctx, command.WorkspaceID, command.UserID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to list favorites for update",
			"workspace_id", command.WorkspaceID,
			"user_id", command.UserID,
			"error", err.Error(),
		)
		return FavoriteView{}, err
	}
	var current *FavoriteView
	for index := range favorites {
		if favorites[index].ID == *command.FavoriteID {
			current = &favorites[index]
			break
		}
	}
	if current == nil {
		service.logger.WarnContext(ctx, "favorite not found for update",
			"workspace_id", command.WorkspaceID,
			"user_id", command.UserID,
			"favorite_id", *command.FavoriteID,
		)
		return FavoriteView{}, ErrFavoriteNotFound
	}

	if command.Description != nil {
		current.Description = strings.TrimSpace(*command.Description)
	}
	if command.Billable != nil {
		current.Billable = *command.Billable
	}
	if command.Public != nil {
		current.Public = *command.Public
	}
	if command.Rank != nil {
		current.Rank = *command.Rank
	}
	if command.ProjectID != nil {
		current.ProjectID = command.ProjectID
	}
	if command.TaskID != nil {
		current.TaskID = command.TaskID
	}
	if command.ReplaceTags {
		current.TagIDs = append([]int64(nil), command.TagIDs...)
	}
	current.UpdatedAt = service.now()

	updated, err := service.store.UpdateFavorite(ctx, UpdateFavoriteRecord{FavoriteView: *current})
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to update favorite",
			"workspace_id", command.WorkspaceID,
			"user_id", command.UserID,
			"favorite_id", *command.FavoriteID,
			"error", err.Error(),
		)
		return FavoriteView{}, err
	}
	service.logger.InfoContext(ctx, "favorite updated",
		"favorite_id", updated.ID,
	)
	return updated, nil
}

func (service *Service) DeleteFavorite(ctx context.Context, workspaceID int64, userID int64, favoriteID int64) error {
	service.logger.InfoContext(ctx, "deleting favorite",
		"workspace_id", workspaceID,
		"user_id", userID,
		"favorite_id", favoriteID,
	)
	if err := service.store.DeleteFavorite(ctx, workspaceID, userID, favoriteID); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete favorite",
			"workspace_id", workspaceID,
			"user_id", userID,
			"favorite_id", favoriteID,
			"error", err.Error(),
		)
		return err
	}
	service.logger.InfoContext(ctx, "favorite deleted",
		"workspace_id", workspaceID,
		"user_id", userID,
		"favorite_id", favoriteID,
	)
	return nil
}

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

	updated, err := service.store.UpdateGoal(ctx, UpdateGoalRecord{GoalView: current})
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
	updated, err := service.store.UpdateReminder(ctx, UpdateReminderRecord{ReminderView: current})
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

func (service *Service) ListExpenses(ctx context.Context, workspaceID int64, userID int64) ([]ExpenseView, error) {
	expenses, err := service.store.ListExpenses(ctx, workspaceID, userID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to list expenses",
			"workspace_id", workspaceID,
			"user_id", userID,
			"error", err.Error(),
		)
		return nil, err
	}
	return expenses, nil
}

func (service *Service) CreateExpense(ctx context.Context, command CreateExpenseCommand) (ExpenseView, error) {
	service.logger.InfoContext(ctx, "creating expense",
		"workspace_id", command.WorkspaceID,
		"user_id", command.UserID,
		"description", command.Description,
	)
	expense, err := service.store.CreateExpense(ctx, CreateExpenseRecord{
		WorkspaceID:   command.WorkspaceID,
		UserID:        command.UserID,
		TimeEntryID:   command.TimeEntryID,
		Description:   strings.TrimSpace(command.Description),
		Category:      strings.TrimSpace(command.Category),
		State:         strings.TrimSpace(command.State),
		Currency:      strings.TrimSpace(command.Currency),
		TotalAmount:   command.TotalAmount,
		DateOfExpense: command.DateOfExpense,
	})
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to create expense",
			"workspace_id", command.WorkspaceID,
			"user_id", command.UserID,
			"error", err.Error(),
		)
		return ExpenseView{}, err
	}
	service.logger.InfoContext(ctx, "expense created",
		"expense_id", expense.ID,
	)
	return expense, nil
}

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

func (service *Service) resolveTrackingReferences(
	ctx context.Context,
	workspaceID int64,
	projectID *int64,
	taskID *int64,
) (*int64, error) {
	if taskID != nil && projectID == nil {
		return nil, fmt.Errorf("%w: task requires project", ErrInvalidTimeRange)
	}

	if projectID == nil {
		return nil, nil
	}

	project, err := service.catalog.GetProject(ctx, workspaceID, *projectID)
	if err != nil {
		return nil, err
	}
	if taskID != nil {
		if _, err := service.catalog.GetTask(ctx, workspaceID, *projectID, *taskID); err != nil {
			return nil, err
		}
	}
	return project.ClientID, nil
}

func requireWorkspaceID(workspaceID int64) error {
	if workspaceID <= 0 {
		return ErrInvalidWorkspace
	}
	return nil
}

func normalizeTimeEntryRange(start time.Time, stop *time.Time, duration *int) (time.Time, *time.Time, int, error) {
	start = start.UTC()

	switch {
	case stop != nil && duration != nil:
		normalizedStop := stop.UTC()
		expected := int(normalizedStop.Sub(start).Seconds())
		if expected != *duration {
			return time.Time{}, nil, 0, ErrInvalidTimeRange
		}
		if normalizedStop.Before(start) {
			return time.Time{}, nil, 0, ErrInvalidTimeRange
		}
		return start, &normalizedStop, *duration, nil
	case stop != nil:
		normalizedStop := stop.UTC()
		if normalizedStop.Before(start) {
			return time.Time{}, nil, 0, ErrInvalidTimeRange
		}
		return start, &normalizedStop, int(normalizedStop.Sub(start).Seconds()), nil
	case duration != nil && *duration >= 0:
		normalizedStop := start.Add(time.Duration(*duration) * time.Second)
		return start, &normalizedStop, *duration, nil
	default:
		runningDuration := -1
		if duration != nil {
			runningDuration = *duration
		}
		return start, nil, runningDuration, nil
	}
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func normalizePage(value int, fallback int) int {
	if value <= 0 {
		return fallback
	}
	return value
}

func compareDashboardActivityRecency(left DashboardActivityView, right DashboardActivityView) int {
	leftAt := dashboardActivityTimestamp(left)
	rightAt := dashboardActivityTimestamp(right)
	switch {
	case leftAt.After(rightAt):
		return -1
	case leftAt.Before(rightAt):
		return 1
	case left.ID > right.ID:
		return -1
	case left.ID < right.ID:
		return 1
	default:
		return 0
	}
}

func dashboardActivityTimestamp(activity DashboardActivityView) time.Time {
	if activity.Stop != nil {
		return activity.Stop.UTC()
	}
	return time.Unix(0, 0).UTC()
}

func IsNotFound(err error) bool {
	return errors.Is(err, ErrTimeEntryNotFound) ||
		errors.Is(err, ErrFavoriteNotFound) ||
		errors.Is(err, ErrGoalNotFound) ||
		errors.Is(err, ErrReminderNotFound) ||
		errors.Is(err, ErrExpenseNotFound)
}
