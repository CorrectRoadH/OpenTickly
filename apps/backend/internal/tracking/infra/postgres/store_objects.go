package postgres

import (
	"context"
	"strings"

	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"
)

func (store *Store) ListFavorites(ctx context.Context, workspaceID int64, userID int64) ([]trackingapplication.FavoriteView, error) {
	rows, err := store.pool.Query(
		ctx,
		`select id, workspace_id, user_id, project_id, task_id, description, billable, public, rank,
			tag_ids, deleted_at, created_at, updated_at
		from tracking_favorites
		where workspace_id = $1 and user_id = $2 and deleted_at is null
		order by rank, id`,
		workspaceID,
		userID,
	)
	if err != nil {
		return nil, writeTrackingError("list tracking favorites", err)
	}
	defer rows.Close()

	favorites := make([]trackingapplication.FavoriteView, 0)
	for rows.Next() {
		favorite, err := scanFavorite(rows)
		if err != nil {
			return nil, err
		}
		favorites = append(favorites, favorite)
	}
	return favorites, rows.Err()
}

func (store *Store) CreateFavorite(ctx context.Context, record trackingapplication.CreateFavoriteRecord) (trackingapplication.FavoriteView, error) {
	row := store.pool.QueryRow(
		ctx,
		`insert into tracking_favorites (
			workspace_id, user_id, project_id, task_id, description, billable, public, rank, tag_ids
		) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		returning id, workspace_id, user_id, project_id, task_id, description, billable, public, rank,
			tag_ids, deleted_at, created_at, updated_at`,
		record.WorkspaceID,
		record.UserID,
		record.ProjectID,
		record.TaskID,
		record.Description,
		record.Billable,
		record.Public,
		record.Rank,
		coalesceInt64Slice(record.TagIDs),
	)
	return scanFavorite(row)
}

func (store *Store) UpdateFavorite(ctx context.Context, record trackingapplication.UpdateFavoriteRecord) (trackingapplication.FavoriteView, error) {
	row := store.pool.QueryRow(
		ctx,
		`update tracking_favorites
		set project_id = $4,
			task_id = $5,
			description = $6,
			billable = $7,
			public = $8,
			rank = $9,
			tag_ids = $10,
			updated_at = now()
		where workspace_id = $1 and user_id = $2 and id = $3
		returning id, workspace_id, user_id, project_id, task_id, description, billable, public, rank,
			tag_ids, deleted_at, created_at, updated_at`,
		record.WorkspaceID,
		record.UserID,
		record.ID,
		record.ProjectID,
		record.TaskID,
		record.Description,
		record.Billable,
		record.Public,
		record.Rank,
		coalesceInt64Slice(record.TagIDs),
	)
	return scanFavorite(row)
}

func (store *Store) DeleteFavorite(ctx context.Context, workspaceID int64, userID int64, favoriteID int64) error {
	_, err := store.pool.Exec(
		ctx,
		`update tracking_favorites
		set deleted_at = now(), updated_at = now()
		where workspace_id = $1 and user_id = $2 and id = $3`,
		workspaceID,
		userID,
		favoriteID,
	)
	if err != nil {
		return writeTrackingError("delete tracking favorite", err)
	}
	return nil
}

func (store *Store) ListGoals(ctx context.Context, workspaceID int64, filter trackingapplication.ListGoalsFilter) ([]trackingapplication.GoalView, error) {
	query := `select id, workspace_id, user_id, creator_user_id, name, active, billable, comparison,
		recurrence, icon, target_seconds, start_date, end_date, project_ids,
		task_ids, tag_ids, deleted_at, created_at, updated_at
	from tracking_goals
	where workspace_id = $1 and user_id = $2 and deleted_at is null`
	args := []any{workspaceID, filter.UserID}
	if filter.Active != nil {
		args = append(args, *filter.Active)
		query += " and active = $" + intParam(len(args))
	}
	query += " order by id limit $" + intParam(len(args)+1)
	args = append(args, filter.PerPage)

	rows, err := store.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, writeTrackingError("list tracking goals", err)
	}
	defer rows.Close()

	goals := make([]trackingapplication.GoalView, 0)
	for rows.Next() {
		goal, err := scanGoal(rows)
		if err != nil {
			return nil, err
		}
		goals = append(goals, goal)
	}
	return goals, rows.Err()
}

func (store *Store) GetGoal(ctx context.Context, workspaceID int64, userID int64, goalID int64) (trackingapplication.GoalView, bool, error) {
	row := store.pool.QueryRow(
		ctx,
		`select id, workspace_id, user_id, creator_user_id, name, active, billable, comparison,
			recurrence, icon, target_seconds, start_date, end_date, project_ids,
			task_ids, tag_ids, deleted_at, created_at, updated_at
		from tracking_goals
		where workspace_id = $1 and user_id = $2 and id = $3 and deleted_at is null`,
		workspaceID,
		userID,
		goalID,
	)
	goal, err := scanGoal(row)
	if err != nil {
		if strings.Contains(err.Error(), "no rows") {
			return trackingapplication.GoalView{}, false, nil
		}
		return trackingapplication.GoalView{}, false, err
	}
	return goal, true, nil
}

func (store *Store) CreateGoal(ctx context.Context, record trackingapplication.CreateGoalRecord) (trackingapplication.GoalView, error) {
	row := store.pool.QueryRow(
		ctx,
		`insert into tracking_goals (
			workspace_id, user_id, creator_user_id, name, active, billable, comparison, recurrence, icon,
			target_seconds, start_date, end_date, project_ids, task_ids, tag_ids
		) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		returning id, workspace_id, user_id, creator_user_id, name, active, billable, comparison,
			recurrence, icon, target_seconds, start_date, end_date, project_ids,
			task_ids, tag_ids, deleted_at, created_at, updated_at`,
		record.WorkspaceID,
		record.UserID,
		record.CreatorUserID,
		record.Name,
		record.Active,
		record.Billable,
		record.Comparison,
		record.Recurrence,
		record.Icon,
		record.TargetSeconds,
		record.StartDate,
		record.EndDate,
		coalesceInt64Slice(record.ProjectIDs),
		coalesceInt64Slice(record.TaskIDs),
		coalesceInt64Slice(record.TagIDs),
	)
	return scanGoal(row)
}

func (store *Store) UpdateGoal(ctx context.Context, record trackingapplication.UpdateGoalRecord) (trackingapplication.GoalView, error) {
	row := store.pool.QueryRow(
		ctx,
		`update tracking_goals
		set name = $4,
			active = $5,
			billable = $6,
			comparison = $7,
			recurrence = $8,
			icon = $9,
			target_seconds = $10,
			start_date = $11,
			end_date = $12,
			project_ids = $13,
			task_ids = $14,
			tag_ids = $15,
			updated_at = now()
		where workspace_id = $1 and user_id = $2 and id = $3
		returning id, workspace_id, user_id, creator_user_id, name, active, billable, comparison,
			recurrence, icon, target_seconds, start_date, end_date, project_ids,
			task_ids, tag_ids, deleted_at, created_at, updated_at`,
		record.WorkspaceID,
		record.UserID,
		record.ID,
		record.Name,
		record.Active,
		record.Billable,
		record.Comparison,
		record.Recurrence,
		record.Icon,
		record.TargetSeconds,
		record.StartDate,
		record.EndDate,
		coalesceInt64Slice(record.ProjectIDs),
		coalesceInt64Slice(record.TaskIDs),
		coalesceInt64Slice(record.TagIDs),
	)
	return scanGoal(row)
}

func (store *Store) DeleteGoal(ctx context.Context, workspaceID int64, userID int64, goalID int64) error {
	_, err := store.pool.Exec(
		ctx,
		`update tracking_goals
		set deleted_at = now(), updated_at = now()
		where workspace_id = $1 and user_id = $2 and id = $3`,
		workspaceID,
		userID,
		goalID,
	)
	if err != nil {
		return writeTrackingError("delete tracking goal", err)
	}
	return nil
}

func (store *Store) ListReminders(ctx context.Context, workspaceID int64) ([]trackingapplication.ReminderView, error) {
	rows, err := store.pool.Query(
		ctx,
		`select id, workspace_id, frequency, threshold_hours, email_reminder_enabled,
			slack_reminder_enabled, user_ids, group_ids,
			deleted_at, created_at, updated_at
		from tracking_reminders
		where workspace_id = $1 and deleted_at is null
		order by id`,
		workspaceID,
	)
	if err != nil {
		return nil, writeTrackingError("list tracking reminders", err)
	}
	defer rows.Close()

	reminders := make([]trackingapplication.ReminderView, 0)
	for rows.Next() {
		reminder, err := scanReminder(rows)
		if err != nil {
			return nil, err
		}
		reminders = append(reminders, reminder)
	}
	return reminders, rows.Err()
}

func (store *Store) GetReminder(ctx context.Context, workspaceID int64, reminderID int64) (trackingapplication.ReminderView, bool, error) {
	row := store.pool.QueryRow(
		ctx,
		`select id, workspace_id, frequency, threshold_hours, email_reminder_enabled,
			slack_reminder_enabled, user_ids, group_ids,
			deleted_at, created_at, updated_at
		from tracking_reminders
		where workspace_id = $1 and id = $2 and deleted_at is null`,
		workspaceID,
		reminderID,
	)
	reminder, err := scanReminder(row)
	if err != nil {
		if strings.Contains(err.Error(), "no rows") {
			return trackingapplication.ReminderView{}, false, nil
		}
		return trackingapplication.ReminderView{}, false, err
	}
	return reminder, true, nil
}

func (store *Store) CreateReminder(ctx context.Context, record trackingapplication.CreateReminderRecord) (trackingapplication.ReminderView, error) {
	row := store.pool.QueryRow(
		ctx,
		`insert into tracking_reminders (
			workspace_id, frequency, threshold_hours, email_reminder_enabled,
			slack_reminder_enabled, user_ids, group_ids
		) values ($1, $2, $3, $4, $5, $6, $7)
		returning id, workspace_id, frequency, threshold_hours, email_reminder_enabled,
			slack_reminder_enabled, user_ids, group_ids,
			deleted_at, created_at, updated_at`,
		record.WorkspaceID,
		record.Frequency,
		record.ThresholdHours,
		record.EmailReminderEnabled,
		record.SlackReminderEnabled,
		coalesceInt64Slice(record.UserIDs),
		coalesceInt64Slice(record.GroupIDs),
	)
	return scanReminder(row)
}

func (store *Store) UpdateReminder(ctx context.Context, record trackingapplication.UpdateReminderRecord) (trackingapplication.ReminderView, error) {
	row := store.pool.QueryRow(
		ctx,
		`update tracking_reminders
		set frequency = $3,
			threshold_hours = $4,
			email_reminder_enabled = $5,
			slack_reminder_enabled = $6,
			user_ids = $7,
			group_ids = $8,
			updated_at = now()
		where workspace_id = $1 and id = $2
		returning id, workspace_id, frequency, threshold_hours, email_reminder_enabled,
			slack_reminder_enabled, user_ids, group_ids,
			deleted_at, created_at, updated_at`,
		record.WorkspaceID,
		record.ID,
		record.Frequency,
		record.ThresholdHours,
		record.EmailReminderEnabled,
		record.SlackReminderEnabled,
		coalesceInt64Slice(record.UserIDs),
		coalesceInt64Slice(record.GroupIDs),
	)
	return scanReminder(row)
}

func (store *Store) DeleteReminder(ctx context.Context, workspaceID int64, reminderID int64) error {
	_, err := store.pool.Exec(
		ctx,
		`update tracking_reminders
		set deleted_at = now(), updated_at = now()
		where workspace_id = $1 and id = $2`,
		workspaceID,
		reminderID,
	)
	if err != nil {
		return writeTrackingError("delete tracking reminder", err)
	}
	return nil
}

func (store *Store) ListExpenses(ctx context.Context, workspaceID int64, userID int64) ([]trackingapplication.ExpenseView, error) {
	rows, err := store.pool.Query(
		ctx,
		`select id, workspace_id, user_id, time_entry_id, description, category, state, currency,
			total_amount, date_of_expense, deleted_at, created_at, updated_at
		from tracking_expenses
		where workspace_id = $1 and user_id = $2 and deleted_at is null
		order by id`,
		workspaceID,
		userID,
	)
	if err != nil {
		return nil, writeTrackingError("list tracking expenses", err)
	}
	defer rows.Close()

	expenses := make([]trackingapplication.ExpenseView, 0)
	for rows.Next() {
		var expense trackingapplication.ExpenseView
		if err := rows.Scan(
			&expense.ID,
			&expense.WorkspaceID,
			&expense.UserID,
			&expense.TimeEntryID,
			&expense.Description,
			&expense.Category,
			&expense.State,
			&expense.Currency,
			&expense.TotalAmount,
			&expense.DateOfExpense,
			&expense.DeletedAt,
			&expense.CreatedAt,
			&expense.UpdatedAt,
		); err != nil {
			return nil, writeTrackingError("scan tracking expense", err)
		}
		expense.DateOfExpense = expense.DateOfExpense.UTC()
		expenses = append(expenses, expense)
	}
	return expenses, rows.Err()
}

func (store *Store) CreateExpense(ctx context.Context, record trackingapplication.CreateExpenseRecord) (trackingapplication.ExpenseView, error) {
	row := store.pool.QueryRow(
		ctx,
		`insert into tracking_expenses (
			workspace_id, user_id, time_entry_id, description, category, state, currency, total_amount, date_of_expense
		) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		returning id, workspace_id, user_id, time_entry_id, description, category, state, currency,
			total_amount, date_of_expense, deleted_at, created_at, updated_at`,
		record.WorkspaceID,
		record.UserID,
		record.TimeEntryID,
		record.Description,
		record.Category,
		record.State,
		record.Currency,
		record.TotalAmount,
		record.DateOfExpense,
	)

	var expense trackingapplication.ExpenseView
	if err := row.Scan(
		&expense.ID,
		&expense.WorkspaceID,
		&expense.UserID,
		&expense.TimeEntryID,
		&expense.Description,
		&expense.Category,
		&expense.State,
		&expense.Currency,
		&expense.TotalAmount,
		&expense.DateOfExpense,
		&expense.DeletedAt,
		&expense.CreatedAt,
		&expense.UpdatedAt,
	); err != nil {
		return trackingapplication.ExpenseView{}, writeTrackingError("create tracking expense", err)
	}
	expense.DateOfExpense = expense.DateOfExpense.UTC()
	return expense, nil
}

func scanFavorite(scanner interface {
	Scan(dest ...any) error
}) (trackingapplication.FavoriteView, error) {
	var favorite trackingapplication.FavoriteView
	if err := scanner.Scan(
		&favorite.ID,
		&favorite.WorkspaceID,
		&favorite.UserID,
		&favorite.ProjectID,
		&favorite.TaskID,
		&favorite.Description,
		&favorite.Billable,
		&favorite.Public,
		&favorite.Rank,
		&favorite.TagIDs,
		&favorite.DeletedAt,
		&favorite.CreatedAt,
		&favorite.UpdatedAt,
	); err != nil {
		return trackingapplication.FavoriteView{}, writeTrackingError("scan tracking favorite", err)
	}
	favorite.TagIDs = coalesceInt64Slice(favorite.TagIDs)
	return favorite, nil
}

func scanGoal(scanner interface {
	Scan(dest ...any) error
}) (trackingapplication.GoalView, error) {
	var goal trackingapplication.GoalView
	if err := scanner.Scan(
		&goal.ID,
		&goal.WorkspaceID,
		&goal.UserID,
		&goal.CreatorUserID,
		&goal.Name,
		&goal.Active,
		&goal.Billable,
		&goal.Comparison,
		&goal.Recurrence,
		&goal.Icon,
		&goal.TargetSeconds,
		&goal.StartDate,
		&goal.EndDate,
		&goal.ProjectIDs,
		&goal.TaskIDs,
		&goal.TagIDs,
		&goal.DeletedAt,
		&goal.CreatedAt,
		&goal.UpdatedAt,
	); err != nil {
		return trackingapplication.GoalView{}, writeTrackingError("scan tracking goal", err)
	}
	goal.ProjectIDs = coalesceInt64Slice(goal.ProjectIDs)
	goal.TaskIDs = coalesceInt64Slice(goal.TaskIDs)
	goal.TagIDs = coalesceInt64Slice(goal.TagIDs)
	return goal, nil
}

func scanReminder(scanner interface {
	Scan(dest ...any) error
}) (trackingapplication.ReminderView, error) {
	var reminder trackingapplication.ReminderView
	if err := scanner.Scan(
		&reminder.ID,
		&reminder.WorkspaceID,
		&reminder.Frequency,
		&reminder.ThresholdHours,
		&reminder.EmailReminderEnabled,
		&reminder.SlackReminderEnabled,
		&reminder.UserIDs,
		&reminder.GroupIDs,
		&reminder.DeletedAt,
		&reminder.CreatedAt,
		&reminder.UpdatedAt,
	); err != nil {
		return trackingapplication.ReminderView{}, writeTrackingError("scan tracking reminder", err)
	}
	reminder.UserIDs = coalesceInt64Slice(reminder.UserIDs)
	reminder.GroupIDs = coalesceInt64Slice(reminder.GroupIDs)
	return reminder, nil
}
