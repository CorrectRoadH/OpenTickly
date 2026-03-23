package postgres

import (
	"context"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
)

func (store *Store) ListProjectGroups(
	ctx context.Context,
	workspaceID int64,
	projectIDs []int64,
) ([]catalogapplication.ProjectGroupView, error) {
	rows, err := store.pool.Query(
		ctx,
		`select id, workspace_id, project_id, group_id
		from catalog_project_groups
		where workspace_id = $1 and project_id = any($2)
		order by id`,
		workspaceID,
		int64SliceOrNil(projectIDs),
	)
	if err != nil {
		return nil, writeCatalogError("list catalog project groups", err)
	}
	defer rows.Close()

	projectGroups := make([]catalogapplication.ProjectGroupView, 0)
	for rows.Next() {
		var projectGroup catalogapplication.ProjectGroupView
		if err := rows.Scan(
			&projectGroup.ID,
			&projectGroup.WorkspaceID,
			&projectGroup.ProjectID,
			&projectGroup.GroupID,
		); err != nil {
			return nil, writeCatalogError("scan catalog project group", err)
		}
		projectGroups = append(projectGroups, projectGroup)
	}
	return projectGroups, rows.Err()
}

func (store *Store) GetProjectGroup(
	ctx context.Context,
	workspaceID int64,
	projectGroupID int64,
) (catalogapplication.ProjectGroupView, bool, error) {
	row := store.pool.QueryRow(
		ctx,
		`select id, workspace_id, project_id, group_id
		from catalog_project_groups
		where workspace_id = $1 and id = $2`,
		workspaceID,
		projectGroupID,
	)

	var projectGroup catalogapplication.ProjectGroupView
	if err := row.Scan(
		&projectGroup.ID,
		&projectGroup.WorkspaceID,
		&projectGroup.ProjectID,
		&projectGroup.GroupID,
	); err != nil {
		if notFound(err) {
			return catalogapplication.ProjectGroupView{}, false, nil
		}
		return catalogapplication.ProjectGroupView{}, false, writeCatalogError("get catalog project group", err)
	}
	return projectGroup, true, nil
}

func (store *Store) CreateProjectGroup(
	ctx context.Context,
	command catalogapplication.CreateProjectGroupCommand,
) (catalogapplication.ProjectGroupView, error) {
	row := store.pool.QueryRow(
		ctx,
		`insert into catalog_project_groups (workspace_id, project_id, group_id)
		values ($1, $2, $3)
		returning id, workspace_id, project_id, group_id`,
		command.WorkspaceID,
		command.ProjectID,
		command.GroupID,
	)

	var projectGroup catalogapplication.ProjectGroupView
	if err := row.Scan(
		&projectGroup.ID,
		&projectGroup.WorkspaceID,
		&projectGroup.ProjectID,
		&projectGroup.GroupID,
	); err != nil {
		return catalogapplication.ProjectGroupView{}, writeCatalogError("create catalog project group", err)
	}
	return projectGroup, nil
}

func (store *Store) DeleteProjectGroup(ctx context.Context, workspaceID int64, projectGroupID int64) error {
	_, err := store.pool.Exec(
		ctx,
		"delete from catalog_project_groups where workspace_id = $1 and id = $2",
		workspaceID,
		projectGroupID,
	)
	if err != nil {
		return writeCatalogError("delete catalog project group", err)
	}
	return nil
}
