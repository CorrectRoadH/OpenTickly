package postgres

import (
	"fmt"
	"time"

	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"
	"opentoggl/backend/apps/backend/internal/xptr"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func writeTrackingError(operation string, err error) error {
	return fmt.Errorf("%s: %w", operation, err)
}

func coalesceInt64Slice(values []int64) []int64 {
	if values == nil {
		return []int64{}
	}
	return values
}

func coalesceStringSlice(values []string) []string {
	if values == nil {
		return []string{}
	}
	return values
}

func buildTimeEntryView(
	entry *trackingapplication.TimeEntryView,
	start time.Time,
	stop *time.Time,
	deletedAt *time.Time,
	createdAt time.Time,
	updatedAt time.Time,
	clientName *string,
	projectName *string,
	taskName *string,
	projectActive *bool,
	projectColor *string,
) {
	entry.Start = start.UTC()
	entry.Stop = xptr.CloneUTC(stop)
	entry.DeletedAt = xptr.CloneUTC(deletedAt)
	entry.CreatedAt = createdAt.UTC()
	entry.UpdatedAt = updatedAt.UTC()
	entry.ClientName = xptr.Clone(clientName)
	entry.ProjectName = xptr.Clone(projectName)
	entry.TaskName = xptr.Clone(taskName)
	entry.ProjectActive = xptr.Clone(projectActive)
	entry.ProjectColor = xptr.Clone(projectColor)
	entry.TagIDs = coalesceInt64Slice(entry.TagIDs)
	entry.TagNames = coalesceStringSlice(entry.TagNames)
	entry.ExpenseIDs = coalesceInt64Slice(entry.ExpenseIDs)
}
