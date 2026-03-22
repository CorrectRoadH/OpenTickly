package bootstrap

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"

	"github.com/jackc/pgx/v5"
	"github.com/labstack/echo/v4"
)

type catalogProjectRecord struct {
	ID            int64
	WorkspaceID   int64
	ClientID      *int64
	Name          string
	Active        bool
	Pinned        bool
	Template      bool
	ActualSeconds int64
	Recurring     bool
	PeriodStart   *time.Time
	PeriodEnd     *time.Time
	ClientName    *string
	CreatedAt     time.Time
}

type catalogTaskRecord struct {
	ID          int64
	WorkspaceID int64
	ProjectID   *int64
	Name        string
	Active      bool
	ProjectName *string
}

func (runtime *webRuntime) getPublicTrackClients(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	where := []string{"workspace_id = $1"}
	args := []any{workspaceID}
	if name := strings.TrimSpace(ctx.QueryParam("name")); name != "" {
		args = append(args, "%"+strings.ToLower(name)+"%")
		where = append(where, fmt.Sprintf("lower(name) like $%d", len(args)))
	}
	switch strings.TrimSpace(ctx.QueryParam("status")) {
	case "", "both":
	case "active":
		where = append(where, "archived = false")
	case "archived":
		where = append(where, "archived = true")
	default:
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	rows, err := runtime.pool.Query(
		ctx.Request().Context(),
		fmt.Sprintf(
			"select id, workspace_id, name, archived, created_by, created_at from catalog_clients where %s order by lower(name), id",
			strings.Join(where, " and "),
		),
		args...,
	)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, "Internal Server Error")
	}
	defer rows.Close()

	clients := make([]publictrackapi.ModelsClient, 0)
	for rows.Next() {
		var id, wid int64
		var name string
		var archived bool
		var createdBy *int64
		var createdAt time.Time
		if err := rows.Scan(&id, &wid, &name, &archived, &createdBy, &createdAt); err != nil {
			return ctx.JSON(http.StatusInternalServerError, "Internal Server Error")
		}
		clients = append(clients, publictrackapi.ModelsClient{
			Archived:  boolPointer(archived),
			At:        timePointer(createdAt),
			CreatorId: intPointerFromInt64Pointer(createdBy),
			Id:        intPointer(id),
			Name:      stringPointer(name),
			Wid:       intPointer(wid),
		})
	}
	return ctx.JSON(http.StatusOK, clients)
}

func (runtime *webRuntime) getPublicTrackGroups(ctx echo.Context) error {
	return runtime.listPublicTrackGroups(ctx)
}

func (runtime *webRuntime) getPublicTrackTags(ctx echo.Context) error {
	return runtime.listPublicTrackTags(ctx)
}

func (runtime *webRuntime) getPublicTrackProjectUsers(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	where := []string{"p.workspace_id = $1"}
	args := []any{workspaceID}
	if raw := strings.TrimSpace(ctx.QueryParam("project_ids")); raw != "" {
		projectIDs, err := parseCSVInt64s(raw)
		if err != nil {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		args = append(args, projectIDs)
		where = append(where, fmt.Sprintf("pu.project_id = any($%d)", len(args)))
	}

	rows, err := runtime.pool.Query(
		ctx.Request().Context(),
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
		return ctx.JSON(http.StatusInternalServerError, "Internal Server Error")
	}
	defer rows.Close()

	users := make([]publictrackapi.ModelsProjectUser, 0)
	for rows.Next() {
		var projectID, userID, wid int64
		var role string
		var createdAt time.Time
		if err := rows.Scan(&projectID, &userID, &role, &wid, &createdAt); err != nil {
			return ctx.JSON(http.StatusInternalServerError, "Internal Server Error")
		}
		manager := role == "admin"
		users = append(users, publictrackapi.ModelsProjectUser{
			At:          timePointer(createdAt),
			Id:          intPointer(projectID*1000000 + userID),
			Manager:     boolPointer(manager),
			ProjectId:   intPointer(projectID),
			UserId:      intPointer(userID),
			WorkspaceId: intPointer(wid),
		})
	}
	return ctx.JSON(http.StatusOK, users)
}

func (runtime *webRuntime) getPublicTrackProjects(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	where := []string{"p.workspace_id = $1"}
	args := []any{workspaceID}
	if activeValue := strings.TrimSpace(ctx.QueryParam("active")); activeValue != "" {
		active, err := strconv.ParseBool(activeValue)
		if err != nil {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		args = append(args, active)
		where = append(where, fmt.Sprintf("p.active = $%d", len(args)))
	}
	if onlyTemplates, ok := queryBool(ctx, "only_templates"); ok && onlyTemplates {
		where = append(where, "p.template = true")
	}
	if name := strings.TrimSpace(ctx.QueryParam("name")); name != "" {
		args = append(args, "%"+strings.ToLower(name)+"%")
		where = append(where, fmt.Sprintf("lower(p.name) like $%d", len(args)))
	}
	if search := strings.TrimSpace(ctx.QueryParam("search")); search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		where = append(where, fmt.Sprintf("lower(p.name) like $%d", len(args)))
	}

	page := max(queryInt(ctx, "page", 1), 1)
	perPage := max(min(queryInt(ctx, "per_page", 151), 200), 1)
	args = append(args, perPage, (page-1)*perPage)
	rows, err := runtime.pool.Query(
		ctx.Request().Context(),
		fmt.Sprintf(
			`select p.id, p.workspace_id, p.client_id, p.name, p.active, p.pinned, p.template, p.actual_seconds,
				p.recurring, p.recurring_period_start, p.recurring_period_end, c.name, p.created_at
			from catalog_projects p
			left join catalog_clients c on c.id = p.client_id
			where %s
			order by %s
			limit $%d offset $%d`,
			strings.Join(where, " and "),
			projectOrderClause(ctx.QueryParam("sort_field"), ctx.QueryParam("sort_order"), queryBoolValue(ctx, "sort_pinned")),
			len(args)-1,
			len(args),
		),
		args...,
	)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, "Internal Server Error")
	}
	defer rows.Close()

	projects := make([]publictrackapi.GithubComTogglTogglApiInternalModelsProject, 0)
	for rows.Next() {
		record, err := scanCatalogProject(rows)
		if err != nil {
			return ctx.JSON(http.StatusInternalServerError, "Internal Server Error")
		}
		projects = append(projects, record.toAPI())
	}
	return ctx.JSON(http.StatusOK, projects)
}

func (runtime *webRuntime) getPublicTrackTasksBasic(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	where := []string{"t.workspace_id = $1"}
	args := []any{workspaceID}
	if activeValue := strings.TrimSpace(ctx.QueryParam("active")); activeValue == "" {
		where = append(where, "t.active = true")
	} else {
		active, err := strconv.ParseBool(activeValue)
		if err != nil {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		args = append(args, active)
		where = append(where, fmt.Sprintf("t.active = $%d", len(args)))
	}
	if projectID := strings.TrimSpace(ctx.QueryParam("project_id")); projectID != "" {
		parsed, err := strconv.ParseInt(projectID, 10, 64)
		if err != nil {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		args = append(args, parsed)
		where = append(where, fmt.Sprintf("t.project_id = $%d", len(args)))
	}
	if search := strings.TrimSpace(ctx.QueryParam("search")); search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		where = append(where, fmt.Sprintf("lower(t.name) like $%d", len(args)))
	}

	page := max(queryInt(ctx, "page", 1), 1)
	perPage := max(min(queryInt(ctx, "per_page", 50), 200), 1)
	countSQL := fmt.Sprintf("select count(*) from catalog_tasks t where %s", strings.Join(where, " and "))
	var totalCount int
	if err := runtime.pool.QueryRow(ctx.Request().Context(), countSQL, args...).Scan(&totalCount); err != nil {
		return ctx.JSON(http.StatusInternalServerError, "Internal Server Error")
	}

	args = append(args, perPage, (page-1)*perPage)
	rows, err := runtime.pool.Query(
		ctx.Request().Context(),
		fmt.Sprintf(
			`select t.id, t.workspace_id, t.project_id, t.name, t.active, p.name
			from catalog_tasks t
			left join catalog_projects p on p.id = t.project_id
			where %s
			order by %s
			limit $%d offset $%d`,
			strings.Join(where, " and "),
			taskOrderClause(ctx.QueryParam("sort_field"), ctx.QueryParam("sort_order")),
			len(args)-1,
			len(args),
		),
		args...,
	)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, "Internal Server Error")
	}
	defer rows.Close()

	tasks := make([]publictrackapi.ModelsTask, 0)
	for rows.Next() {
		record, err := scanCatalogTask(rows)
		if err != nil {
			return ctx.JSON(http.StatusInternalServerError, "Internal Server Error")
		}
		tasks = append(tasks, record.toAPI())
	}
	return ctx.JSON(http.StatusOK, publictrackapi.TaskResponse{
		Data:       &tasks,
		Page:       intPointerFromInt(page),
		PerPage:    intPointerFromInt(perPage),
		SortField:  stringPointer(defaultTaskSortField(ctx.QueryParam("sort_field"))),
		SortOrder:  stringPointer(sortDirection(ctx.QueryParam("sort_order"))),
		TotalCount: intPointerFromInt(totalCount),
	})
}

func (runtime *webRuntime) requirePublicTrackUser(ctx echo.Context) (*identityapplication.UserSnapshot, error) {
	return runtime.publicTrackUser(ctx)
}

func (runtime *webRuntime) requirePublicTrackWorkspace(ctx echo.Context, workspaceID int64) error {
	home, err := runtime.requirePublicTrackHome(ctx)
	if err != nil {
		return err
	}
	if home.workspaceID != workspaceID {
		return echo.NewHTTPError(http.StatusForbidden, "User does not have access to this resource.")
	}
	return nil
}

func (runtime *webRuntime) requirePublicTrackOrganization(ctx echo.Context, organizationID int64) error {
	home, err := runtime.requirePublicTrackHome(ctx)
	if err != nil {
		return err
	}
	if home.organizationID != organizationID {
		return echo.NewHTTPError(http.StatusForbidden, "User does not have access to this resource.")
	}
	return nil
}

func (runtime *webRuntime) requirePublicTrackHome(ctx echo.Context) (sessionHome, error) {
	user, err := runtime.requirePublicTrackUser(ctx)
	if err != nil {
		return sessionHome{}, err
	}

	organizationID, workspaceID, found, lookupErr := runtime.userHomes.FindByUserID(ctx.Request().Context(), user.ID)
	switch {
	case lookupErr != nil:
		return sessionHome{}, echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	case !found:
		return sessionHome{}, echo.NewHTTPError(http.StatusForbidden, "User does not have access to this resource.")
	default:
		return sessionHome{organizationID: organizationID, workspaceID: workspaceID}, nil
	}
}

func (runtime *webRuntime) loadCatalogProject(ctx echo.Context, workspaceID int64, projectID int64) (*catalogProjectRecord, error) {
	row := runtime.pool.QueryRow(
		ctx.Request().Context(),
		`select p.id, p.workspace_id, p.client_id, p.name, p.active, p.pinned, p.template, p.actual_seconds,
			p.recurring, p.recurring_period_start, p.recurring_period_end, c.name, p.created_at
		from catalog_projects p
		left join catalog_clients c on c.id = p.client_id
		where p.workspace_id = $1 and p.id = $2`,
		workspaceID,
		projectID,
	)
	record, err := scanCatalogProject(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, echo.NewHTTPError(http.StatusNotFound, "Not Found")
	}
	if err != nil {
		return nil, echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}
	return &record, nil
}

func (record catalogProjectRecord) toAPI() publictrackapi.GithubComTogglTogglApiInternalModelsProject {
	project := publictrackapi.GithubComTogglTogglApiInternalModelsProject{
		Active:        boolPointer(record.Active),
		ActualSeconds: intPointer(record.ActualSeconds),
		At:            timePointer(record.CreatedAt),
		CanTrackTime:  boolPointer(record.Active),
		ClientId:      intPointerFromInt64Pointer(record.ClientID),
		ClientName:    record.ClientName,
		CreatedAt:     timePointer(record.CreatedAt),
		Id:            intPointer(record.ID),
		Name:          stringPointer(record.Name),
		Pinned:        boolPointer(record.Pinned),
		Recurring:     boolPointer(record.Recurring),
		Template:      boolPointer(record.Template),
		Wid:           intPointer(record.WorkspaceID),
		WorkspaceId:   intPointer(record.WorkspaceID),
	}
	if record.ClientID != nil {
		project.Cid = intPointer(*record.ClientID)
	}
	if record.Recurring && record.PeriodStart != nil && record.PeriodEnd != nil {
		project.CurrentPeriod = &publictrackapi.ModelsRecurringPeriod{
			StartDate: datePointer(*record.PeriodStart),
			EndDate:   datePointer(*record.PeriodEnd),
		}
	}
	return project
}

func (record catalogTaskRecord) toAPI() publictrackapi.ModelsTask {
	return publictrackapi.ModelsTask{
		Active:      boolPointer(record.Active),
		Id:          intPointer(record.ID),
		Name:        stringPointer(record.Name),
		ProjectId:   intPointerFromInt64Pointer(record.ProjectID),
		ProjectName: record.ProjectName,
		WorkspaceId: intPointer(record.WorkspaceID),
	}
}

func scanCatalogProject(scanner interface{ Scan(...any) error }) (catalogProjectRecord, error) {
	var record catalogProjectRecord
	err := scanner.Scan(
		&record.ID,
		&record.WorkspaceID,
		&record.ClientID,
		&record.Name,
		&record.Active,
		&record.Pinned,
		&record.Template,
		&record.ActualSeconds,
		&record.Recurring,
		&record.PeriodStart,
		&record.PeriodEnd,
		&record.ClientName,
		&record.CreatedAt,
	)
	return record, err
}

func scanCatalogTask(scanner interface{ Scan(...any) error }) (catalogTaskRecord, error) {
	var record catalogTaskRecord
	err := scanner.Scan(&record.ID, &record.WorkspaceID, &record.ProjectID, &record.Name, &record.Active, &record.ProjectName)
	return record, err
}
