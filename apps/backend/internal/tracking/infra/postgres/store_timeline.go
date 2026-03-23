package postgres

import (
	"context"

	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"
)

func (store *Store) ListTimelineEvents(
	ctx context.Context,
	userID int64,
	startTimestamp int,
	endTimestamp int,
) ([]trackingapplication.TimelineEventView, error) {
	rows, err := store.pool.Query(ctx, `
		select id, user_id, desktop_id, filename, title, start_time, end_time, idle
		from tracking_timeline_events
		where user_id = $1
			and ($2 = 0 or end_time >= $2)
			and ($3 = 0 or start_time <= $3)
		order by start_time, id
	`, userID, startTimestamp, endTimestamp)
	if err != nil {
		return nil, writeTrackingError("list timeline events", err)
	}
	defer rows.Close()

	events := make([]trackingapplication.TimelineEventView, 0)
	for rows.Next() {
		var event trackingapplication.TimelineEventView
		if err := rows.Scan(
			&event.ID,
			&event.UserID,
			&event.DesktopID,
			&event.Filename,
			&event.Title,
			&event.StartTime,
			&event.EndTime,
			&event.Idle,
		); err != nil {
			return nil, writeTrackingError("scan timeline event", err)
		}
		events = append(events, event)
	}
	if err := rows.Err(); err != nil {
		return nil, writeTrackingError("iterate timeline events", err)
	}
	return events, nil
}

func (store *Store) ReplaceTimelineEvents(
	ctx context.Context,
	userID int64,
	events []trackingapplication.TimelineEventView,
) error {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return writeTrackingError("begin replace timeline events", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `delete from tracking_timeline_events where user_id = $1`, userID); err != nil {
		return writeTrackingError("clear timeline events", err)
	}

	for _, event := range events {
		if _, err := tx.Exec(ctx, `
			insert into tracking_timeline_events (
				user_id,
				desktop_id,
				filename,
				title,
				start_time,
				end_time,
				idle
			) values ($1, $2, $3, $4, $5, $6, $7)
		`,
			userID,
			event.DesktopID,
			event.Filename,
			event.Title,
			event.StartTime,
			event.EndTime,
			event.Idle,
		); err != nil {
			return writeTrackingError("insert timeline event", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return writeTrackingError("commit timeline events", err)
	}
	return nil
}

func (store *Store) DeleteTimelineEvents(ctx context.Context, userID int64) error {
	if _, err := store.pool.Exec(ctx, `delete from tracking_timeline_events where user_id = $1`, userID); err != nil {
		return writeTrackingError("delete timeline events", err)
	}
	return nil
}
