package postgres

import (
	"context"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
)

func (store *Store) CreateClient(
	ctx context.Context,
	command catalogapplication.CreateClientCommand,
) (catalogapplication.ClientView, error) {
	var client catalogapplication.ClientView
	err := store.pool.QueryRow(
		ctx,
		`insert into catalog_clients (workspace_id, name, created_by)
		values ($1, $2, $3)
		returning id, workspace_id, name, archived, created_by, created_at`,
		command.WorkspaceID,
		command.Name,
		command.CreatedBy,
	).Scan(&client.ID, &client.WorkspaceID, &client.Name, &client.Archived, &client.CreatedBy, &client.CreatedAt)
	if err != nil {
		return catalogapplication.ClientView{}, writeCatalogError("create catalog client", err)
	}
	return client, nil
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
	var tag catalogapplication.TagView
	err := store.pool.QueryRow(
		ctx,
		`insert into catalog_tags (workspace_id, name, created_by)
		values ($1, $2, $3)
		returning id, workspace_id, name, deleted_at, created_by, created_at`,
		command.WorkspaceID,
		command.Name,
		command.CreatedBy,
	).Scan(&tag.ID, &tag.WorkspaceID, &tag.Name, &tag.DeletedAt, &tag.CreatedBy, &tag.CreatedAt)
	if err != nil {
		return catalogapplication.TagView{}, writeCatalogError("create catalog tag", err)
	}
	return tag, nil
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
