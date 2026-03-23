package postgres

import (
	"context"
	"time"

	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"
	"opentoggl/backend/apps/backend/internal/xptr"
)

func (store *Store) GetProjectStatistics(
	ctx context.Context,
	workspaceID int64,
	projectID int64,
) (trackingapplication.ProjectStatisticsView, error) {
	var earliest *time.Time
	var latest *time.Time

	err := store.pool.QueryRow(
		ctx,
		`select min(start_time), max(start_time)
		from tracking_time_entries
		where workspace_id = $1 and project_id = $2 and deleted_at is null`,
		workspaceID,
		projectID,
	).Scan(&earliest, &latest)
	if err != nil {
		return trackingapplication.ProjectStatisticsView{}, writeTrackingError("get project statistics", err)
	}

	return trackingapplication.ProjectStatisticsView{
		EarliestTimeEntry: xptr.CloneUTC(earliest),
		LatestTimeEntry:   xptr.CloneUTC(latest),
	}, nil
}
