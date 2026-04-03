package postgres

import (
	"context"
	"fmt"
	"time"

	reportsapplication "opentoggl/backend/apps/backend/internal/reports/application"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ScheduledReportStore struct {
	pool *pgxpool.Pool
}

func NewScheduledReportStore(pool *pgxpool.Pool) *ScheduledReportStore {
	return &ScheduledReportStore{pool: pool}
}

func (store *ScheduledReportStore) List(ctx context.Context, workspaceID int64) ([]reportsapplication.ScheduledReportView, error) {
	rows, err := store.pool.Query(ctx,
		`SELECT id, workspace_id, report_id, frequency, creator_id, user_ids, group_ids, created_at
		 FROM scheduled_reports
		 WHERE workspace_id = $1 AND deleted_at IS NULL
		 ORDER BY created_at DESC`,
		workspaceID,
	)
	if err != nil {
		return nil, fmt.Errorf("list scheduled reports: %w", err)
	}
	defer rows.Close()

	var reports []reportsapplication.ScheduledReportView
	for rows.Next() {
		r, err := scanScheduledReport(rows)
		if err != nil {
			return nil, fmt.Errorf("list scheduled reports scan: %w", err)
		}
		reports = append(reports, r)
	}
	if reports == nil {
		reports = []reportsapplication.ScheduledReportView{}
	}
	return reports, rows.Err()
}

func (store *ScheduledReportStore) Create(ctx context.Context, cmd reportsapplication.CreateScheduledReportCommand) (reportsapplication.ScheduledReportView, error) {
	now := time.Now().UTC()
	userIDs := cmd.UserIDs
	if userIDs == nil {
		userIDs = []int64{}
	}
	groupIDs := cmd.GroupIDs
	if groupIDs == nil {
		groupIDs = []int64{}
	}
	var id int64
	err := store.pool.QueryRow(ctx,
		`INSERT INTO scheduled_reports (workspace_id, report_id, frequency, creator_id, user_ids, group_ids, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id`,
		cmd.WorkspaceID, cmd.ReportID, cmd.Frequency, cmd.CreatorID,
		userIDs, groupIDs, now,
	).Scan(&id)
	if err != nil {
		return reportsapplication.ScheduledReportView{}, fmt.Errorf("create scheduled report: %w", err)
	}
	return reportsapplication.ScheduledReportView{
		ID:          id,
		WorkspaceID: cmd.WorkspaceID,
		ReportID:    cmd.ReportID,
		Frequency:   cmd.Frequency,
		CreatorID:   cmd.CreatorID,
		UserIDs:     userIDs,
		GroupIDs:    groupIDs,
		CreatedAt:   now,
	}, nil
}

func (store *ScheduledReportStore) Delete(ctx context.Context, workspaceID, reportID int64) error {
	now := time.Now().UTC()
	tag, err := store.pool.Exec(ctx,
		`UPDATE scheduled_reports SET deleted_at = $1 WHERE id = $2 AND workspace_id = $3 AND deleted_at IS NULL`,
		now, reportID, workspaceID,
	)
	if err != nil {
		return fmt.Errorf("delete scheduled report: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("delete scheduled report: %w", pgx.ErrNoRows)
	}
	return nil
}

func scanScheduledReport(rows pgx.Rows) (reportsapplication.ScheduledReportView, error) {
	var r reportsapplication.ScheduledReportView
	err := rows.Scan(
		&r.ID, &r.WorkspaceID, &r.ReportID, &r.Frequency, &r.CreatorID,
		&r.UserIDs, &r.GroupIDs, &r.CreatedAt,
	)
	return r, err
}
