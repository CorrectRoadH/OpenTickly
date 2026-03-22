package postgres

import (
	"context"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
)

func (store *Store) CreateClient(
	ctx context.Context,
	command catalogapplication.CreateClientCommand,
) (catalogapplication.ClientView, error) {
	row := store.pool.QueryRow(
		ctx,
		`insert into catalog_clients (workspace_id, name, created_by)
		values ($1, $2, $3)
		returning id, workspace_id, name, archived, created_by, created_at`,
		command.WorkspaceID,
		command.Name,
		command.CreatedBy,
	)
	client, scanErr := scanClient(row)
	if scanErr != nil {
		return catalogapplication.ClientView{}, writeCatalogError("create catalog client", scanErr)
	}
	return client, nil
}

func (store *Store) UpdateClient(ctx context.Context, client catalogapplication.ClientView) error {
	_, err := store.pool.Exec(
		ctx,
		`update catalog_clients
		set name = $3, archived = $4
		where workspace_id = $1 and id = $2`,
		client.WorkspaceID,
		client.ID,
		client.Name,
		client.Archived,
	)
	if err != nil {
		return writeCatalogError("update catalog client", err)
	}
	return nil
}

func (store *Store) CreateGroup(
	ctx context.Context,
	command catalogapplication.CreateGroupCommand,
) (catalogapplication.GroupView, error) {
	var group catalogapplication.GroupView
	err := store.pool.QueryRow(
		ctx,
		`insert into catalog_groups (workspace_id, name, created_by)
		values ($1, $2, $3)
		returning id, workspace_id, name, has_users, created_at`,
		command.WorkspaceID,
		command.Name,
		command.CreatedBy,
	).Scan(&group.ID, &group.WorkspaceID, &group.Name, &group.HasUsers, &group.CreatedAt)
	if err != nil {
		return catalogapplication.GroupView{}, writeCatalogError("create catalog group", err)
	}
	return group, nil
}

func (store *Store) CreateTag(
	ctx context.Context,
	command catalogapplication.CreateTagCommand,
) (catalogapplication.TagView, error) {
	row := store.pool.QueryRow(
		ctx,
		`insert into catalog_tags (workspace_id, name, created_by)
		values ($1, $2, $3)
		returning id, workspace_id, name, deleted_at, created_by, created_at`,
		command.WorkspaceID,
		command.Name,
		command.CreatedBy,
	)
	tag, scanErr := scanTag(row)
	if scanErr != nil {
		return catalogapplication.TagView{}, writeCatalogError("create catalog tag", scanErr)
	}
	return tag, nil
}

func (store *Store) UpdateTag(ctx context.Context, tag catalogapplication.TagView) error {
	_, err := store.pool.Exec(
		ctx,
		`update catalog_tags
		set name = $3
		where workspace_id = $1 and id = $2`,
		tag.WorkspaceID,
		tag.ID,
		tag.Name,
	)
	if err != nil {
		return writeCatalogError("update catalog tag", err)
	}
	return nil
}

func (store *Store) DeleteTag(ctx context.Context, workspaceID int64, tagID int64) error {
	_, err := store.pool.Exec(
		ctx,
		"delete from catalog_tags where workspace_id = $1 and id = $2",
		workspaceID,
		tagID,
	)
	if err != nil {
		return writeCatalogError("delete catalog tag", err)
	}
	return nil
}

func (store *Store) CreateProject(
	ctx context.Context,
	command catalogapplication.CreateProjectCommand,
) (catalogapplication.ProjectView, error) {
	var projectID int64
	err := store.pool.QueryRow(
		ctx,
		`insert into catalog_projects (workspace_id, client_id, name, active, template, recurring, created_by)
		values ($1, $2, $3, $4, $5, $6, $7)
		returning id`,
		command.WorkspaceID,
		command.ClientID,
		command.Name,
		boolValue(command.Active),
		boolValue(command.Template),
		boolValue(command.Recurring),
		command.CreatedBy,
	).Scan(&projectID)
	if err != nil {
		return catalogapplication.ProjectView{}, writeCatalogError("create catalog project", err)
	}
	project, _, err := store.GetProject(ctx, command.WorkspaceID, projectID)
	return project, err
}

func (store *Store) UpdateProject(ctx context.Context, project catalogapplication.ProjectView) error {
	_, err := store.pool.Exec(
		ctx,
		`update catalog_projects
		set client_id = $3, name = $4, active = $5, template = $6, recurring = $7
		where workspace_id = $1 and id = $2`,
		project.WorkspaceID,
		project.ID,
		project.ClientID,
		project.Name,
		project.Active,
		project.Template,
		project.Recurring,
	)
	if err != nil {
		return writeCatalogError("update catalog project", err)
	}
	return nil
}

func (store *Store) SetProjectPinned(ctx context.Context, workspaceID int64, projectID int64, pinned bool) error {
	_, err := store.pool.Exec(
		ctx,
		"update catalog_projects set pinned = $3 where workspace_id = $1 and id = $2",
		workspaceID,
		projectID,
		pinned,
	)
	if err != nil {
		return writeCatalogError("pin catalog project", err)
	}
	return nil
}

func (store *Store) CreateTask(
	ctx context.Context,
	command catalogapplication.CreateTaskCommand,
) (catalogapplication.TaskView, error) {
	row := store.pool.QueryRow(
		ctx,
		`insert into catalog_tasks (workspace_id, project_id, name, active, created_by)
		values ($1, $2, $3, $4, $5)
		returning id, workspace_id, project_id, name, active`,
		command.WorkspaceID,
		command.ProjectID,
		command.Name,
		boolValue(command.Active),
		command.CreatedBy,
	)

	var task catalogapplication.TaskView
	if err := row.Scan(&task.ID, &task.WorkspaceID, &task.ProjectID, &task.Name, &task.Active); err != nil {
		return catalogapplication.TaskView{}, writeCatalogError("create catalog task", err)
	}
	return task, nil
}

func (store *Store) UpdateTask(ctx context.Context, task catalogapplication.TaskView) error {
	_, err := store.pool.Exec(
		ctx,
		`update catalog_tasks
		set name = $3, active = $4
		where workspace_id = $1 and id = $2`,
		task.WorkspaceID,
		task.ID,
		task.Name,
		task.Active,
	)
	if err != nil {
		return writeCatalogError("update catalog task", err)
	}
	return nil
}

func (store *Store) DeleteTask(ctx context.Context, workspaceID int64, taskID int64) error {
	_, err := store.pool.Exec(
		ctx,
		"delete from catalog_tasks where workspace_id = $1 and id = $2",
		workspaceID,
		taskID,
	)
	if err != nil {
		return writeCatalogError("delete catalog task", err)
	}
	return nil
}
