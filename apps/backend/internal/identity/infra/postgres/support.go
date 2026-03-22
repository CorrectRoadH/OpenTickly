package postgres

import (
	"context"
	"fmt"

	"opentoggl/backend/apps/backend/internal/identity/application"

	"github.com/jackc/pgx/v5/pgxpool"
)

type JobRecorder struct {
	pool *pgxpool.Pool
}

type RunningTimerLookup struct {
	pool *pgxpool.Pool
}

func NewJobRecorder(pool *pgxpool.Pool) *JobRecorder {
	return &JobRecorder{pool: pool}
}

func NewRunningTimerLookup(pool *pgxpool.Pool) *RunningTimerLookup {
	return &RunningTimerLookup{pool: pool}
}

func (recorder *JobRecorder) Record(ctx context.Context, job application.JobRecord) error {
	_, err := recorder.pool.Exec(ctx, `
		insert into identity_job_records (job_name, user_id)
		values ($1, $2)
	`, job.Name, job.UserID)
	if err != nil {
		return fmt.Errorf("record identity job %s for user %d: %w", job.Name, job.UserID, err)
	}
	return nil
}

func (recorder *JobRecorder) Recorded(ctx context.Context) ([]application.JobRecord, error) {
	rows, err := recorder.pool.Query(ctx, `
		select job_name, user_id
		from identity_job_records
		order by id
	`)
	if err != nil {
		return nil, fmt.Errorf("query identity job records: %w", err)
	}
	defer rows.Close()

	jobs := []application.JobRecord{}
	for rows.Next() {
		var job application.JobRecord
		if err := rows.Scan(&job.Name, &job.UserID); err != nil {
			return nil, fmt.Errorf("scan identity job record: %w", err)
		}
		jobs = append(jobs, job)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate identity job records: %w", err)
	}
	return jobs, nil
}

func (lookup *RunningTimerLookup) HasRunningTimer(ctx context.Context, userID int64) (bool, error) {
	var exists bool
	if err := lookup.pool.QueryRow(ctx, `
		select exists (
			select 1
			from tracking_running_timers
			where user_id = $1
		)
	`, userID).Scan(&exists); err != nil {
		return false, fmt.Errorf("query running timer for user %d: %w", userID, err)
	}
	return exists, nil
}

func (lookup *RunningTimerLookup) MarkRunning(ctx context.Context, userID int64) error {
	_, err := lookup.pool.Exec(ctx, `
		insert into tracking_running_timers (user_id)
		values ($1)
		on conflict (user_id) do nothing
	`, userID)
	if err != nil {
		return fmt.Errorf("mark running timer for user %d: %w", userID, err)
	}
	return nil
}
