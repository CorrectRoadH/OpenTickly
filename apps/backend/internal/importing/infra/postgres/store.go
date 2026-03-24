package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	importingapplication "opentoggl/backend/apps/backend/internal/importing/application"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (store *Store) ListExports(
	ctx context.Context,
	scope importingapplication.ExportScope,
	scopeID int64,
) ([]importingapplication.ExportRecordView, error) {
	rows, err := store.pool.Query(ctx, `
		select token, state, error_message
		from importing_exports
		where scope = $1 and scope_id = $2
		order by created_at desc, id desc
	`, string(scope), scopeID)
	if err != nil {
		return nil, fmt.Errorf("list importing exports: %w", err)
	}
	defer rows.Close()

	records := make([]importingapplication.ExportRecordView, 0)
	for rows.Next() {
		var record importingapplication.ExportRecordView
		if err := rows.Scan(&record.Token, &record.State, &record.ErrorMessage); err != nil {
			return nil, fmt.Errorf("scan importing export: %w", err)
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate importing exports: %w", err)
	}
	return records, nil
}

func (store *Store) SaveExport(
	ctx context.Context,
	command importingapplication.SaveExportCommand,
) (importingapplication.ExportRecordView, error) {
	objects, err := json.Marshal(command.Objects)
	if err != nil {
		return importingapplication.ExportRecordView{}, fmt.Errorf("marshal selected objects: %w", err)
	}

	var record importingapplication.ExportRecordView
	err = store.pool.QueryRow(ctx, `
		insert into importing_exports (
			scope,
			scope_id,
			requested_by,
			token,
			state,
			error_message,
			selected_objects,
			archive_content
		) values ($1, $2, $3, $4, $5, '', $6, $7)
		returning token, state, error_message
	`,
		string(command.Scope),
		command.ScopeID,
		command.RequestedBy,
		command.Token,
		importingapplication.ExportStateCompleted,
		objects,
		command.Content,
	).Scan(&record.Token, &record.State, &record.ErrorMessage)
	if err != nil {
		return importingapplication.ExportRecordView{}, fmt.Errorf("save importing export: %w", err)
	}
	return record, nil
}

func (store *Store) GetExportArchive(
	ctx context.Context,
	scope importingapplication.ExportScope,
	scopeID int64,
	token string,
) (importingapplication.ExportArchiveView, bool, error) {
	var content []byte
	err := store.pool.QueryRow(ctx, `
		select archive_content
		from importing_exports
		where scope = $1 and scope_id = $2 and token = $3
	`, string(scope), scopeID, token).Scan(&content)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return importingapplication.ExportArchiveView{}, false, nil
		}
		return importingapplication.ExportArchiveView{}, false, fmt.Errorf("get importing export archive: %w", err)
	}
	return importingapplication.ExportArchiveView{
		Token:    token,
		Filename: token + ".zip",
		Content:  content,
	}, true, nil
}

func (store *Store) SaveImportJob(
	ctx context.Context,
	command importingapplication.SaveImportJobCommand,
) (importingapplication.ImportJobView, error) {
	selectedObjects, err := json.Marshal([]string{command.Source})
	if err != nil {
		return importingapplication.ImportJobView{}, fmt.Errorf("marshal import source: %w", err)
	}

	var record importingapplication.ImportJobView
	err = store.pool.QueryRow(ctx, `
		insert into importing_exports (
			scope,
			scope_id,
			requested_by,
			token,
			state,
			error_message,
			selected_objects,
			archive_content
		) values ($1, $2, $3, $4, $5, '', $6, $7)
		returning token, state, scope_id
	`,
		string(importingapplication.ExportScopeWorkspace),
		command.WorkspaceID,
		command.RequestedBy,
		command.JobID,
		command.Status,
		selectedObjects,
		command.ArchiveContent,
	).Scan(&record.JobID, &record.Status, &record.WorkspaceID)
	if err != nil {
		return importingapplication.ImportJobView{}, fmt.Errorf("save importing job: %w", err)
	}
	return record, nil
}

func (store *Store) GetImportJob(
	ctx context.Context,
	jobID string,
) (importingapplication.ImportJobView, bool, error) {
	var record importingapplication.ImportJobView
	err := store.pool.QueryRow(ctx, `
		select token, state, scope_id
		from importing_exports
		where scope = $1 and token = $2
	`, string(importingapplication.ExportScopeWorkspace), jobID).Scan(&record.JobID, &record.Status, &record.WorkspaceID)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return importingapplication.ImportJobView{}, false, nil
		}
		return importingapplication.ImportJobView{}, false, fmt.Errorf("get importing job: %w", err)
	}
	return record, true, nil
}
