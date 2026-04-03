package postgres

import (
	"context"
	"fmt"
	"strings"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
)

func (store *Store) ListClients(
	ctx context.Context,
	workspaceID int64,
	filter catalogapplication.ListClientsFilter,
) ([]catalogapplication.ClientView, error) {
	where := []string{"workspace_id = $1"}
	args := []any{workspaceID}
	if filter.Name != "" {
		args = append(args, "%"+strings.ToLower(filter.Name)+"%")
		where = append(where, fmt.Sprintf("lower(name) like $%d", len(args)))
	}
	switch filter.Status {
	case catalogapplication.ClientStatusActive:
		where = append(where, "archived = false")
	case catalogapplication.ClientStatusArchived:
		where = append(where, "archived = true")
	}

	rows, err := store.pool.Query(
		ctx,
		fmt.Sprintf(
			"select id, workspace_id, name, notes, archived, created_by, created_at from catalog_clients where %s order by lower(name), id",
			strings.Join(where, " and "),
		),
		args...,
	)
	if err != nil {
		return nil, writeCatalogError("list catalog clients", err)
	}
	defer rows.Close()

	clients := make([]catalogapplication.ClientView, 0)
	for rows.Next() {
		client, err := scanClient(rows)
		if err != nil {
			return nil, writeCatalogError("scan catalog client", err)
		}
		clients = append(clients, client)
	}
	return clients, rows.Err()
}

func (store *Store) GetClient(
	ctx context.Context,
	workspaceID int64,
	clientID int64,
) (catalogapplication.ClientView, bool, error) {
	row := store.pool.QueryRow(
		ctx,
		`select id, workspace_id, name, notes, archived, created_by, created_at
		from catalog_clients
		where workspace_id = $1 and id = $2`,
		workspaceID,
		clientID,
	)
	client, err := scanClient(row)
	if err != nil {
		if notFound(err) {
			return catalogapplication.ClientView{}, false, nil
		}
		return catalogapplication.ClientView{}, false, writeCatalogError("get catalog client", err)
	}
	return client, true, nil
}

func (store *Store) ListClientsByIDs(
	ctx context.Context,
	workspaceID int64,
	clientIDs []int64,
) ([]catalogapplication.ClientView, error) {
	rows, err := store.pool.Query(
		ctx,
		`select id, workspace_id, name, notes, archived, created_by, created_at
		from catalog_clients
		where workspace_id = $1 and id = any($2)
		order by id`,
		workspaceID,
		int64SliceOrNil(clientIDs),
	)
	if err != nil {
		return nil, writeCatalogError("list catalog clients by ids", err)
	}
	defer rows.Close()

	clients := make([]catalogapplication.ClientView, 0, len(clientIDs))
	for rows.Next() {
		client, err := scanClient(rows)
		if err != nil {
			return nil, writeCatalogError("scan catalog client", err)
		}
		clients = append(clients, client)
	}
	return clients, rows.Err()
}

func (store *Store) ListGroups(ctx context.Context, organizationID int64) ([]catalogapplication.GroupView, error) {
	rows, err := store.pool.Query(
		ctx,
		"select id, organization_id, name, created_at from catalog_groups where organization_id = $1 order by lower(name), id",
		organizationID,
	)
	if err != nil {
		return nil, writeCatalogError("list catalog groups", err)
	}
	defer rows.Close()

	groups := make([]catalogapplication.GroupView, 0)
	for rows.Next() {
		var group catalogapplication.GroupView
		if err := rows.Scan(&group.ID, &group.OrganizationID, &group.Name, &group.CreatedAt); err != nil {
			return nil, writeCatalogError("scan catalog group", err)
		}
		groups = append(groups, group)
	}
	return groups, rows.Err()
}

func (store *Store) GetGroup(
	ctx context.Context,
	organizationID int64,
	groupID int64,
) (catalogapplication.GroupView, bool, error) {
	row := store.pool.QueryRow(
		ctx,
		`select id, organization_id, name, created_at
		from catalog_groups
		where organization_id = $1 and id = $2`,
		organizationID,
		groupID,
	)

	var group catalogapplication.GroupView
	if err := row.Scan(&group.ID, &group.OrganizationID, &group.Name, &group.CreatedAt); err != nil {
		if notFound(err) {
			return catalogapplication.GroupView{}, false, nil
		}
		return catalogapplication.GroupView{}, false, writeCatalogError("get catalog group", err)
	}
	return group, true, nil
}

func (store *Store) ListGroupMembers(ctx context.Context, groupID int64) ([]catalogapplication.GroupMemberView, error) {
	rows, err := store.pool.Query(ctx,
		"select group_id, user_id from catalog_group_members where group_id = $1 order by user_id",
		groupID,
	)
	if err != nil {
		return nil, writeCatalogError("list group members", err)
	}
	defer rows.Close()

	var members []catalogapplication.GroupMemberView
	for rows.Next() {
		var m catalogapplication.GroupMemberView
		if err := rows.Scan(&m.GroupID, &m.UserID); err != nil {
			return nil, writeCatalogError("scan group member", err)
		}
		members = append(members, m)
	}
	return members, rows.Err()
}

func (store *Store) ListGroupWorkspaces(ctx context.Context, groupID int64) ([]catalogapplication.GroupWorkspaceView, error) {
	rows, err := store.pool.Query(ctx,
		"select group_id, workspace_id from catalog_group_workspaces where group_id = $1 order by workspace_id",
		groupID,
	)
	if err != nil {
		return nil, writeCatalogError("list group workspaces", err)
	}
	defer rows.Close()

	var gws []catalogapplication.GroupWorkspaceView
	for rows.Next() {
		var gw catalogapplication.GroupWorkspaceView
		if err := rows.Scan(&gw.GroupID, &gw.WorkspaceID); err != nil {
			return nil, writeCatalogError("scan group workspace", err)
		}
		gws = append(gws, gw)
	}
	return gws, rows.Err()
}

func (store *Store) ListTags(
	ctx context.Context,
	workspaceID int64,
	filter catalogapplication.ListTagsFilter,
) ([]catalogapplication.TagView, error) {
	where := []string{"workspace_id = $1"}
	args := []any{workspaceID}
	if filter.Search != "" {
		args = append(args, "%"+strings.ToLower(filter.Search)+"%")
		where = append(where, fmt.Sprintf("lower(name) like $%d", len(args)))
	}
	args = append(args, filter.PerPage, (filter.Page-1)*filter.PerPage)

	rows, err := store.pool.Query(
		ctx,
		fmt.Sprintf(
			"select id, workspace_id, name, deleted_at, created_by, created_at from catalog_tags where %s order by lower(name), id limit $%d offset $%d",
			strings.Join(where, " and "),
			len(args)-1,
			len(args),
		),
		args...,
	)
	if err != nil {
		return nil, writeCatalogError("list catalog tags", err)
	}
	defer rows.Close()

	tags := make([]catalogapplication.TagView, 0)
	for rows.Next() {
		tag, err := scanTag(rows)
		if err != nil {
			return nil, writeCatalogError("scan catalog tag", err)
		}
		tags = append(tags, tag)
	}
	return tags, rows.Err()
}

func (store *Store) GetTag(
	ctx context.Context,
	workspaceID int64,
	tagID int64,
) (catalogapplication.TagView, bool, error) {
	row := store.pool.QueryRow(
		ctx,
		`select id, workspace_id, name, deleted_at, created_by, created_at
		from catalog_tags
		where workspace_id = $1 and id = $2`,
		workspaceID,
		tagID,
	)
	tag, err := scanTag(row)
	if err != nil {
		if notFound(err) {
			return catalogapplication.TagView{}, false, nil
		}
		return catalogapplication.TagView{}, false, writeCatalogError("get catalog tag", err)
	}
	return tag, true, nil
}

func (store *Store) ListProjectUsers(
	ctx context.Context,
	workspaceID int64,
	filter catalogapplication.ListProjectUsersFilter,
) ([]catalogapplication.ProjectUserView, error) {
	where := []string{"p.workspace_id = $1"}
	args := []any{workspaceID}
	if len(filter.ProjectIDs) > 0 {
		args = append(args, filter.ProjectIDs)
		where = append(where, fmt.Sprintf("pu.project_id = any($%d)", len(args)))
	}

	rows, err := store.pool.Query(
		ctx,
		fmt.Sprintf(
			`select pu.project_id, pu.user_id, pu.role, p.workspace_id, pu.created_at
			from catalog_project_users pu
			join catalog_projects p on p.id = pu.project_id
			where %s
			order by pu.project_id, pu.user_id`,
			strings.Join(where, " and "),
		),
		args...,
	)
	if err != nil {
		return nil, writeCatalogError("list catalog project users", err)
	}
	defer rows.Close()

	users := make([]catalogapplication.ProjectUserView, 0)
	for rows.Next() {
		var user catalogapplication.ProjectUserView
		if err := rows.Scan(&user.ProjectID, &user.UserID, &user.Role, &user.WorkspaceID, &user.CreatedAt); err != nil {
			return nil, writeCatalogError("scan catalog project user", err)
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

func (store *Store) GetProjectUser(
	ctx context.Context,
	workspaceID int64,
	projectID int64,
	userID int64,
) (catalogapplication.ProjectUserView, bool, error) {
	row := store.pool.QueryRow(
		ctx,
		`select pu.project_id, pu.user_id, pu.role, p.workspace_id, pu.created_at
		from catalog_project_users pu
		join catalog_projects p on p.id = pu.project_id
		where p.workspace_id = $1 and pu.project_id = $2 and pu.user_id = $3`,
		workspaceID,
		projectID,
		userID,
	)

	var view catalogapplication.ProjectUserView
	if err := row.Scan(&view.ProjectID, &view.UserID, &view.Role, &view.WorkspaceID, &view.CreatedAt); err != nil {
		if notFound(err) {
			return catalogapplication.ProjectUserView{}, false, nil
		}
		return catalogapplication.ProjectUserView{}, false, writeCatalogError("get catalog project user", err)
	}
	return view, true, nil
}

func (store *Store) ListProjects(
	ctx context.Context,
	workspaceID int64,
	filter catalogapplication.ListProjectsFilter,
) ([]catalogapplication.ProjectView, error) {
	where := []string{"p.workspace_id = $1"}
	args := []any{workspaceID}
	if filter.Active != nil {
		args = append(args, *filter.Active)
		where = append(where, fmt.Sprintf("p.active = $%d", len(args)))
	}
	if filter.OnlyTemplates {
		where = append(where, "p.template = true")
	}
	if filter.Name != "" {
		args = append(args, "%"+strings.ToLower(filter.Name)+"%")
		where = append(where, fmt.Sprintf("lower(p.name) like $%d", len(args)))
	}
	if filter.Search != "" {
		args = append(args, "%"+strings.ToLower(filter.Search)+"%")
		where = append(where, fmt.Sprintf("lower(p.name) like $%d", len(args)))
	}
	args = append(args, filter.PerPage, (filter.Page-1)*filter.PerPage)

	rows, err := store.pool.Query(
		ctx,
		fmt.Sprintf(
			`select p.id, p.workspace_id, p.client_id, p.name, p.active, p.pinned, p.template, p.actual_seconds,
				p.recurring, p.recurring_period_start, p.recurring_period_end, c.name, p.created_at,
				p.color, p.is_private, p.billable,
				p.start_date, p.end_date, p.estimated_seconds, p.fixed_fee, p.currency, p.rate
			from catalog_projects p
			left join catalog_clients c on c.id = p.client_id
			where %s
			order by %s
			limit $%d offset $%d`,
			strings.Join(where, " and "),
			projectOrderClause(filter),
			len(args)-1,
			len(args),
		),
		args...,
	)
	if err != nil {
		return nil, writeCatalogError("list catalog projects", err)
	}
	defer rows.Close()

	projects := make([]catalogapplication.ProjectView, 0)
	for rows.Next() {
		project, err := scanProject(rows)
		if err != nil {
			return nil, writeCatalogError("scan catalog project", err)
		}
		projects = append(projects, project)
	}
	return projects, rows.Err()
}

func (store *Store) GetProject(
	ctx context.Context,
	workspaceID int64,
	projectID int64,
) (catalogapplication.ProjectView, bool, error) {
	row := store.pool.QueryRow(
		ctx,
		`select p.id, p.workspace_id, p.client_id, p.name, p.active, p.pinned, p.template, p.actual_seconds,
			p.recurring, p.recurring_period_start, p.recurring_period_end, c.name, p.created_at,
			p.color, p.is_private, p.billable,
				p.start_date, p.end_date, p.estimated_seconds, p.fixed_fee, p.currency, p.rate
		from catalog_projects p
		left join catalog_clients c on c.id = p.client_id
		where p.workspace_id = $1 and p.id = $2`,
		workspaceID,
		projectID,
	)
	project, err := scanProject(row)
	if err != nil {
		if notFound(err) {
			return catalogapplication.ProjectView{}, false, nil
		}
		return catalogapplication.ProjectView{}, false, writeCatalogError("get catalog project", err)
	}
	return project, true, nil
}

func (store *Store) CountProjectTasks(
	ctx context.Context,
	workspaceID int64,
	projectIDs []int64,
) ([]catalogapplication.ProjectCountView, error) {
	rows, err := store.pool.Query(
		ctx,
		`select p.id, count(t.id)
		from catalog_projects p
		left join catalog_tasks t on t.project_id = p.id
		where p.workspace_id = $1 and p.id = any($2)
		group by p.id
		order by p.id`,
		workspaceID,
		int64SliceOrNil(projectIDs),
	)
	if err != nil {
		return nil, writeCatalogError("count project tasks", err)
	}
	defer rows.Close()

	counts := make([]catalogapplication.ProjectCountView, 0, len(projectIDs))
	for rows.Next() {
		var count catalogapplication.ProjectCountView
		if err := rows.Scan(&count.ProjectID, &count.Count); err != nil {
			return nil, writeCatalogError("scan project task count", err)
		}
		counts = append(counts, count)
	}
	return counts, rows.Err()
}

func (store *Store) CountProjectUsers(
	ctx context.Context,
	workspaceID int64,
	projectIDs []int64,
) ([]catalogapplication.ProjectCountView, error) {
	rows, err := store.pool.Query(
		ctx,
		`select p.id, count(pu.user_id)
		from catalog_projects p
		left join catalog_project_users pu on pu.project_id = p.id
		where p.workspace_id = $1 and p.id = any($2)
		group by p.id
		order by p.id`,
		workspaceID,
		int64SliceOrNil(projectIDs),
	)
	if err != nil {
		return nil, writeCatalogError("count project users", err)
	}
	defer rows.Close()

	counts := make([]catalogapplication.ProjectCountView, 0, len(projectIDs))
	for rows.Next() {
		var count catalogapplication.ProjectCountView
		if err := rows.Scan(&count.ProjectID, &count.Count); err != nil {
			return nil, writeCatalogError("scan project user count", err)
		}
		counts = append(counts, count)
	}
	return counts, rows.Err()
}

func (store *Store) ListTasks(
	ctx context.Context,
	workspaceID int64,
	filter catalogapplication.ListTasksFilter,
) (catalogapplication.TaskPage, error) {
	where := []string{"t.workspace_id = $1"}
	args := []any{workspaceID}
	if filter.Active != nil {
		args = append(args, *filter.Active)
		where = append(where, fmt.Sprintf("t.active = $%d", len(args)))
	}
	if filter.ProjectID != nil {
		args = append(args, *filter.ProjectID)
		where = append(where, fmt.Sprintf("t.project_id = $%d", len(args)))
	}
	if filter.Search != "" {
		args = append(args, "%"+strings.ToLower(filter.Search)+"%")
		where = append(where, fmt.Sprintf("lower(t.name) like $%d", len(args)))
	}

	var totalCount int
	if err := store.pool.QueryRow(
		ctx,
		fmt.Sprintf("select count(*) from catalog_tasks t where %s", strings.Join(where, " and ")),
		args...,
	).Scan(&totalCount); err != nil {
		return catalogapplication.TaskPage{}, writeCatalogError("count catalog tasks", err)
	}

	args = append(args, filter.PerPage, (filter.Page-1)*filter.PerPage)
	rows, err := store.pool.Query(
		ctx,
		fmt.Sprintf(
			`select t.id, t.workspace_id, t.project_id, t.name, t.active, p.name
			from catalog_tasks t
			left join catalog_projects p on p.id = t.project_id
			where %s
			order by %s
			limit $%d offset $%d`,
			strings.Join(where, " and "),
			taskOrderClause(filter),
			len(args)-1,
			len(args),
		),
		args...,
	)
	if err != nil {
		return catalogapplication.TaskPage{}, writeCatalogError("list catalog tasks", err)
	}
	defer rows.Close()

	tasks := make([]catalogapplication.TaskView, 0)
	for rows.Next() {
		task, err := scanTask(rows)
		if err != nil {
			return catalogapplication.TaskPage{}, writeCatalogError("scan catalog task", err)
		}
		tasks = append(tasks, task)
	}
	if err := rows.Err(); err != nil {
		return catalogapplication.TaskPage{}, writeCatalogError("iterate catalog tasks", err)
	}
	return catalogapplication.TaskPage{
		Tasks:      tasks,
		Page:       filter.Page,
		PerPage:    filter.PerPage,
		TotalCount: totalCount,
		SortField:  filter.SortField,
		SortOrder:  filter.SortOrder,
	}, nil
}

func (store *Store) GetTask(
	ctx context.Context,
	workspaceID int64,
	taskID int64,
) (catalogapplication.TaskView, bool, error) {
	row := store.pool.QueryRow(
		ctx,
		`select t.id, t.workspace_id, t.project_id, t.name, t.active, p.name
		from catalog_tasks t
		left join catalog_projects p on p.id = t.project_id
		where t.workspace_id = $1 and t.id = $2`,
		workspaceID,
		taskID,
	)
	task, err := scanTask(row)
	if err != nil {
		if notFound(err) {
			return catalogapplication.TaskView{}, false, nil
		}
		return catalogapplication.TaskView{}, false, writeCatalogError("get catalog task", err)
	}
	return task, true, nil
}

func (store *Store) GetTaskByWorkspace(
	ctx context.Context,
	workspaceID int64,
	taskID int64,
) (catalogapplication.TaskView, bool, error) {
	row := store.pool.QueryRow(
		ctx,
		`select t.id, t.workspace_id, t.project_id, t.name, t.active, p.name
		from catalog_tasks t
		left join catalog_projects p on p.id = t.project_id
		where t.workspace_id = $1 and t.id = $2`,
		workspaceID,
		taskID,
	)

	task, err := scanTask(row)
	if err != nil {
		if notFound(err) {
			return catalogapplication.TaskView{}, false, nil
		}
		return catalogapplication.TaskView{}, false, writeCatalogError("get catalog task by workspace", err)
	}
	return task, true, nil
}

func (store *Store) GetWorkspaceMemberByID(ctx context.Context, workspaceID int64, workspaceUserID int64) (bool, error) {
	var exists bool
	if err := store.pool.QueryRow(
		ctx,
		`select exists(
			select 1
			from membership_workspace_members
			where workspace_id = $1 and id = $2
		)`,
		workspaceID,
		workspaceUserID,
	).Scan(&exists); err != nil {
		return false, writeCatalogError("get workspace member for rate", err)
	}
	return exists, nil
}
