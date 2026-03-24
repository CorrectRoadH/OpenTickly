package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	importingapplication "opentoggl/backend/apps/backend/internal/importing/application"

	"github.com/jackc/pgx/v5"
)

type importedTimeEntryRecord struct {
	Billable    bool
	ClientID    *int64
	Description string
	Duration    int
	ProjectID   *int64
	Start       time.Time
	Stop        *time.Time
	TagIDs      []int64
	TaskID      *int64
	UserID      int64
	WorkspaceID int64
}

type timeEntryImporter struct {
	requestedBy int64
	tx          pgx.Tx
	workspaceID int64
}

func (store *Store) ImportTimeEntries(
	ctx context.Context,
	command importingapplication.ImportTimeEntriesCommand,
) error {
	tx, err := store.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin time entry import transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	importer := timeEntryImporter{
		requestedBy: command.RequestedBy,
		tx:          tx,
		workspaceID: command.WorkspaceID,
	}
	for _, entry := range command.Entries.Items {
		record, err := importer.resolveTimeEntry(ctx, entry)
		if err != nil {
			return err
		}
		if err := importer.insertTimeEntry(ctx, record); err != nil {
			return err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit time entry import transaction: %w", err)
	}
	return nil
}

func (importer *timeEntryImporter) resolveTimeEntry(
	ctx context.Context,
	entry importingapplication.ImportedTimeEntry,
) (importedTimeEntryRecord, error) {
	userID, timezone, err := importer.resolveUser(ctx, entry.Email)
	if err != nil {
		return importedTimeEntryRecord{}, err
	}
	start, err := parseImportedClockTime(entry.Start.Value, timezone)
	if err != nil {
		return importedTimeEntryRecord{}, err
	}
	stop, err := parseOptionalImportedClockTime(entry.End, timezone)
	if err != nil {
		return importedTimeEntryRecord{}, err
	}

	clientID, err := importer.resolveClient(ctx, entry.ClientName)
	if err != nil {
		return importedTimeEntryRecord{}, err
	}
	projectID, err := importer.resolveProject(ctx, entry.ProjectName, clientID)
	if err != nil {
		return importedTimeEntryRecord{}, err
	}
	taskID, err := importer.resolveTask(ctx, projectID, entry.TaskName)
	if err != nil {
		return importedTimeEntryRecord{}, err
	}
	tagIDs, err := importer.resolveTags(ctx, entry.TagNames)
	if err != nil {
		return importedTimeEntryRecord{}, err
	}

	return importedTimeEntryRecord{
		Billable:    entry.Billable,
		ClientID:    clientID,
		Description: strings.TrimSpace(entry.Description),
		Duration:    entry.Duration,
		ProjectID:   projectID,
		Start:       start,
		Stop:        stop,
		TagIDs:      tagIDs,
		TaskID:      taskID,
		UserID:      userID,
		WorkspaceID: importer.workspaceID,
	}, nil
}

func (importer *timeEntryImporter) resolveUser(ctx context.Context, email string) (int64, string, error) {
	var userID int64
	var timezone string
	err := importer.tx.QueryRow(ctx, `
		select u.id, u.timezone
		from identity_users u
		join membership_workspace_members m on m.user_id = u.id
		where m.workspace_id = $1 and lower(u.email) = lower($2)
	`, importer.workspaceID, strings.TrimSpace(email)).Scan(&userID, &timezone)
	if err != nil {
		return 0, "", fmt.Errorf("resolve time entry user %q: %w", email, err)
	}
	return userID, timezone, nil
}

func (importer *timeEntryImporter) resolveClient(ctx context.Context, clientName string) (*int64, error) {
	normalized := strings.TrimSpace(clientName)
	if normalized == "" {
		return nil, nil
	}
	var clientID int64
	err := importer.tx.QueryRow(ctx, `
		select id
		from catalog_clients
		where workspace_id = $1 and lower(name) = lower($2)
	`, importer.workspaceID, normalized).Scan(&clientID)
	switch {
	case err == nil:
		return &clientID, nil
	case errors.Is(err, pgx.ErrNoRows):
		err = importer.tx.QueryRow(ctx, `
			insert into catalog_clients (workspace_id, name, created_by)
			values ($1, $2, $3)
			returning id
		`, importer.workspaceID, normalized, importer.requestedBy).Scan(&clientID)
		if err != nil {
			return nil, fmt.Errorf("create csv client %q: %w", normalized, err)
		}
		return &clientID, nil
	default:
		return nil, fmt.Errorf("resolve csv client %q: %w", normalized, err)
	}
}

func (importer *timeEntryImporter) resolveProject(
	ctx context.Context,
	projectName string,
	clientID *int64,
) (*int64, error) {
	normalized := strings.TrimSpace(projectName)
	if normalized == "" {
		return nil, nil
	}
	var projectID int64
	err := importer.tx.QueryRow(ctx, `
		select id
		from catalog_projects
		where workspace_id = $1 and lower(name) = lower($2)
	`, importer.workspaceID, normalized).Scan(&projectID)
	switch {
	case err == nil:
		return &projectID, nil
	case errors.Is(err, pgx.ErrNoRows):
		err = importer.tx.QueryRow(ctx, `
			insert into catalog_projects (workspace_id, client_id, name, active, template, recurring, created_by)
			values ($1, $2, $3, true, false, false, $4)
			returning id
		`, importer.workspaceID, clientID, normalized, importer.requestedBy).Scan(&projectID)
		if err != nil {
			return nil, fmt.Errorf("create csv project %q: %w", normalized, err)
		}
		return &projectID, nil
	default:
		return nil, fmt.Errorf("resolve csv project %q: %w", normalized, err)
	}
}

func (importer *timeEntryImporter) resolveTask(
	ctx context.Context,
	projectID *int64,
	taskName string,
) (*int64, error) {
	normalized := strings.TrimSpace(taskName)
	if normalized == "" {
		return nil, nil
	}
	if projectID == nil {
		return nil, fmt.Errorf("resolve csv task %q: project is required", normalized)
	}

	var taskID int64
	err := importer.tx.QueryRow(ctx, `
		select id
		from catalog_tasks
		where workspace_id = $1 and project_id = $2 and lower(name) = lower($3)
	`, importer.workspaceID, *projectID, normalized).Scan(&taskID)
	switch {
	case err == nil:
		return &taskID, nil
	case errors.Is(err, pgx.ErrNoRows):
		err = importer.tx.QueryRow(ctx, `
			insert into catalog_tasks (workspace_id, project_id, name, active, created_by)
			values ($1, $2, $3, true, $4)
			returning id
		`, importer.workspaceID, *projectID, normalized, importer.requestedBy).Scan(&taskID)
		if err != nil {
			return nil, fmt.Errorf("create csv task %q: %w", normalized, err)
		}
		return &taskID, nil
	default:
		return nil, fmt.Errorf("resolve csv task %q: %w", normalized, err)
	}
}

func (importer *timeEntryImporter) resolveTags(ctx context.Context, tagNames []string) ([]int64, error) {
	tagIDs := make([]int64, 0, len(tagNames))
	for _, tagName := range tagNames {
		normalized := strings.TrimSpace(tagName)
		if normalized == "" {
			continue
		}
		var tagID int64
		err := importer.tx.QueryRow(ctx, `
			select id
			from catalog_tags
			where workspace_id = $1 and lower(name) = lower($2)
		`, importer.workspaceID, normalized).Scan(&tagID)
		switch {
		case err == nil:
			tagIDs = append(tagIDs, tagID)
		case errors.Is(err, pgx.ErrNoRows):
			err = importer.tx.QueryRow(ctx, `
				insert into catalog_tags (workspace_id, name, created_by)
				values ($1, $2, $3)
				returning id
			`, importer.workspaceID, normalized, importer.requestedBy).Scan(&tagID)
			if err != nil {
				return nil, fmt.Errorf("create csv tag %q: %w", normalized, err)
			}
			tagIDs = append(tagIDs, tagID)
		default:
			return nil, fmt.Errorf("resolve csv tag %q: %w", normalized, err)
		}
	}
	return tagIDs, nil
}

func (importer *timeEntryImporter) insertTimeEntry(ctx context.Context, record importedTimeEntryRecord) error {
	tagIDs, err := json.Marshal(record.TagIDs)
	if err != nil {
		return fmt.Errorf("marshal time entry tags: %w", err)
	}
	_, err = importer.tx.Exec(ctx, `
		insert into tracking_time_entries (
			workspace_id,
			user_id,
			client_id,
			project_id,
			task_id,
			description,
			billable,
			start_time,
			stop_time,
			duration_seconds,
			created_with,
			tag_ids,
			expense_ids
		) values (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11, $12::jsonb, '[]'::jsonb
		)
	`, record.WorkspaceID, record.UserID, record.ClientID, record.ProjectID, record.TaskID, record.Description, record.Billable, record.Start.UTC(), record.Stop, record.Duration, importingapplication.ImportSourceTimeEntriesCSV, string(tagIDs))
	if err != nil {
		return fmt.Errorf("insert time entry %q: %w", record.Description, err)
	}
	return nil
}

func parseImportedClockTime(value string, timezone string) (time.Time, error) {
	location, err := time.LoadLocation(strings.TrimSpace(timezone))
	if err != nil || strings.TrimSpace(timezone) == "" {
		location = time.UTC
	}
	parsed, err := time.ParseInLocation("2006-01-02 15:04:05", strings.TrimSpace(value), location)
	if err != nil {
		return time.Time{}, fmt.Errorf("parse imported time %q: %w", value, err)
	}
	return parsed.UTC(), nil
}

func parseOptionalImportedClockTime(value *importingapplication.ImportedTime, timezone string) (*time.Time, error) {
	if value == nil {
		return nil, nil
	}
	parsed, err := parseImportedClockTime(value.Value, timezone)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}
