package postgres

import (
	"context"

	governanceapplication "opentoggl/backend/apps/backend/internal/governance/application"
)

func (store *Store) GetTimeEntryConstraints(
	ctx context.Context,
	workspaceID int64,
) (governanceapplication.TimeEntryConstraintsView, error) {
	row := store.pool.QueryRow(ctx, `
		select required_time_entry_fields
		from tenant_workspaces
		where id = $1
	`, workspaceID)

	var raw []byte
	if err := row.Scan(&raw); err != nil {
		return governanceapplication.TimeEntryConstraintsView{}, writeGovernanceError("get time entry constraints", err)
	}
	required := decodeStrings(raw)
	view := governanceapplication.TimeEntryConstraintsView{
		WorkspaceID: workspaceID,
	}
	for _, field := range required {
		switch field {
		case "description":
			view.DescriptionPresent = true
		case "project":
			view.ProjectPresent = true
		case "tag":
			view.TagPresent = true
		case "task":
			view.TaskPresent = true
		}
	}
	view.TimeEntryConstraintsEnabled = view.DescriptionPresent || view.ProjectPresent || view.TagPresent || view.TaskPresent
	return view, nil
}

func (store *Store) SaveTimeEntryConstraints(
	ctx context.Context,
	view governanceapplication.TimeEntryConstraintsView,
) error {
	required := make([]string, 0, 4)
	if view.DescriptionPresent {
		required = append(required, "description")
	}
	if view.ProjectPresent {
		required = append(required, "project")
	}
	if view.TagPresent {
		required = append(required, "tag")
	}
	if view.TaskPresent {
		required = append(required, "task")
	}
	if _, err := store.pool.Exec(ctx, `
		update tenant_workspaces
		set required_time_entry_fields = $2
		where id = $1
	`, view.WorkspaceID, mustJSON(required, "[]")); err != nil {
		return writeGovernanceError("save time entry constraints", err)
	}
	return nil
}
