package postgres

import (
	"encoding/json"
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
	tagNames *[]byte,
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
		tagNames,
	}
}

func unmarshalStringJSON(raw []byte) []string {
	if len(raw) == 0 {
		return []string{}
	}
	var values []string
	if err := json.Unmarshal(raw, &values); err != nil {
		return []string{}
	}
	return values
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
	tagNames []byte,
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
		Stop:          xptr.CloneUTC(stop),
		Duration:      duration,
		CreatedWith:   createdWith,
		TagIDs:        unmarshalInt64JSON(tagIDs),
		TagNames:      unmarshalStringJSON(tagNames),
		ExpenseIDs:    unmarshalInt64JSON(expenseIDs),
		DeletedAt:     xptr.CloneUTC(deletedAt),
		CreatedAt:     createdAt.UTC(),
		UpdatedAt:     updatedAt.UTC(),
		ClientName:    xptr.Clone(clientName),
		ProjectName:   xptr.Clone(projectName),
		TaskName:      xptr.Clone(taskName),
		ProjectActive: xptr.Clone(projectActive),
	}
}
