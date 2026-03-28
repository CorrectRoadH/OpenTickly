package postgres

import (
	"context"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"

	"github.com/samber/lo"
)

func (store *Store) CreateClient(
	ctx context.Context,
	command catalogapplication.CreateClientCommand,
) (catalogapplication.ClientView, error) {
	row := store.pool.QueryRow(
		ctx,
		`insert into catalog_clients (workspace_id, name, notes, created_by)
		values ($1, $2, $3, $4)
		returning id, workspace_id, name, notes, archived, created_by, created_at`,
		command.WorkspaceID,
		command.Name,
		command.Notes,
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
		set name = $3, notes = $4, archived = $5
		where workspace_id = $1 and id = $2`,
		client.WorkspaceID,
		client.ID,
		client.Name,
		client.Notes,
		client.Archived,
	)
	if err != nil {
		return writeCatalogError("update catalog client", err)
	}
	return nil
}

func (store *Store) DeleteClients(ctx context.Context, workspaceID int64, clientIDs []int64) error {
	_, err := store.pool.Exec(
		ctx,
		"delete from catalog_clients where workspace_id = $1 and id = any($2)",
		workspaceID,
		int64SliceOrNil(clientIDs),
	)
	if err != nil {
		return writeCatalogError("delete catalog clients", err)
	}
	return nil
}

func (store *Store) ArchiveClientAndProjects(
	ctx context.Context,
	workspaceID int64,
	clientID int64,
) ([]int64, error) {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return nil, writeCatalogError("begin archive client tx", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(
		ctx,
		"update catalog_clients set archived = true where workspace_id = $1 and id = $2",
		workspaceID,
		clientID,
	); err != nil {
		return nil, writeCatalogError("archive catalog client", err)
	}

	rows, err := tx.Query(
		ctx,
		`select id
		from catalog_projects
		where workspace_id = $1 and client_id = $2
		order by id`,
		workspaceID,
		clientID,
	)
	if err != nil {
		return nil, writeCatalogError("list catalog client projects", err)
	}
	defer rows.Close()

	projectIDs := make([]int64, 0)
	for rows.Next() {
		var projectID int64
		if err := rows.Scan(&projectID); err != nil {
			return nil, writeCatalogError("scan catalog client project id", err)
		}
		projectIDs = append(projectIDs, projectID)
	}
	if err := rows.Err(); err != nil {
		return nil, writeCatalogError("iterate catalog client project ids", err)
	}

	if _, err := tx.Exec(
		ctx,
		`update catalog_projects
		set active = false
		where workspace_id = $1 and client_id = $2 and active = true`,
		workspaceID,
		clientID,
	); err != nil {
		return nil, writeCatalogError("archive catalog client projects", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, writeCatalogError("commit archive client tx", err)
	}
	return projectIDs, nil
}

func (store *Store) RestoreClientAndProjects(
	ctx context.Context,
	workspaceID int64,
	clientID int64,
	projectIDs []int64,
	restoreAll bool,
) error {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return writeCatalogError("begin restore client tx", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(
		ctx,
		"update catalog_clients set archived = false where workspace_id = $1 and id = $2",
		workspaceID,
		clientID,
	); err != nil {
		return writeCatalogError("restore catalog client", err)
	}

	if restoreAll {
		if _, err := tx.Exec(
			ctx,
			`update catalog_projects
			set active = true
			where workspace_id = $1 and client_id = $2`,
			workspaceID,
			clientID,
		); err != nil {
			return writeCatalogError("restore all client projects", err)
		}
	} else if len(projectIDs) > 0 {
		if _, err := tx.Exec(
			ctx,
			`update catalog_projects
			set active = true
			where workspace_id = $1 and client_id = $2 and id = any($3)`,
			workspaceID,
			clientID,
			int64SliceOrNil(projectIDs),
		); err != nil {
			return writeCatalogError("restore client projects", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return writeCatalogError("commit restore client tx", err)
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

func (store *Store) UpdateGroup(ctx context.Context, group catalogapplication.GroupView) error {
	_, err := store.pool.Exec(
		ctx,
		`update catalog_groups
		set name = $3
		where workspace_id = $1 and id = $2`,
		group.WorkspaceID,
		group.ID,
		group.Name,
	)
	if err != nil {
		return writeCatalogError("update catalog group", err)
	}
	return nil
}

func (store *Store) DeleteGroup(ctx context.Context, workspaceID int64, groupID int64) error {
	_, err := store.pool.Exec(
		ctx,
		"delete from catalog_groups where workspace_id = $1 and id = $2",
		workspaceID,
		groupID,
	)
	if err != nil {
		return writeCatalogError("delete catalog group", err)
	}
	return nil
}

func (store *Store) CreateProjectUser(
	ctx context.Context,
	command catalogapplication.CreateProjectUserCommand,
) (catalogapplication.ProjectUserView, error) {
	row := store.pool.QueryRow(
		ctx,
		`insert into catalog_project_users (project_id, user_id, role)
		values ($1, $2, $3)
		returning project_id, user_id, role, created_at`,
		command.ProjectID,
		command.UserID,
		lo.Ternary(command.Manager, "admin", "member"),
	)

	var view catalogapplication.ProjectUserView
	view.WorkspaceID = command.WorkspaceID
	if err := row.Scan(&view.ProjectID, &view.UserID, &view.Role, &view.CreatedAt); err != nil {
		return catalogapplication.ProjectUserView{}, writeCatalogError("create catalog project user", err)
	}
	return view, nil
}

func (store *Store) UpdateProjectUser(ctx context.Context, view catalogapplication.ProjectUserView) error {
	_, err := store.pool.Exec(
		ctx,
		`update catalog_project_users
		set role = $3
		where project_id = $1 and user_id = $2`,
		view.ProjectID,
		view.UserID,
		view.Role,
	)
	if err != nil {
		return writeCatalogError("update catalog project user", err)
	}
	return nil
}

func (store *Store) DeleteProjectUser(ctx context.Context, workspaceID int64, projectID int64, userID int64) error {
	_, err := store.pool.Exec(
		ctx,
		`delete from catalog_project_users pu
		using catalog_projects p
		where pu.project_id = p.id
		  and p.workspace_id = $1
		  and pu.project_id = $2
		  and pu.user_id = $3`,
		workspaceID,
		projectID,
		userID,
	)
	if err != nil {
		return writeCatalogError("delete catalog project user", err)
	}
	return nil
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

func (store *Store) DeleteTags(ctx context.Context, workspaceID int64, tagIDs []int64) error {
	if len(tagIDs) == 0 {
		return nil
	}
	_, err := store.pool.Exec(
		ctx,
		"delete from catalog_tags where workspace_id = $1 and id = any($2)",
		workspaceID,
		tagIDs,
	)
	if err != nil {
		return writeCatalogError("delete catalog tags", err)
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
		`insert into catalog_projects (workspace_id, client_id, name, active, template, recurring, created_by, color, is_private, billable)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		returning id`,
		command.WorkspaceID,
		command.ClientID,
		command.Name,
		lo.FromPtr(command.Active),
		lo.FromPtr(command.Template),
		lo.FromPtr(command.Recurring),
		command.CreatedBy,
		lo.FromPtrOr(command.Color, "#0b83d9"),
		lo.FromPtrOr(command.IsPrivate, true),
		lo.FromPtrOr(command.Billable, false),
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
		set client_id = $3, name = $4, active = $5, template = $6, recurring = $7, color = $8, is_private = $9, billable = $10
		where workspace_id = $1 and id = $2`,
		project.WorkspaceID,
		project.ID,
		project.ClientID,
		project.Name,
		project.Active,
		project.Template,
		project.Recurring,
		project.Color,
		project.IsPrivate,
		project.Billable,
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

func (store *Store) DeleteProject(ctx context.Context, workspaceID int64, projectID int64) error {
	_, err := store.pool.Exec(
		ctx,
		"delete from catalog_projects where workspace_id = $1 and id = $2",
		workspaceID,
		projectID,
	)
	if err != nil {
		return writeCatalogError("delete catalog project", err)
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
		lo.FromPtr(command.Active),
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

func (store *Store) PatchProjects(
	ctx context.Context,
	workspaceID int64,
	projectIDs []int64,
	commands []catalogapplication.PatchProjectCommand,
) error {
	if len(projectIDs) == 0 {
		return nil
	}
	// Batch update all projects to active=false (placeholder)
	_, err := store.pool.Exec(
		ctx,
		`update catalog_projects
		set active = false
		where workspace_id = $1 and id = any($2)`,
		workspaceID,
		int64SliceOrNil(projectIDs),
	)
	if err != nil {
		return writeCatalogError("patch catalog projects", err)
	}
	return nil
}

func (store *Store) PatchTasks(
	ctx context.Context,
	workspaceID int64,
	projectID int64,
	taskIDs []int64,
	commands []catalogapplication.PatchTaskCommand,
) error {
	if len(taskIDs) == 0 {
		return nil
	}
	// Batch update all tasks to active=false (placeholder)
	_, err := store.pool.Exec(
		ctx,
		`update catalog_tasks
		set active = false
		where workspace_id = $1 and project_id = $2 and id = any($3)`,
		workspaceID,
		projectID,
		int64SliceOrNil(taskIDs),
	)
	if err != nil {
		return writeCatalogError("patch catalog tasks", err)
	}
	return nil
}

func (store *Store) PatchProjectUsers(
	ctx context.Context,
	workspaceID int64,
	projectUserIDs [][2]int64,
	commands []catalogapplication.PatchProjectUserCommand,
) error {
	if len(projectUserIDs) == 0 {
		return nil
	}
	// No-op for now
	_ = projectUserIDs
	_ = commands
	return nil
}
