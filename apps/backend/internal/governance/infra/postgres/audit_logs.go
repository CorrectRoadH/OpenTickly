package postgres

import (
	"context"
	"strconv"
	"strings"

	governanceapplication "opentoggl/backend/apps/backend/internal/governance/application"
)

func (store *Store) InsertAuditLog(
	ctx context.Context,
	command governanceapplication.InsertAuditLogCommand,
) error {
	_, err := store.pool.Exec(ctx,
		`insert into governance_audit_logs (
			organization_id, workspace_id, entity_type, entity_id,
			action, user_id, source, request_body, response_body
		) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		command.OrganizationID,
		command.WorkspaceID,
		command.EntityType,
		command.EntityID,
		command.Action,
		command.UserID,
		command.Source,
		command.RequestBody,
		command.ResponseBody,
	)
	if err != nil {
		return writeGovernanceError("insert audit log", err)
	}
	return nil
}

func (store *Store) ListAuditLogs(
	ctx context.Context,
	organizationID int64,
	filter governanceapplication.ListAuditLogsFilter,
) ([]governanceapplication.AuditLogView, error) {
	query := `
		select
			id,
			organization_id,
			workspace_id,
			entity_type,
			entity_id,
			action,
			user_id,
			source,
			request_body,
			response_body,
			created_at
		from governance_audit_logs
		where organization_id = $1
			and created_at >= $2
			and created_at <= $3
	`
	args := []any{organizationID, filter.From, filter.To}
	next := 4

	if filter.WorkspaceID != nil {
		query += " and workspace_id = $" + itoa(next)
		args = append(args, *filter.WorkspaceID)
		next++
	}
	if filter.EntityType != "" {
		query += " and entity_type = $" + itoa(next)
		args = append(args, filter.EntityType)
		next++
	}
	if filter.EntityID != nil {
		query += " and entity_id = $" + itoa(next)
		args = append(args, *filter.EntityID)
		next++
	}
	if filter.Action != "" {
		query += " and action = $" + itoa(next)
		args = append(args, filter.Action)
		next++
	}
	if filter.UserID != nil {
		query += " and user_id = $" + itoa(next)
		args = append(args, *filter.UserID)
		next++
	}
	if filter.Source != "" {
		query += " and source = $" + itoa(next)
		args = append(args, filter.Source)
		next++
	}

	query += " order by created_at desc, id desc"
	if !filter.Export {
		query += " limit $" + itoa(next) + " offset $" + itoa(next+1)
		args = append(args, filter.PageSize, (filter.PageNumber-1)*filter.PageSize)
	}

	rows, err := store.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, writeGovernanceError("list audit logs", err)
	}
	defer rows.Close()

	logs := make([]governanceapplication.AuditLogView, 0)
	for rows.Next() {
		var view governanceapplication.AuditLogView
		if err := rows.Scan(
			&view.ID,
			&view.OrganizationID,
			&view.WorkspaceID,
			&view.EntityType,
			&view.EntityID,
			&view.Action,
			&view.UserID,
			&view.Source,
			&view.RequestBody,
			&view.ResponseBody,
			&view.CreatedAt,
		); err != nil {
			return nil, writeGovernanceError("scan audit log", err)
		}
		view.EntityType = strings.TrimSpace(view.EntityType)
		view.Action = strings.TrimSpace(view.Action)
		view.Source = strings.TrimSpace(view.Source)
		logs = append(logs, view)
	}
	return logs, rows.Err()
}

func itoa(value int) string {
	return strconv.Itoa(value)
}
