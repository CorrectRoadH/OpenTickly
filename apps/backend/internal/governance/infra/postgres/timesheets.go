package postgres

import (
	"context"
	"time"

	governanceapplication "opentoggl/backend/apps/backend/internal/governance/application"
)

func (store *Store) ListStoredTimesheets(
	ctx context.Context,
	workspaceID int64,
	setupIDs []int64,
	after *time.Time,
	before *time.Time,
) ([]governanceapplication.TimesheetView, error) {
	if len(setupIDs) == 0 {
		return []governanceapplication.TimesheetView{}, nil
	}
	rows, err := store.pool.Query(ctx, `
		select
			t.id,
			t.workspace_id,
			t.timesheet_setup_id,
			t.member_user_id,
			member.full_name,
			s.approver_user_id,
			approver.full_name,
			s.approver_user_ids,
			s.approver_layers,
			s.periodicity,
			t.start_date,
			t.end_date,
			t.status,
			t.force_approved,
			t.rejection_comment,
			t.review_layer,
			t.submitted_at,
			t.approved_or_rejected_at,
			t.approved_or_rejected_id,
			s.reminder_day,
			s.reminder_time,
			t.reminder_sent_at,
			t.timezone,
			t.created_at,
			t.updated_at,
			t.reviews
		from governance_timesheets t
		join governance_timesheet_setups s on s.id = t.timesheet_setup_id
		join identity_users member on member.id = t.member_user_id
		left join identity_users approver on approver.id = s.approver_user_id
		where t.workspace_id = $1
			and t.timesheet_setup_id = any($2)
			and t.deleted_at is null
			and ($3::date is null or t.start_date >= $3::date)
			and ($4::date is null or t.start_date <= $4::date)
		order by t.start_date, t.id
	`, workspaceID, setupIDs, after, before)
	if err != nil {
		return nil, writeGovernanceError("list timesheets", err)
	}
	defer rows.Close()

	timesheets := make([]governanceapplication.TimesheetView, 0)
	for rows.Next() {
		view, err := scanTimesheet(rows)
		if err != nil {
			return nil, err
		}
		userIDs := append([]int64{view.MemberUserID}, view.ApproverUserIDs...)
		if view.ApproverUserID != nil {
			userIDs = append(userIDs, *view.ApproverUserID)
		}
		if view.ApprovedOrRejectedID != nil {
			userIDs = append(userIDs, *view.ApprovedOrRejectedID)
		}
		for _, review := range view.Reviews {
			userIDs = append(userIDs, review.UserID)
		}
		names, err := store.lookupKnownUsers(ctx, userIDs)
		if err != nil {
			return nil, err
		}
		view.KnownUserNames = names
		timesheets = append(timesheets, view)
	}
	if err := rows.Err(); err != nil {
		return nil, writeGovernanceError("iterate timesheets", err)
	}
	return timesheets, nil
}

func (store *Store) SaveTimesheet(
	ctx context.Context,
	view governanceapplication.TimesheetView,
) (governanceapplication.TimesheetView, error) {
	reviews := mustJSON(view.Reviews, "[]")
	row := store.pool.QueryRow(ctx, `
		insert into governance_timesheets (
			workspace_id,
			timesheet_setup_id,
			member_user_id,
			start_date,
			end_date,
			status,
			force_approved,
			rejection_comment,
			review_layer,
			submitted_at,
			approved_or_rejected_at,
			approved_or_rejected_id,
			reminder_sent_at,
			timezone,
			reviews,
			created_at,
			updated_at
		) values (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
		)
		on conflict (timesheet_setup_id, start_date) do update set
			end_date = excluded.end_date,
			status = excluded.status,
			force_approved = excluded.force_approved,
			rejection_comment = excluded.rejection_comment,
			review_layer = excluded.review_layer,
			submitted_at = excluded.submitted_at,
			approved_or_rejected_at = excluded.approved_or_rejected_at,
			approved_or_rejected_id = excluded.approved_or_rejected_id,
			reminder_sent_at = excluded.reminder_sent_at,
			timezone = excluded.timezone,
			reviews = excluded.reviews,
			updated_at = excluded.updated_at
		returning id
	`,
		view.WorkspaceID,
		view.TimesheetSetupID,
		view.MemberUserID,
		view.StartDate,
		view.EndDate,
		view.Status,
		view.ForceApproved,
		view.RejectionComment,
		view.ReviewLayer,
		view.SubmittedAt,
		view.ApprovedOrRejectedAt,
		view.ApprovedOrRejectedID,
		view.ReminderSentAt,
		view.Timezone,
		reviews,
		view.CreatedAt,
		view.UpdatedAt,
	)
	if err := row.Scan(&view.ID); err != nil {
		return governanceapplication.TimesheetView{}, writeGovernanceError("save timesheet", err)
	}
	return view, nil
}

func (store *Store) ListPeriodTimeEntries(
	ctx context.Context,
	workspaceID int64,
	userID int64,
	start time.Time,
	end time.Time,
) ([]governanceapplication.TrackedTimeEntryView, error) {
	rows, err := store.pool.Query(ctx, `
		select
			id,
			workspace_id,
			user_id,
			client_id,
			client.name,
			project_id,
			project.name,
			task_id,
			task.name,
			description,
			billable,
			start_time,
			stop_time,
			duration_seconds,
			created_at,
			updated_at,
			tag_ids,
			expense_ids
		from tracking_time_entries
		left join catalog_clients client on client.id = tracking_time_entries.client_id
		left join catalog_projects project on project.id = tracking_time_entries.project_id
		left join catalog_tasks task on task.id = tracking_time_entries.task_id
		where workspace_id = $1
			and user_id = $2
			and deleted_at is null
			and start_time::date >= $3
			and start_time::date <= $4
		order by start_time, id
	`, workspaceID, userID, start, end)
	if err != nil {
		return nil, writeGovernanceError("list period time entries", err)
	}
	defer rows.Close()

	entries := make([]governanceapplication.TrackedTimeEntryView, 0)
	for rows.Next() {
		var (
			entry       governanceapplication.TrackedTimeEntryView
			clientID    *int64
			clientName  *string
			projectID   *int64
			projectName *string
			taskID      *int64
			taskName    *string
			stopTime    *time.Time
			tagIDsRaw   []byte
			expenseRaw  []byte
		)
		if err := rows.Scan(
			&entry.ID,
			&entry.WorkspaceID,
			&entry.UserID,
			&clientID,
			&clientName,
			&projectID,
			&projectName,
			&taskID,
			&taskName,
			&entry.Description,
			&entry.Billable,
			&entry.Start,
			&stopTime,
			&entry.Duration,
			&entry.CreatedAt,
			&entry.UpdatedAt,
			&tagIDsRaw,
			&expenseRaw,
		); err != nil {
			return nil, writeGovernanceError("scan period time entry", err)
		}
		entry.ClientID = clientID
		entry.ClientName = clientName
		entry.ProjectID = projectID
		entry.ProjectName = projectName
		entry.TaskID = taskID
		entry.TaskName = taskName
		entry.Stop = stopTime
		entry.TagIDs = decodeInt64s(tagIDsRaw)
		entry.ExpenseIDs = decodeInt64s(expenseRaw)
		entries = append(entries, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, writeGovernanceError("iterate period time entries", err)
	}
	return entries, nil
}

func scanTimesheet(row interface{ Scan(...any) error }) (governanceapplication.TimesheetView, error) {
	var (
		view              governanceapplication.TimesheetView
		approverUserID    *int64
		approverName      *string
		approverIDsRaw    []byte
		approverLayersRaw []byte
		submittedAt       *time.Time
		approvedAt        *time.Time
		approvedByID      *int64
		reminderSentAt    *time.Time
		reviewsRaw        []byte
	)
	if err := row.Scan(
		&view.ID,
		&view.WorkspaceID,
		&view.TimesheetSetupID,
		&view.MemberUserID,
		&view.MemberName,
		&approverUserID,
		&approverName,
		&approverIDsRaw,
		&approverLayersRaw,
		&view.Periodicity,
		&view.StartDate,
		&view.EndDate,
		&view.Status,
		&view.ForceApproved,
		&view.RejectionComment,
		&view.ReviewLayer,
		&submittedAt,
		&approvedAt,
		&approvedByID,
		&view.ReminderDay,
		&view.ReminderTime,
		&reminderSentAt,
		&view.Timezone,
		&view.CreatedAt,
		&view.UpdatedAt,
		&reviewsRaw,
	); err != nil {
		return governanceapplication.TimesheetView{}, writeGovernanceError("scan timesheet", err)
	}
	view.ApproverUserID = approverUserID
	view.ApproverName = approverName
	view.ApproverUserIDs = decodeInt64s(approverIDsRaw)
	view.ApproverLayers = decodeApproverLayers(approverLayersRaw)
	view.PeriodStart = view.StartDate
	view.PeriodEnd = view.EndDate
	view.SubmittedAt = submittedAt
	view.ApprovedOrRejectedAt = approvedAt
	view.ApprovedOrRejectedID = approvedByID
	view.ReminderSentAt = reminderSentAt
	view.WorkingHoursInMinutes = (int(view.EndDate.Sub(view.StartDate).Hours()/24) + 1) * 8 * 60
	view.Reviews = decodeReviews(reviewsRaw)
	return view, nil
}
