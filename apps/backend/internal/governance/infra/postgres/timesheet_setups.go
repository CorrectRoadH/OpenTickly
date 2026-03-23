package postgres

import (
	"context"
	"time"

	governanceapplication "opentoggl/backend/apps/backend/internal/governance/application"
)

func (store *Store) ListTimesheetSetups(
	ctx context.Context,
	workspaceID int64,
	filter governanceapplication.ListTimesheetSetupsFilter,
) ([]governanceapplication.TimesheetSetupView, error) {
	rows, err := store.pool.Query(ctx, `
		select
			s.id,
			s.workspace_id,
			s.member_user_id,
			member.full_name,
			s.approver_user_id,
			approver.full_name,
			s.approver_user_ids,
			s.approver_layers,
			s.periodicity,
			s.reminder_day,
			s.reminder_time,
			s.email_reminder_enabled,
			s.slack_reminder_enabled,
			s.start_date,
			s.end_date,
			s.created_at,
			s.updated_at
		from governance_timesheet_setups s
		join identity_users member on member.id = s.member_user_id
		left join identity_users approver on approver.id = s.approver_user_id
		where s.workspace_id = $1
			and s.deleted_at is null
		order by s.start_date, s.id
	`, workspaceID)
	if err != nil {
		return nil, writeGovernanceError("list timesheet setups", err)
	}
	defer rows.Close()

	setups := make([]governanceapplication.TimesheetSetupView, 0)
	for rows.Next() {
		view, err := scanTimesheetSetup(rows)
		if err != nil {
			return nil, err
		}
		if len(filter.MemberUserIDs) > 0 {
			matched := false
			for _, memberID := range filter.MemberUserIDs {
				if memberID == view.MemberUserID {
					matched = true
					break
				}
			}
			if !matched {
				continue
			}
		}
		if len(filter.ApproverUserIDs) > 0 {
			matched := false
			for _, approverID := range filter.ApproverUserIDs {
				if view.ApproverUserID != nil && approverID == *view.ApproverUserID {
					matched = true
					break
				}
				for _, candidate := range view.ApproverUserIDs {
					if candidate == approverID {
						matched = true
						break
					}
				}
			}
			if !matched {
				continue
			}
		}

		userIDs := append([]int64{view.MemberUserID}, view.ApproverUserIDs...)
		if view.ApproverUserID != nil {
			userIDs = append(userIDs, *view.ApproverUserID)
		}
		names, err := store.lookupKnownUsers(ctx, userIDs)
		if err != nil {
			return nil, err
		}
		view.KnownUserNames = names
		setups = append(setups, view)
	}
	if err := rows.Err(); err != nil {
		return nil, writeGovernanceError("iterate timesheet setups", err)
	}
	return setups, nil
}

func (store *Store) GetTimesheetSetup(
	ctx context.Context,
	workspaceID int64,
	setupID int64,
) (governanceapplication.TimesheetSetupView, bool, error) {
	row := store.pool.QueryRow(ctx, `
		select
			s.id,
			s.workspace_id,
			s.member_user_id,
			member.full_name,
			s.approver_user_id,
			approver.full_name,
			s.approver_user_ids,
			s.approver_layers,
			s.periodicity,
			s.reminder_day,
			s.reminder_time,
			s.email_reminder_enabled,
			s.slack_reminder_enabled,
			s.start_date,
			s.end_date,
			s.created_at,
			s.updated_at
		from governance_timesheet_setups s
		join identity_users member on member.id = s.member_user_id
		left join identity_users approver on approver.id = s.approver_user_id
		where s.workspace_id = $1
			and s.id = $2
			and s.deleted_at is null
	`, workspaceID, setupID)
	view, err := scanTimesheetSetup(row)
	if err != nil {
		if rowNotFound(err) {
			return governanceapplication.TimesheetSetupView{}, false, nil
		}
		return governanceapplication.TimesheetSetupView{}, false, err
	}
	userIDs := append([]int64{view.MemberUserID}, view.ApproverUserIDs...)
	if view.ApproverUserID != nil {
		userIDs = append(userIDs, *view.ApproverUserID)
	}
	view.KnownUserNames, err = store.lookupKnownUsers(ctx, userIDs)
	if err != nil {
		return governanceapplication.TimesheetSetupView{}, false, err
	}
	return view, true, nil
}

func (store *Store) CreateTimesheetSetups(
	ctx context.Context,
	command governanceapplication.CreateTimesheetSetupCommand,
) ([]governanceapplication.TimesheetSetupView, error) {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return nil, writeGovernanceError("begin create timesheet setups", err)
	}
	defer tx.Rollback(ctx)

	setupIDs := make([]int64, 0, len(command.MemberUserIDs))
	for _, memberUserID := range command.MemberUserIDs {
		row := tx.QueryRow(ctx, `
			insert into governance_timesheet_setups (
				workspace_id,
				member_user_id,
				approver_user_id,
				approver_user_ids,
				approver_layers,
				periodicity,
				reminder_day,
				reminder_time,
				email_reminder_enabled,
				slack_reminder_enabled,
				start_date
			) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			returning id
		`,
			command.WorkspaceID,
			memberUserID,
			command.ApproverUserID,
			mustJSON(command.ApproverUserIDs, "[]"),
			mustJSON(command.ApproverLayers, "{}"),
			command.Periodicity,
			command.ReminderDay,
			command.ReminderTime,
			command.EmailReminderEnabled,
			command.SlackReminderEnabled,
			command.StartDate,
		)
		var setupID int64
		if err := row.Scan(&setupID); err != nil {
			return nil, writeGovernanceError("insert timesheet setup", err)
		}
		setupIDs = append(setupIDs, setupID)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, writeGovernanceError("commit timesheet setups", err)
	}

	setups := make([]governanceapplication.TimesheetSetupView, 0, len(setupIDs))
	for _, setupID := range setupIDs {
		view, ok, err := store.GetTimesheetSetup(ctx, command.WorkspaceID, setupID)
		if err != nil {
			return nil, err
		}
		if ok {
			setups = append(setups, view)
		}
	}
	return setups, nil
}

func (store *Store) UpdateTimesheetSetup(
	ctx context.Context,
	command governanceapplication.UpdateTimesheetSetupCommand,
) (governanceapplication.TimesheetSetupView, error) {
	current, ok, err := store.GetTimesheetSetup(ctx, command.WorkspaceID, command.SetupID)
	if err != nil {
		return governanceapplication.TimesheetSetupView{}, err
	}
	if !ok {
		return governanceapplication.TimesheetSetupView{}, governanceapplication.ErrTimesheetSetupNotFound
	}

	approverUserID := current.ApproverUserID
	if command.ApproverUserID != nil {
		approverUserID = command.ApproverUserID
	}
	approverUserIDs := current.ApproverUserIDs
	if command.ApproverUserIDs != nil {
		approverUserIDs = append([]int64{}, command.ApproverUserIDs...)
	}
	approverLayers := current.ApproverLayers
	if command.ApproverLayers != nil {
		approverLayers = command.ApproverLayers
	}
	reminderDay := current.ReminderDay
	if command.ReminderDay != nil {
		reminderDay = *command.ReminderDay
	}
	reminderTime := current.ReminderTime
	if command.ReminderTime != nil {
		reminderTime = *command.ReminderTime
	}
	emailReminderEnabled := current.EmailReminderEnabled
	if command.EmailReminderEnabled != nil {
		emailReminderEnabled = *command.EmailReminderEnabled
	}
	slackReminderEnabled := current.SlackReminderEnabled
	if command.SlackReminderEnabled != nil {
		slackReminderEnabled = *command.SlackReminderEnabled
	}
	endDate := current.EndDate
	if command.EndDate != nil {
		endDate = command.EndDate
	}

	tag, err := store.pool.Exec(ctx, `
		update governance_timesheet_setups
		set approver_user_id = $3,
			approver_user_ids = $4,
			approver_layers = $5,
			reminder_day = $6,
			reminder_time = $7,
			email_reminder_enabled = $8,
			slack_reminder_enabled = $9,
			end_date = $10,
			updated_at = now()
		where workspace_id = $1
			and id = $2
			and deleted_at is null
	`,
		command.WorkspaceID,
		command.SetupID,
		approverUserID,
		mustJSON(approverUserIDs, "[]"),
		mustJSON(approverLayers, "{}"),
		reminderDay,
		reminderTime,
		emailReminderEnabled,
		slackReminderEnabled,
		endDate,
	)
	if err != nil {
		return governanceapplication.TimesheetSetupView{}, writeGovernanceError("update timesheet setup", err)
	}
	if tag.RowsAffected() != 1 {
		return governanceapplication.TimesheetSetupView{}, governanceapplication.ErrTimesheetSetupNotFound
	}

	updated, ok, err := store.GetTimesheetSetup(ctx, command.WorkspaceID, command.SetupID)
	if err != nil {
		return governanceapplication.TimesheetSetupView{}, err
	}
	if !ok {
		return governanceapplication.TimesheetSetupView{}, governanceapplication.ErrTimesheetSetupNotFound
	}
	return updated, nil
}

func (store *Store) DeleteTimesheetSetup(ctx context.Context, workspaceID int64, setupID int64) error {
	tag, err := store.pool.Exec(ctx, `
		update governance_timesheet_setups
		set deleted_at = now(),
			updated_at = now()
		where workspace_id = $1
			and id = $2
			and deleted_at is null
	`, workspaceID, setupID)
	if err != nil {
		return writeGovernanceError("delete timesheet setup", err)
	}
	if tag.RowsAffected() != 1 {
		return governanceapplication.ErrTimesheetSetupNotFound
	}
	return nil
}

func scanTimesheetSetup(row interface{ Scan(...any) error }) (governanceapplication.TimesheetSetupView, error) {
	var (
		view           governanceapplication.TimesheetSetupView
		approverUserID *int64
		approverName   *string
		approverIDsRaw []byte
		approverRaw    []byte
		endDate        *time.Time
	)
	if err := row.Scan(
		&view.ID,
		&view.WorkspaceID,
		&view.MemberUserID,
		&view.MemberName,
		&approverUserID,
		&approverName,
		&approverIDsRaw,
		&approverRaw,
		&view.Periodicity,
		&view.ReminderDay,
		&view.ReminderTime,
		&view.EmailReminderEnabled,
		&view.SlackReminderEnabled,
		&view.StartDate,
		&endDate,
		&view.CreatedAt,
		&view.UpdatedAt,
	); err != nil {
		return governanceapplication.TimesheetSetupView{}, writeGovernanceError("scan timesheet setup", err)
	}
	view.ApproverUserID = approverUserID
	view.ApproverName = approverName
	view.ApproverUserIDs = decodeInt64s(approverIDsRaw)
	view.ApproverLayers = decodeApproverLayers(approverRaw)
	if endDate != nil {
		value := endDate.UTC()
		view.EndDate = &value
	}
	return view, nil
}
