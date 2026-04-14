package postgres

import (
	"context"
	"strconv"
	"strings"
	"time"

	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"
)

const tagNamesSubquery = `(select coalesce(array_agg(ct.name order by ct.name), '{}') from catalog_tags ct where ct.id = any(te.tag_ids))`

// tagNamesReturning is the same subquery but without the te. alias, for use in RETURNING clauses.
const tagNamesReturning = `(select coalesce(array_agg(ct.name order by ct.name), '{}') from catalog_tags ct where ct.id = any(tag_ids))`

func (store *Store) CreateTimeEntry(
	ctx context.Context,
	record trackingapplication.CreateTimeEntryRecord,
) (trackingapplication.TimeEntryView, error) {
	row := store.pool.QueryRow(
		ctx,
		`insert into tracking_time_entries (
			workspace_id, user_id, client_id, project_id, task_id, description, billable,
			start_time, stop_time, duration_seconds, created_with, tag_ids, expense_ids
		) values (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11, $12, $13
		)
		returning id, workspace_id, user_id, client_id, project_id, task_id, description, billable,
			start_time, stop_time, duration_seconds, created_with, tag_ids,
			expense_ids, deleted_at, created_at, updated_at,
			null::text as client_name, null::text as project_name, null::text as task_name, null::boolean as project_active, null::text as project_color,
			`+tagNamesReturning+``,
		record.WorkspaceID,
		record.UserID,
		record.ClientID,
		record.ProjectID,
		record.TaskID,
		record.Description,
		record.Billable,
		record.Start.UTC(),
		record.Stop,
		record.Duration,
		record.CreatedWith,
		coalesceInt64Slice(record.TagIDs),
		coalesceInt64Slice(record.ExpenseIDs),
	)
	return scanTimeEntry(row)
}

func (store *Store) GetTimeEntry(
	ctx context.Context,
	workspaceID int64,
	userID int64,
	timeEntryID int64,
) (trackingapplication.TimeEntryView, bool, error) {
	row := store.pool.QueryRow(
		ctx,
		`select
			te.id,
			te.workspace_id,
			te.user_id,
			te.client_id,
			te.project_id,
			te.task_id,
			te.description,
			te.billable,
			te.start_time,
			te.stop_time,
			te.duration_seconds,
			te.created_with,
			te.tag_ids,
			te.expense_ids,
			te.deleted_at,
			te.created_at,
			te.updated_at,
			c.name,
			p.name,
			t.name,
			p.active,
			p.color,
			`+tagNamesSubquery+`
		from tracking_time_entries te
		left join catalog_clients c on c.id = te.client_id
		left join catalog_projects p on p.id = te.project_id
		left join catalog_tasks t on t.id = te.task_id
		where te.workspace_id = $1 and te.user_id = $2 and te.id = $3 and te.deleted_at is null`,
		workspaceID,
		userID,
		timeEntryID,
	)
	entry, err := scanTimeEntry(row)
	if err != nil {
		if strings.Contains(err.Error(), "no rows") {
			return trackingapplication.TimeEntryView{}, false, nil
		}
		return trackingapplication.TimeEntryView{}, false, err
	}
	return entry, true, nil
}

func (store *Store) GetTimeEntryForUser(
	ctx context.Context,
	userID int64,
	timeEntryID int64,
) (trackingapplication.TimeEntryView, bool, error) {
	row := store.pool.QueryRow(
		ctx,
		`select
			te.id,
			te.workspace_id,
			te.user_id,
			te.client_id,
			te.project_id,
			te.task_id,
			te.description,
			te.billable,
			te.start_time,
			te.stop_time,
			te.duration_seconds,
			te.created_with,
			te.tag_ids,
			te.expense_ids,
			te.deleted_at,
			te.created_at,
			te.updated_at,
			c.name,
			p.name,
			t.name,
			p.active,
			p.color,
			`+tagNamesSubquery+`
		from tracking_time_entries te
		left join catalog_clients c on c.id = te.client_id
		left join catalog_projects p on p.id = te.project_id
		left join catalog_tasks t on t.id = te.task_id
		where te.user_id = $1 and te.id = $2 and te.deleted_at is null`,
		userID,
		timeEntryID,
	)
	entry, err := scanTimeEntry(row)
	if err != nil {
		if strings.Contains(err.Error(), "no rows") {
			return trackingapplication.TimeEntryView{}, false, nil
		}
		return trackingapplication.TimeEntryView{}, false, err
	}
	return entry, true, nil
}

func (store *Store) ListTimeEntries(
	ctx context.Context,
	workspaceID int64,
	filter trackingapplication.ListTimeEntriesFilter,
) ([]trackingapplication.TimeEntryView, error) {
	query := `select
		te.id,
		te.workspace_id,
		te.user_id,
		te.client_id,
		te.project_id,
		te.task_id,
		te.description,
		te.billable,
		te.start_time,
		te.stop_time,
		te.duration_seconds,
		te.created_with,
		te.tag_ids,
		te.expense_ids,
		te.deleted_at,
		te.created_at,
		te.updated_at,
		c.name,
		p.name,
		t.name,
		p.active,
		p.color,
		` + tagNamesSubquery + `
	from tracking_time_entries te
	left join catalog_clients c on c.id = te.client_id
	left join catalog_projects p on p.id = te.project_id
	left join catalog_tasks t on t.id = te.task_id
	where te.workspace_id = $1 and te.user_id = $2`
	args := []any{workspaceID, filter.UserID}
	if !filter.IncludeAll {
		query += " and te.deleted_at is null"
	}
	if filter.Since != nil {
		args = append(args, filter.Since.UTC())
		query += " and te.updated_at >= $" + intParam(len(args))
	}
	if filter.Before != nil {
		args = append(args, filter.Before.UTC())
		query += " and te.start_time < $" + intParam(len(args))
	}
	if filter.StartDate != nil {
		args = append(args, filter.StartDate.UTC())
		query += " and te.start_time >= $" + intParam(len(args))
	}
	if filter.EndDate != nil {
		args = append(args, filter.EndDate.UTC())
		query += " and te.start_time <= $" + intParam(len(args))
	}
	query += " order by te.start_time, te.id"

	rows, err := store.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, writeTrackingError("list tracking time entries", err)
	}
	defer rows.Close()

	entries := make([]trackingapplication.TimeEntryView, 0)
	for rows.Next() {
		entry, err := scanTimeEntry(rows)
		if err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}
	return entries, rows.Err()
}

func (store *Store) ListTimeEntriesForUser(
	ctx context.Context,
	filter trackingapplication.ListTimeEntriesFilter,
) ([]trackingapplication.TimeEntryView, error) {
	query := `select
		te.id,
		te.workspace_id,
		te.user_id,
		te.client_id,
		te.project_id,
		te.task_id,
		te.description,
		te.billable,
		te.start_time,
		te.stop_time,
		te.duration_seconds,
		te.created_with,
		te.tag_ids,
		te.expense_ids,
		te.deleted_at,
		te.created_at,
		te.updated_at,
		c.name,
		p.name,
		t.name,
		p.active,
		p.color,
		` + tagNamesSubquery + `
	from tracking_time_entries te
	left join catalog_clients c on c.id = te.client_id
	left join catalog_projects p on p.id = te.project_id
	left join catalog_tasks t on t.id = te.task_id
	where te.user_id = $1`
	args := []any{filter.UserID}
	if filter.WorkspaceID > 0 {
		args = append(args, filter.WorkspaceID)
		query += " and te.workspace_id = $" + intParam(len(args))
	}
	if !filter.IncludeAll {
		query += " and te.deleted_at is null"
	}
	if filter.Since != nil {
		args = append(args, filter.Since.UTC())
		query += " and te.updated_at >= $" + intParam(len(args))
	}
	if filter.Before != nil {
		args = append(args, filter.Before.UTC())
		query += " and te.start_time < $" + intParam(len(args))
	}
	if filter.StartDate != nil {
		args = append(args, filter.StartDate.UTC())
		query += " and te.start_time >= $" + intParam(len(args))
	}
	if filter.EndDate != nil {
		args = append(args, filter.EndDate.UTC())
		query += " and te.start_time <= $" + intParam(len(args))
	}
	query += " order by te.start_time, te.id"

	rows, err := store.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, writeTrackingError("list tracking time entries for user", err)
	}
	defer rows.Close()

	entries := make([]trackingapplication.TimeEntryView, 0)
	for rows.Next() {
		entry, err := scanTimeEntry(rows)
		if err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}
	return entries, rows.Err()
}

func (store *Store) SearchTimeEntries(
	ctx context.Context,
	workspaceID int64,
	userID int64,
	query string,
) ([]trackingapplication.TimeEntrySearchView, error) {
	sql := `select
		te.id,
		te.workspace_id,
		te.description,
		te.project_id,
		p.name,
		p.color,
		te.tag_ids,
		(select array_agg(t.name order by t.id) from catalog_tags t where t.id = any(te.tag_ids)),
		te.billable,
		te.start_time,
		te.stop_time,
		te.duration_seconds
	from tracking_time_entries te
	left join catalog_projects p on p.id = te.project_id
	where te.workspace_id = $1
	  and te.user_id = $2
	  and te.deleted_at is null
	  and te.description ilike '%' || $3 || '%'
	order by te.start_time desc
	limit 20`

	rows, err := store.pool.Query(ctx, sql, workspaceID, userID, query)
	if err != nil {
		return nil, writeTrackingError("search time entries", err)
	}
	defer rows.Close()

	results := make([]trackingapplication.TimeEntrySearchView, 0)
	for rows.Next() {
		var entry trackingapplication.TimeEntrySearchView
		if err := rows.Scan(
			&entry.ID,
			&entry.WorkspaceID,
			&entry.Description,
			&entry.ProjectID,
			&entry.ProjectName,
			&entry.ProjectColor,
			&entry.TagIDs,
			&entry.TagNames,
			&entry.Billable,
			&entry.Start,
			&entry.Stop,
			&entry.Duration,
		); err != nil {
			return nil, writeTrackingError("scan search time entry", err)
		}
		results = append(results, entry)
	}
	return results, rows.Err()
}

func (store *Store) ListWorkspaceTimeEntries(
	ctx context.Context,
	workspaceID int64,
	since *time.Time,
) ([]trackingapplication.TimeEntryView, error) {
	query := `select
		te.id,
		te.workspace_id,
		te.user_id,
		te.client_id,
		te.project_id,
		te.task_id,
		te.description,
		te.billable,
		te.start_time,
		te.stop_time,
		te.duration_seconds,
		te.created_with,
		te.tag_ids,
		te.expense_ids,
		te.deleted_at,
		te.created_at,
		te.updated_at,
		c.name,
		p.name,
		t.name,
		p.active,
		p.color,
		` + tagNamesSubquery + `
	from tracking_time_entries te
	left join catalog_clients c on c.id = te.client_id
	left join catalog_projects p on p.id = te.project_id
	left join catalog_tasks t on t.id = te.task_id
	where te.workspace_id = $1 and te.deleted_at is null`
	args := []any{workspaceID}
	if since != nil {
		args = append(args, since.UTC())
		query += " and te.start_time >= $" + intParam(len(args))
	}
	query += " order by te.start_time desc, te.id desc"

	rows, err := store.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, writeTrackingError("list workspace tracking time entries", err)
	}
	defer rows.Close()

	entries := make([]trackingapplication.TimeEntryView, 0)
	for rows.Next() {
		entry, err := scanTimeEntry(rows)
		if err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}
	return entries, rows.Err()
}

func (store *Store) GetCurrentTimeEntry(ctx context.Context, userID int64) (trackingapplication.TimeEntryView, bool, error) {
	// Primary path: look up via the running timers table.
	row := store.pool.QueryRow(
		ctx,
		`select
			te.id,
			te.workspace_id,
			te.user_id,
			te.client_id,
			te.project_id,
			te.task_id,
			te.description,
			te.billable,
			te.start_time,
			te.stop_time,
			te.duration_seconds,
			te.created_with,
			te.tag_ids,
			te.expense_ids,
			te.deleted_at,
			te.created_at,
			te.updated_at,
			c.name,
			p.name,
			t.name,
			p.active,
			p.color,
			`+tagNamesSubquery+`
		from tracking_running_timers rt
		join tracking_time_entries te on te.id = rt.time_entry_id
		left join catalog_clients c on c.id = te.client_id
		left join catalog_projects p on p.id = te.project_id
		left join catalog_tasks t on t.id = te.task_id
		where rt.user_id = $1 and te.deleted_at is null`,
		userID,
	)
	entry, err := scanTimeEntry(row)
	if err == nil {
		return entry, true, nil
	}
	if !strings.Contains(err.Error(), "no rows") {
		return trackingapplication.TimeEntryView{}, false, err
	}

	// Fallback: find an entry with negative duration (Toggl convention for
	// running timers). This covers entries created through import or other
	// paths that do not populate tracking_running_timers.
	fallbackRow := store.pool.QueryRow(
		ctx,
		`select
			te.id,
			te.workspace_id,
			te.user_id,
			te.client_id,
			te.project_id,
			te.task_id,
			te.description,
			te.billable,
			te.start_time,
			te.stop_time,
			te.duration_seconds,
			te.created_with,
			te.tag_ids,
			te.expense_ids,
			te.deleted_at,
			te.created_at,
			te.updated_at,
			c.name,
			p.name,
			t.name,
			p.active,
			p.color,
			`+tagNamesSubquery+`
		from tracking_time_entries te
		left join catalog_clients c on c.id = te.client_id
		left join catalog_projects p on p.id = te.project_id
		left join catalog_tasks t on t.id = te.task_id
		where te.user_id = $1 and te.deleted_at is null and te.duration_seconds < 0
		order by te.start_time desc
		limit 1`,
		userID,
	)
	entry, err = scanTimeEntry(fallbackRow)
	if err != nil {
		if strings.Contains(err.Error(), "no rows") {
			return trackingapplication.TimeEntryView{}, false, nil
		}
		return trackingapplication.TimeEntryView{}, false, err
	}

	// Repair: populate tracking_running_timers so the primary path works
	// on subsequent calls.
	_, _ = store.pool.Exec(
		ctx,
		`insert into tracking_running_timers (user_id, time_entry_id)
		values ($1, $2)
		on conflict (user_id) do update set
			time_entry_id = excluded.time_entry_id,
			started_at = now()`,
		userID, entry.ID,
	)

	return entry, true, nil
}

func (store *Store) UpdateTimeEntry(
	ctx context.Context,
	record trackingapplication.UpdateTimeEntryRecord,
) (trackingapplication.TimeEntryView, error) {
	// The RETURNING clause must surface the SAME denormalized fields that
	// GetTimeEntry / ListTimeEntries return (client_name, project_name,
	// task_name, project_active, project_color), otherwise the frontend's
	// `onSuccess` handler replaces its optimistic row with a server entry
	// whose project_name is NULL — blanking the project label on mobile
	// row display (see apps/website/e2e/mobile/mobile-timer.spec.ts:357).
	// Wrap the UPDATE in a CTE so the outer SELECT can LEFT JOIN the
	// catalog tables the same way GetTimeEntry does at line 85-87.
	row := store.pool.QueryRow(
		ctx,
		`with updated as (
			update tracking_time_entries
			set client_id = $4,
				project_id = $5,
				task_id = $6,
				description = $7,
				billable = $8,
				start_time = $9,
				stop_time = $10,
				duration_seconds = $11,
				created_with = $12,
				tag_ids = $13,
				expense_ids = $14,
				updated_at = now()
			where workspace_id = $1 and user_id = $2 and id = $3
			returning *
		)
		select te.id, te.workspace_id, te.user_id, te.client_id, te.project_id, te.task_id,
			te.description, te.billable, te.start_time, te.stop_time, te.duration_seconds,
			te.created_with, te.tag_ids, te.expense_ids, te.deleted_at, te.created_at, te.updated_at,
			c.name, p.name, t.name, p.active, p.color,
			`+tagNamesSubquery+`
		from updated te
		left join catalog_clients c on c.id = te.client_id
		left join catalog_projects p on p.id = te.project_id
		left join catalog_tasks t on t.id = te.task_id`,
		record.WorkspaceID,
		record.UserID,
		record.ID,
		record.ClientID,
		record.ProjectID,
		record.TaskID,
		record.Description,
		record.Billable,
		record.Start.UTC(),
		record.Stop,
		record.Duration,
		record.CreatedWith,
		coalesceInt64Slice(record.TagIDs),
		coalesceInt64Slice(record.ExpenseIDs),
	)
	return scanTimeEntry(row)
}

func (store *Store) DeleteTimeEntry(ctx context.Context, workspaceID int64, userID int64, timeEntryID int64) error {
	_, err := store.pool.Exec(
		ctx,
		`update tracking_time_entries
		set deleted_at = now(), updated_at = now()
		where workspace_id = $1 and user_id = $2 and id = $3`,
		workspaceID,
		userID,
		timeEntryID,
	)
	if err != nil {
		return writeTrackingError("delete tracking time entry", err)
	}
	return nil
}

func (store *Store) SetRunningTimeEntry(ctx context.Context, userID int64, timeEntryID int64) error {
	_, err := store.pool.Exec(
		ctx,
		`insert into tracking_running_timers (user_id, time_entry_id)
		values ($1, $2)
		on conflict (user_id) do update set
			time_entry_id = excluded.time_entry_id,
			started_at = now()`,
		userID,
		timeEntryID,
	)
	if err != nil {
		return writeTrackingError("set running time entry", err)
	}
	return nil
}

func (store *Store) ClearRunningTimeEntry(ctx context.Context, userID int64) error {
	_, err := store.pool.Exec(ctx, "delete from tracking_running_timers where user_id = $1", userID)
	if err != nil {
		return writeTrackingError("clear running time entry", err)
	}
	return nil
}

func scanTimeEntry(scanner interface {
	Scan(dest ...any) error
}) (trackingapplication.TimeEntryView, error) {
	var (
		entry         trackingapplication.TimeEntryView
		start         time.Time
		stop          *time.Time
		deletedAt     *time.Time
		createdAt     time.Time
		updatedAt     time.Time
		clientName    *string
		projectName   *string
		taskName      *string
		projectActive *bool
		projectColor  *string
	)
	if err := scanner.Scan(
		&entry.ID,
		&entry.WorkspaceID,
		&entry.UserID,
		&entry.ClientID,
		&entry.ProjectID,
		&entry.TaskID,
		&entry.Description,
		&entry.Billable,
		&start,
		&stop,
		&entry.Duration,
		&entry.CreatedWith,
		&entry.TagIDs,
		&entry.ExpenseIDs,
		&deletedAt,
		&createdAt,
		&updatedAt,
		&clientName,
		&projectName,
		&taskName,
		&projectActive,
		&projectColor,
		&entry.TagNames,
	); err != nil {
		return trackingapplication.TimeEntryView{}, writeTrackingError("scan tracking time entry", err)
	}
	buildTimeEntryView(&entry, start, stop, deletedAt, createdAt, updatedAt, clientName, projectName, taskName, projectActive, projectColor)
	return entry, nil
}

func intParam(value int) string {
	return strconv.Itoa(value)
}
