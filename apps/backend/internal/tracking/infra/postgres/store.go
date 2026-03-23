package postgres

import (
	"encoding/json"
	"fmt"
	"time"

	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"

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

func marshalInt64JSON(values []int64) []byte {
	if len(values) == 0 {
		return []byte("[]")
	}
	encoded, err := json.Marshal(values)
	if err != nil {
		return []byte("[]")
	}
	return encoded
}

func unmarshalInt64JSON(raw []byte) []int64 {
	if len(raw) == 0 {
		return []int64{}
	}
	var values []int64
	if err := json.Unmarshal(raw, &values); err != nil {
		return []int64{}
	}
	return values
}

func timePtr(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	cloned := value.UTC()
	return &cloned
}

func stringPtr(value *string) *string {
	if value == nil {
		return nil
	}
	cloned := *value
	return &cloned
}

func boolPtr(value *bool) *bool {
	if value == nil {
		return nil
	}
	cloned := *value
	return &cloned
}

func scanTimeEntryFields(
	id *int64,
	workspaceID *int64,
	userID *int64,
	clientID **int64,
	projectID **int64,
	taskID **int64,
	description *string,
	billable *bool,
	start *time.Time,
	stop **time.Time,
	duration *int,
	createdWith *string,
	tagIDs *[]byte,
	expenseIDs *[]byte,
	deletedAt **time.Time,
	createdAt *time.Time,
	updatedAt *time.Time,
	clientName **string,
	projectName **string,
	taskName **string,
	projectActive **bool,
) []any {
	return []any{
		id,
		workspaceID,
		userID,
		clientID,
		projectID,
		taskID,
		description,
		billable,
		start,
		stop,
		duration,
		createdWith,
		tagIDs,
		expenseIDs,
		deletedAt,
		createdAt,
		updatedAt,
		clientName,
		projectName,
		taskName,
		projectActive,
	}
}

func buildTimeEntryView(
	id int64,
	workspaceID int64,
	userID int64,
	clientID *int64,
	projectID *int64,
	taskID *int64,
	description string,
	billable bool,
	start time.Time,
	stop *time.Time,
	duration int,
	createdWith string,
	tagIDs []byte,
	expenseIDs []byte,
	deletedAt *time.Time,
	createdAt time.Time,
	updatedAt time.Time,
	clientName *string,
	projectName *string,
	taskName *string,
	projectActive *bool,
) trackingapplication.TimeEntryView {
	return trackingapplication.TimeEntryView{
		ID:            id,
		WorkspaceID:   workspaceID,
		UserID:        userID,
		ClientID:      clientID,
		ProjectID:     projectID,
		TaskID:        taskID,
		Description:   description,
		Billable:      billable,
		Start:         start.UTC(),
		Stop:          timePtr(stop),
		Duration:      duration,
		CreatedWith:   createdWith,
		TagIDs:        unmarshalInt64JSON(tagIDs),
		ExpenseIDs:    unmarshalInt64JSON(expenseIDs),
		DeletedAt:     timePtr(deletedAt),
		CreatedAt:     createdAt.UTC(),
		UpdatedAt:     updatedAt.UTC(),
		ClientName:    stringPtr(clientName),
		ProjectName:   stringPtr(projectName),
		TaskName:      stringPtr(taskName),
		ProjectActive: boolPtr(projectActive),
	}
}
