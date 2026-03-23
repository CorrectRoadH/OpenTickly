package application

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"opentoggl/backend/apps/backend/internal/xptr"

	"github.com/samber/lo"
)

type Service struct {
	store   Store
	catalog CatalogQueries
	now     func() time.Time
}

func NewService(store Store, catalog CatalogQueries) (*Service, error) {
	switch {
	case store == nil:
		return nil, ErrStoreRequired
	case catalog == nil:
		return nil, ErrCatalogQueriesRequired
	default:
		return &Service{
			store:   store,
			catalog: catalog,
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

	clientID, err := service.resolveTrackingReferences(ctx, command.WorkspaceID, command.ProjectID, command.TaskID)
	if err != nil {
		return TimeEntryView{}, err
	}

	start, stop, duration, err := normalizeTimeEntryRange(command.Start, command.Stop, command.Duration)
	if err != nil {
		return TimeEntryView{}, err
	}

	if stop == nil {
		if _, ok, err := service.store.GetCurrentTimeEntry(ctx, command.UserID); err != nil {
			return TimeEntryView{}, err
		} else if ok {
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
		return TimeEntryView{}, err
	}

	if stop == nil {
		if err := service.store.SetRunningTimeEntry(ctx, command.UserID, entry.ID); err != nil {
			return TimeEntryView{}, err
		}
	}
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
		return ProjectStatisticsView{}, err
	}
	return service.store.GetProjectStatistics(ctx, workspaceID, projectID)
}

func (service *Service) GetTimeEntry(ctx context.Context, workspaceID int64, userID int64, timeEntryID int64) (TimeEntryView, error) {
	entry, ok, err := service.store.GetTimeEntry(ctx, workspaceID, userID, timeEntryID)
	if err != nil {
		return TimeEntryView{}, err
	}
	if !ok {
		return TimeEntryView{}, ErrTimeEntryNotFound
	}
	return entry, nil
}

func (service *Service) GetUserTimeEntry(ctx context.Context, userID int64, timeEntryID int64) (TimeEntryView, error) {
	entry, ok, err := service.store.GetTimeEntryForUser(ctx, userID, timeEntryID)
	if err != nil {
		return TimeEntryView{}, err
	}
	if !ok {
		return TimeEntryView{}, ErrTimeEntryNotFound
	}
	return entry, nil
}

func (service *Service) GetCurrentTimeEntry(ctx context.Context, userID int64) (TimeEntryView, error) {
	entry, ok, err := service.store.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		return TimeEntryView{}, err
	}
	if !ok {
		return TimeEntryView{}, ErrTimeEntryNotFound
	}
	return entry, nil
}

func (service *Service) UpdateTimeEntry(ctx context.Context, command UpdateTimeEntryCommand) (TimeEntryView, error) {
	current, ok, err := service.store.GetTimeEntry(ctx, command.WorkspaceID, command.UserID, command.TimeEntryID)
	if err != nil {
		return TimeEntryView{}, err
	}
	if !ok {
		return TimeEntryView{}, ErrTimeEntryNotFound
	}

	if command.ProjectID != nil {
		current.ProjectID = command.ProjectID
	}
	if command.TaskID != nil {
		current.TaskID = command.TaskID
	}
	clientID, err := service.resolveTrackingReferences(ctx, command.WorkspaceID, current.ProjectID, current.TaskID)
	if err != nil {
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
	duration := current.Duration
	if command.Start != nil {
		start = command.Start.UTC()
	}
	if command.Stop != nil {
		stop = xptr.CloneUTC(command.Stop)
	}
	if command.Duration != nil {
		duration = *command.Duration
	}

	start, stop, duration, err = normalizeTimeEntryRange(start, stop, &duration)
	if err != nil {
		return TimeEntryView{}, err
	}
	current.Start = start
	current.Stop = stop
	current.Duration = duration
	current.UpdatedAt = service.now()

	updated, err := service.store.UpdateTimeEntry(ctx, UpdateTimeEntryRecord{TimeEntryView: current})
	if err != nil {
		return TimeEntryView{}, err
	}
	if stop == nil {
		if err := service.store.SetRunningTimeEntry(ctx, current.UserID, current.ID); err != nil {
			return TimeEntryView{}, err
		}
	} else {
		if err := service.store.ClearRunningTimeEntry(ctx, current.UserID); err != nil {
			return TimeEntryView{}, err
		}
	}
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
	entry, ok, err := service.store.GetTimeEntry(ctx, workspaceID, userID, timeEntryID)
	if err != nil {
		return err
	}
	if !ok {
		return ErrTimeEntryNotFound
	}
	if err := service.store.DeleteTimeEntry(ctx, workspaceID, userID, timeEntryID); err != nil {
		return err
	}
	if entry.Stop == nil {
		return service.store.ClearRunningTimeEntry(ctx, userID)
	}
	return nil
}

func (service *Service) ListFavorites(ctx context.Context, workspaceID int64, userID int64) ([]FavoriteView, error) {
	return service.store.ListFavorites(ctx, workspaceID, userID)
}

func (service *Service) UpsertFavorite(ctx context.Context, command UpsertFavoriteCommand) (FavoriteView, error) {
	if _, err := service.resolveTrackingReferences(ctx, command.WorkspaceID, command.ProjectID, command.TaskID); err != nil {
		return FavoriteView{}, err
	}

	if command.FavoriteID == nil {
		return service.store.CreateFavorite(ctx, CreateFavoriteRecord{
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
	}

	favorites, err := service.store.ListFavorites(ctx, command.WorkspaceID, command.UserID)
	if err != nil {
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

	return service.store.UpdateFavorite(ctx, UpdateFavoriteRecord{FavoriteView: *current})
}

func (service *Service) DeleteFavorite(ctx context.Context, workspaceID int64, userID int64, favoriteID int64) error {
	if err := service.store.DeleteFavorite(ctx, workspaceID, userID, favoriteID); err != nil {
		return err
	}
	return nil
}

func (service *Service) ListGoals(ctx context.Context, workspaceID int64, filter ListGoalsFilter) ([]GoalView, error) {
	filter.Page = normalizePage(filter.Page, 1)
	filter.PerPage = normalizePage(filter.PerPage, 20)
	return service.store.ListGoals(ctx, workspaceID, filter)
}

func (service *Service) GetGoal(ctx context.Context, workspaceID int64, userID int64, goalID int64) (GoalView, error) {
	goal, ok, err := service.store.GetGoal(ctx, workspaceID, userID, goalID)
	if err != nil {
		return GoalView{}, err
	}
	if !ok {
		return GoalView{}, ErrGoalNotFound
	}
	return goal, nil
}

func (service *Service) CreateGoal(ctx context.Context, command CreateGoalCommand) (GoalView, error) {
	return service.store.CreateGoal(ctx, CreateGoalRecord{
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
}

func (service *Service) UpdateGoal(ctx context.Context, command UpdateGoalCommand) (GoalView, error) {
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

	return service.store.UpdateGoal(ctx, UpdateGoalRecord{GoalView: current})
}

func (service *Service) DeleteGoal(ctx context.Context, workspaceID int64, userID int64, goalID int64) error {
	return service.store.DeleteGoal(ctx, workspaceID, userID, goalID)
}

func (service *Service) ListReminders(ctx context.Context, workspaceID int64) ([]ReminderView, error) {
	return service.store.ListReminders(ctx, workspaceID)
}

func (service *Service) GetReminder(ctx context.Context, workspaceID int64, reminderID int64) (ReminderView, error) {
	reminder, ok, err := service.store.GetReminder(ctx, workspaceID, reminderID)
	if err != nil {
		return ReminderView{}, err
	}
	if !ok {
		return ReminderView{}, ErrReminderNotFound
	}
	return reminder, nil
}

func (service *Service) UpsertReminder(ctx context.Context, command UpsertReminderCommand) (ReminderView, error) {
	if command.ReminderID == nil {
		return service.store.CreateReminder(ctx, CreateReminderRecord{
			WorkspaceID:          command.WorkspaceID,
			Frequency:            command.Frequency,
			ThresholdHours:       command.ThresholdHours,
			EmailReminderEnabled: command.EmailReminderEnabled,
			SlackReminderEnabled: command.SlackReminderEnabled,
			UserIDs:              command.UserIDs,
			GroupIDs:             command.GroupIDs,
		})
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
	return service.store.UpdateReminder(ctx, UpdateReminderRecord{ReminderView: current})
}

func (service *Service) DeleteReminder(ctx context.Context, workspaceID int64, reminderID int64) error {
	return service.store.DeleteReminder(ctx, workspaceID, reminderID)
}

func (service *Service) ListExpenses(ctx context.Context, workspaceID int64, userID int64) ([]ExpenseView, error) {
	return service.store.ListExpenses(ctx, workspaceID, userID)
}

func (service *Service) CreateExpense(ctx context.Context, command CreateExpenseCommand) (ExpenseView, error) {
	return service.store.CreateExpense(ctx, CreateExpenseRecord{
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
}

func (service *Service) ListTimelineEvents(
	ctx context.Context,
	userID int64,
	startTimestamp int,
	endTimestamp int,
) ([]TimelineEventView, error) {
	return service.store.ListTimelineEvents(ctx, userID, startTimestamp, endTimestamp)
}

func (service *Service) ReplaceTimelineEvents(
	ctx context.Context,
	userID int64,
	events []TimelineEventView,
) error {
	for index := range events {
		events[index].UserID = userID
	}
	return service.store.ReplaceTimelineEvents(ctx, userID, events)
}

func (service *Service) DeleteTimelineEvents(ctx context.Context, userID int64) error {
	return service.store.DeleteTimelineEvents(ctx, userID)
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
