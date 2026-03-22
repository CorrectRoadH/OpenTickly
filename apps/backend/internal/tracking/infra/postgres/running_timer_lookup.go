package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type RunningTimerLookup struct {
	pool *pgxpool.Pool
}

func NewRunningTimerLookup(pool *pgxpool.Pool) *RunningTimerLookup {
	return &RunningTimerLookup{pool: pool}
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
