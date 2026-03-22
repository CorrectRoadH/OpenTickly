package postgres

import (
	"fmt"
	"strings"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func projectOrderClause(filter catalogapplication.ListProjectsFilter) string {
	parts := make([]string, 0, 3)
	if filter.SortPinned {
		parts = append(parts, "p.pinned desc")
	}

	field := "lower(p.name)"
	if filter.SortField == catalogapplication.ProjectSortFieldCreatedAt {
		field = "p.created_at"
	}
	direction := string(filter.SortOrder)
	parts = append(parts, field+" "+direction, "p.id "+direction)
	return strings.Join(parts, ", ")
}

func taskOrderClause(filter catalogapplication.ListTasksFilter) string {
	field := "lower(t.name)"
	if filter.SortField == catalogapplication.TaskSortFieldCreatedAt {
		field = "t.created_at"
	}
	direction := string(filter.SortOrder)
	return field + " " + direction + ", t.id " + direction
}

func writeCatalogError(action string, err error) error {
	return fmt.Errorf("%s: %w", action, err)
}

func isConstraintViolation(err error) bool {
	var pgErr *pgconn.PgError
	return err != nil && pgErr != nil && (pgErr.Code == "23503" || pgErr.Code == "23505")
}

type scanner interface {
	Scan(...any) error
}

func scanProject(scanner scanner) (catalogapplication.ProjectView, error) {
	var project catalogapplication.ProjectView
	err := scanner.Scan(
		&project.ID,
		&project.WorkspaceID,
		&project.ClientID,
		&project.Name,
		&project.Active,
		&project.Pinned,
		&project.Template,
		&project.ActualSeconds,
		&project.Recurring,
		&project.PeriodStart,
		&project.PeriodEnd,
		&project.ClientName,
		&project.CreatedAt,
	)
	return project, err
}

func scanClient(scanner scanner) (catalogapplication.ClientView, error) {
	var client catalogapplication.ClientView
	err := scanner.Scan(
		&client.ID,
		&client.WorkspaceID,
		&client.Name,
		&client.Archived,
		&client.CreatedBy,
		&client.CreatedAt,
	)
	return client, err
}

func scanTag(scanner scanner) (catalogapplication.TagView, error) {
	var tag catalogapplication.TagView
	err := scanner.Scan(
		&tag.ID,
		&tag.WorkspaceID,
		&tag.Name,
		&tag.DeletedAt,
		&tag.CreatedBy,
		&tag.CreatedAt,
	)
	return tag, err
}

func scanTask(scanner scanner) (catalogapplication.TaskView, error) {
	var task catalogapplication.TaskView
	err := scanner.Scan(
		&task.ID,
		&task.WorkspaceID,
		&task.ProjectID,
		&task.Name,
		&task.Active,
		&task.ProjectName,
	)
	return task, err
}

func notFound(err error) bool {
	return err != nil && err == pgx.ErrNoRows
}

func boolValue(value *bool) bool {
	return value != nil && *value
}

func int64SliceOrNil(values []int64) []int64 {
	if len(values) == 0 {
		return nil
	}
	return values
}
