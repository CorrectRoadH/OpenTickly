package postgres

import (
	"context"

	governanceapplication "opentoggl/backend/apps/backend/internal/governance/application"

	"github.com/samber/lo"
)

func (store *Store) ListAlerts(ctx context.Context, workspaceID int64) ([]governanceapplication.AlertView, error) {
	rows, err := store.pool.Query(ctx, `
		select
			a.id,
			a.workspace_id,
			a.project_id,
			p.name,
			p.client_id,
			c.name,
			a.receiver_roles,
			a.receiver_users,
			a.source_kind,
			a.threshold_type,
			a.thresholds
		from governance_alerts a
		left join catalog_projects p on p.id = a.project_id
		left join catalog_clients c on c.id = p.client_id
		where a.workspace_id = $1
		order by a.id
	`, workspaceID)
	if err != nil {
		return nil, writeGovernanceError("list alerts", err)
	}
	defer rows.Close()

	alerts := make([]governanceapplication.AlertView, 0)
	for rows.Next() {
		var (
			view          governanceapplication.AlertView
			projectID     *int64
			projectName   *string
			clientID      *int64
			clientName    *string
			rolesRaw      []byte
			usersRaw      []byte
			thresholdsRaw []byte
		)
		if err := rows.Scan(
			&view.ID,
			&view.WorkspaceID,
			&projectID,
			&projectName,
			&clientID,
			&clientName,
			&rolesRaw,
			&usersRaw,
			&view.SourceKind,
			&view.ThresholdType,
			&thresholdsRaw,
		); err != nil {
			return nil, writeGovernanceError("scan alert", err)
		}
		view.ProjectID = projectID
		view.ProjectName = projectName
		view.ClientID = clientID
		view.ClientName = clientName
		view.ReceiverRoles = decodeStrings(rolesRaw)
		view.ReceiverUsers = decodeInt64s(usersRaw)
		view.Thresholds = decodeInts(thresholdsRaw)
		names, lookupErr := store.lookupKnownUsers(ctx, view.ReceiverUsers)
		if lookupErr != nil {
			return nil, lookupErr
		}
		view.ReceiverUsersName = make([]string, 0, len(view.ReceiverUsers))
		for _, userID := range view.ReceiverUsers {
			view.ReceiverUsersName = append(view.ReceiverUsersName, names[userID])
		}
		alerts = append(alerts, view)
	}
	if err := rows.Err(); err != nil {
		return nil, writeGovernanceError("iterate alerts", err)
	}
	return alerts, nil
}

func (store *Store) SaveAlert(
	ctx context.Context,
	command governanceapplication.SaveAlertCommand,
) (governanceapplication.AlertView, error) {
	if command.AlertID == nil {
		row := store.pool.QueryRow(ctx, `
			insert into governance_alerts (
				workspace_id,
				project_id,
				receiver_roles,
				receiver_users,
				source_kind,
				threshold_type,
				thresholds
			) values ($1, $2, $3, $4, $5, $6, $7)
			returning id
		`,
			command.WorkspaceID,
			command.ProjectID,
			mustJSON(command.ReceiverRoles, "[]"),
			mustJSON(command.ReceiverUsers, "[]"),
			command.SourceKind,
			command.ThresholdType,
			mustJSON(command.Thresholds, "[]"),
		)
		var alertID int64
		if err := row.Scan(&alertID); err != nil {
			return governanceapplication.AlertView{}, writeGovernanceError("create alert", err)
		}
		command.AlertID = lo.ToPtr(alertID)
	} else {
		tag, err := store.pool.Exec(ctx, `
			update governance_alerts
			set project_id = $3,
				receiver_roles = $4,
				receiver_users = $5,
				source_kind = $6,
				threshold_type = $7,
				thresholds = $8,
				updated_at = now()
			where workspace_id = $1 and id = $2
		`,
			command.WorkspaceID,
			*command.AlertID,
			command.ProjectID,
			mustJSON(command.ReceiverRoles, "[]"),
			mustJSON(command.ReceiverUsers, "[]"),
			command.SourceKind,
			command.ThresholdType,
			mustJSON(command.Thresholds, "[]"),
		)
		if err != nil {
			return governanceapplication.AlertView{}, writeGovernanceError("update alert", err)
		}
		if tag.RowsAffected() != 1 {
			return governanceapplication.AlertView{}, governanceapplication.ErrAlertNotFound
		}
	}

	alerts, err := store.ListAlerts(ctx, command.WorkspaceID)
	if err != nil {
		return governanceapplication.AlertView{}, err
	}
	for _, alert := range alerts {
		if alert.ID == *command.AlertID {
			return alert, nil
		}
	}
	return governanceapplication.AlertView{}, governanceapplication.ErrAlertNotFound
}

func (store *Store) DeleteAlert(ctx context.Context, workspaceID int64, alertID int64) error {
	tag, err := store.pool.Exec(ctx, `
		delete from governance_alerts
		where workspace_id = $1 and id = $2
	`, workspaceID, alertID)
	if err != nil {
		return writeGovernanceError("delete alert", err)
	}
	if tag.RowsAffected() != 1 {
		return governanceapplication.ErrAlertNotFound
	}
	return nil
}
