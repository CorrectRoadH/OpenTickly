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

func NewJobRecorder(pool *pgxpool.Pool) *JobRecorder {
	return &JobRecorder{pool: pool}
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
