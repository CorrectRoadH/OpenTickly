package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	reportsapplication "opentoggl/backend/apps/backend/internal/reports/application"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SavedReportStore struct {
	pool *pgxpool.Pool
}

func NewSavedReportStore(pool *pgxpool.Pool) *SavedReportStore {
	return &SavedReportStore{pool: pool}
}

func (store *SavedReportStore) List(ctx context.Context, workspaceID int64) ([]reportsapplication.SavedReportView, error) {
	rows, err := store.pool.Query(ctx,
		`SELECT id, workspace_id, name, public, fixed_date_range, token, params,
		        created_by, created_at, updated_at
		 FROM saved_reports
		 WHERE workspace_id = $1 AND deleted_at IS NULL
		 ORDER BY created_at DESC`,
		workspaceID,
	)
	if err != nil {
		return nil, fmt.Errorf("list saved reports: %w", err)
	}
	defer rows.Close()

	var reports []reportsapplication.SavedReportView
	for rows.Next() {
		r, err := scanSavedReport(rows)
		if err != nil {
			return nil, fmt.Errorf("list saved reports scan: %w", err)
		}
		reports = append(reports, r)
	}
	if reports == nil {
		reports = []reportsapplication.SavedReportView{}
	}
	return reports, rows.Err()
}

func (store *SavedReportStore) Get(ctx context.Context, workspaceID, reportID int64) (reportsapplication.SavedReportView, error) {
	row := store.pool.QueryRow(ctx,
		`SELECT id, workspace_id, name, public, fixed_date_range, token, params,
		        created_by, created_at, updated_at
		 FROM saved_reports
		 WHERE workspace_id = $1 AND id = $2 AND deleted_at IS NULL`,
		workspaceID, reportID,
	)
	var r reportsapplication.SavedReportView
	err := row.Scan(
		&r.ID, &r.WorkspaceID, &r.Name, &r.Public, &r.FixedDateRange, &r.Token, &r.Params,
		&r.CreatedBy, &r.CreatedAt, &r.UpdatedAt,
	)
	if err != nil {
		return r, fmt.Errorf("get saved report: %w", err)
	}
	return r, nil
}

func (store *SavedReportStore) Create(ctx context.Context, cmd reportsapplication.CreateSavedReportCommand) (reportsapplication.SavedReportView, error) {
	params := cmd.Params
	if params == nil {
		params = json.RawMessage("{}")
	}
	now := time.Now().UTC()
	var id int64
	err := store.pool.QueryRow(ctx,
		`INSERT INTO saved_reports (workspace_id, name, public, fixed_date_range, params, created_by, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id`,
		cmd.WorkspaceID, cmd.Name, cmd.Public, cmd.FixedDateRange, params,
		cmd.CreatedBy, now, now,
	).Scan(&id)
	if err != nil {
		return reportsapplication.SavedReportView{}, fmt.Errorf("create saved report: %w", err)
	}
	return reportsapplication.SavedReportView{
		ID:             id,
		WorkspaceID:    cmd.WorkspaceID,
		Name:           cmd.Name,
		Public:         cmd.Public,
		FixedDateRange: cmd.FixedDateRange,
		Params:         params,
		CreatedBy:      cmd.CreatedBy,
		CreatedAt:      now,
		UpdatedAt:      now,
	}, nil
}

func (store *SavedReportStore) Update(ctx context.Context, cmd reportsapplication.UpdateSavedReportCommand) (reportsapplication.SavedReportView, error) {
	params := cmd.Params
	if params == nil {
		params = json.RawMessage("{}")
	}
	now := time.Now().UTC()
	tag, err := store.pool.Exec(ctx,
		`UPDATE saved_reports
		 SET name = $1, public = $2, fixed_date_range = $3, params = $4, updated_at = $5
		 WHERE id = $6 AND workspace_id = $7 AND deleted_at IS NULL`,
		cmd.Name, cmd.Public, cmd.FixedDateRange, params, now,
		cmd.ID, cmd.WorkspaceID,
	)
	if err != nil {
		return reportsapplication.SavedReportView{}, fmt.Errorf("update saved report: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return reportsapplication.SavedReportView{}, fmt.Errorf("update saved report: %w", pgx.ErrNoRows)
	}
	return store.Get(ctx, cmd.WorkspaceID, cmd.ID)
}

func (store *SavedReportStore) Delete(ctx context.Context, workspaceID, reportID int64) error {
	now := time.Now().UTC()
	tag, err := store.pool.Exec(ctx,
		`UPDATE saved_reports SET deleted_at = $1 WHERE id = $2 AND workspace_id = $3 AND deleted_at IS NULL`,
		now, reportID, workspaceID,
	)
	if err != nil {
		return fmt.Errorf("delete saved report: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("delete saved report: %w", pgx.ErrNoRows)
	}
	return nil
}

func (store *SavedReportStore) BulkDelete(ctx context.Context, workspaceID int64, reportIDs []int64) error {
	now := time.Now().UTC()
	_, err := store.pool.Exec(ctx,
		`UPDATE saved_reports SET deleted_at = $1 WHERE workspace_id = $2 AND id = ANY($3) AND deleted_at IS NULL`,
		now, workspaceID, reportIDs,
	)
	if err != nil {
		return fmt.Errorf("bulk delete saved reports: %w", err)
	}
	return nil
}

func scanSavedReport(rows pgx.Rows) (reportsapplication.SavedReportView, error) {
	var r reportsapplication.SavedReportView
	err := rows.Scan(
		&r.ID, &r.WorkspaceID, &r.Name, &r.Public, &r.FixedDateRange, &r.Token, &r.Params,
		&r.CreatedBy, &r.CreatedAt, &r.UpdatedAt,
	)
	return r, err
}
