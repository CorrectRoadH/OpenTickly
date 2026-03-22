package bootstrap

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/labstack/echo/v4"
)

func (runtime *webRuntime) listPublicTrackGroups(ctx echo.Context) error {
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

	rows, err := runtime.pool.Query(
		ctx.Request().Context(),
		"select id, workspace_id, name, has_users, created_at from catalog_groups where workspace_id = $1 order by lower(name), id",
		workspaceID,
	)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, "Internal Server Error")
	}
	defer rows.Close()

	groups := make([]publictrackapi.GithubComTogglTogglApiInternalModelsGroup, 0)
	for rows.Next() {
		var id, wid int64
		var name string
		var hasUsers bool
		var createdAt time.Time
		if err := rows.Scan(&id, &wid, &name, &hasUsers, &createdAt); err != nil {
			return ctx.JSON(http.StatusInternalServerError, "Internal Server Error")
		}
		groups = append(groups, publictrackapi.GithubComTogglTogglApiInternalModelsGroup{
			At:          timePointer(createdAt),
			HasUsers:    boolPointer(hasUsers),
			Id:          intPointer(id),
			Name:        stringPointer(name),
			WorkspaceId: intPointer(wid),
		})
	}
	return ctx.JSON(http.StatusOK, groups)
}

func (runtime *webRuntime) listPublicTrackTags(ctx echo.Context) error {
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
	if search := strings.TrimSpace(ctx.QueryParam("search")); search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		where = append(where, fmt.Sprintf("lower(name) like $%d", len(args)))
	}
	page := max(queryInt(ctx, "page", 1), 1)
	perPage := max(min(queryInt(ctx, "per_page", 200), 200), 1)
	args = append(args, perPage, (page-1)*perPage)

	rows, err := runtime.pool.Query(
		ctx.Request().Context(),
		fmt.Sprintf(
			"select id, workspace_id, name, deleted_at, created_by, created_at from catalog_tags where %s order by lower(name), id limit $%d offset $%d",
			strings.Join(where, " and "),
			len(args)-1,
			len(args),
		),
		args...,
	)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, "Internal Server Error")
	}
	defer rows.Close()

	tags := make([]publictrackapi.ModelsTag, 0)
	for rows.Next() {
		var id, wid int64
		var name string
		var deletedAt *time.Time
		var createdBy *int64
		var createdAt time.Time
		if err := rows.Scan(&id, &wid, &name, &deletedAt, &createdBy, &createdAt); err != nil {
			return ctx.JSON(http.StatusInternalServerError, "Internal Server Error")
		}
		tags = append(tags, publictrackapi.ModelsTag{
			At:          timePointer(createdAt),
			CreatorId:   intPointerFromInt64Pointer(createdBy),
			DeletedAt:   deletedAt,
			Id:          intPointer(id),
			Name:        stringPointer(name),
			WorkspaceId: intPointer(wid),
		})
	}
	return ctx.JSON(http.StatusOK, tags)
}

func (runtime *webRuntime) postPublicTrackClients(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	user, err := runtime.requirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.ClientPayload
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	name, ok := normalizedCatalogName(request.Name)
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	var id, wid int64
	var archived bool
	var createdBy *int64
	var createdAt time.Time
	if err := runtime.pool.QueryRow(
		ctx.Request().Context(),
		`insert into catalog_clients (workspace_id, name, created_by)
		values ($1, $2, $3)
		returning id, workspace_id, archived, created_by, created_at`,
		workspaceID,
		name,
		user.ID,
	).Scan(&id, &wid, &archived, &createdBy, &createdAt); err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, publictrackapi.ModelsClient{
		Archived:  boolPointer(archived),
		At:        timePointer(createdAt),
		CreatorId: intPointerFromInt64Pointer(createdBy),
		Id:        intPointer(id),
		Name:      stringPointer(name),
		Wid:       intPointer(wid),
	})
}

func (runtime *webRuntime) postPublicTrackGroups(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	user, err := runtime.requirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.GroupPayload
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	name, ok := normalizedCatalogName(request.Name)
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	var id, wid int64
	var hasUsers bool
	var createdAt time.Time
	if err := runtime.pool.QueryRow(
		ctx.Request().Context(),
		`insert into catalog_groups (workspace_id, name, created_by)
		values ($1, $2, $3)
		returning id, workspace_id, has_users, created_at`,
		workspaceID,
		name,
		user.ID,
	).Scan(&id, &wid, &hasUsers, &createdAt); err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, publictrackapi.GithubComTogglTogglApiInternalModelsGroup{
		At:          timePointer(createdAt),
		HasUsers:    boolPointer(hasUsers),
		Id:          intPointer(id),
		Name:        stringPointer(name),
		WorkspaceId: intPointer(wid),
	})
}

func (runtime *webRuntime) postPublicTrackTags(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	user, err := runtime.requirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.TagsPayload
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	name, ok := normalizedCatalogName(request.Name)
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	var id, wid int64
	var createdBy *int64
	var createdAt time.Time
	if err := runtime.pool.QueryRow(
		ctx.Request().Context(),
		`insert into catalog_tags (workspace_id, name, created_by)
		values ($1, $2, $3)
		returning id, workspace_id, created_by, created_at`,
		workspaceID,
		name,
		user.ID,
	).Scan(&id, &wid, &createdBy, &createdAt); err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, []publictrackapi.ModelsTag{{
		At:          timePointer(createdAt),
		CreatorId:   intPointerFromInt64Pointer(createdBy),
		Id:          intPointer(id),
		Name:        stringPointer(name),
		WorkspaceId: intPointer(wid),
	}})
}

func (runtime *webRuntime) postPublicTrackProjects(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	user, err := runtime.requirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.ProjectPayload
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	name, ok := normalizedCatalogName(request.Name)
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	clientID := int64PointerFromTrackIntPointer(request.ClientId)
	if clientID == nil {
		clientID = int64PointerFromTrackIntPointer(request.Cid)
	}
	active := boolValue(request.Active)
	if request.Active == nil {
		active = true
	}

	var projectID int64
	if err := runtime.pool.QueryRow(
		ctx.Request().Context(),
		`insert into catalog_projects (workspace_id, client_id, name, active, template, recurring, created_by)
		values ($1, $2, $3, $4, $5, $6, $7)
		returning id`,
		workspaceID,
		clientID,
		name,
		active,
		boolValue(request.Template),
		boolValue(request.Recurring),
		user.ID,
	).Scan(&projectID); err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}

	project, err := runtime.loadCatalogProject(ctx, workspaceID, projectID)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, project.toAPI())
}

func (runtime *webRuntime) putPublicTrackProject(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectID, ok := parsePathID(ctx, "project_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	project, err := runtime.loadCatalogProject(ctx, workspaceID, projectID)
	if err != nil {
		return err
	}

	var request publictrackapi.ProjectPayload
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if request.Name != nil {
		name, ok := normalizedCatalogName(request.Name)
		if !ok {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		project.Name = name
	}
	if request.Active != nil {
		project.Active = *request.Active
	}
	if request.Template != nil {
		project.Template = *request.Template
	}
	if request.Recurring != nil {
		project.Recurring = *request.Recurring
	}
	if request.ClientId != nil || request.Cid != nil {
		project.ClientID = int64PointerFromTrackIntPointer(request.ClientId)
		if project.ClientID == nil {
			project.ClientID = int64PointerFromTrackIntPointer(request.Cid)
		}
	}

	if _, err := runtime.pool.Exec(
		ctx.Request().Context(),
		`update catalog_projects
		set client_id = $3, name = $4, active = $5, template = $6, recurring = $7
		where workspace_id = $1 and id = $2`,
		workspaceID,
		projectID,
		project.ClientID,
		project.Name,
		project.Active,
		project.Template,
		project.Recurring,
	); err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}

	updated, err := runtime.loadCatalogProject(ctx, workspaceID, projectID)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, updated.toAPI())
}

func (runtime *webRuntime) postPublicTrackPinnedProject(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectID, ok := parsePathID(ctx, "project_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.ProjectsPinnedProjectPayload
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.loadCatalogProject(ctx, workspaceID, projectID); err != nil {
		return err
	}
	if _, err := runtime.pool.Exec(
		ctx.Request().Context(),
		"update catalog_projects set pinned = $3 where workspace_id = $1 and id = $2",
		workspaceID,
		projectID,
		boolValue(request.Pin),
	); err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}

	project, err := runtime.loadCatalogProject(ctx, workspaceID, projectID)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, project.toAPI())
}

func writePublicTrackCatalogError(ctx echo.Context, err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && (pgErr.Code == "23505" || pgErr.Code == "23503") {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	return ctx.JSON(http.StatusInternalServerError, "Internal Server Error")
}

func normalizedCatalogName(value *string) (string, bool) {
	if value == nil {
		return "", false
	}
	name := strings.TrimSpace(*value)
	return name, name != ""
}

func parseCSVInt64s(value string) ([]int64, error) {
	parts := strings.Split(value, ",")
	values := make([]int64, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		parsed, err := strconv.ParseInt(trimmed, 10, 64)
		if err != nil {
			return nil, err
		}
		values = append(values, parsed)
	}
	return values, nil
}

func projectOrderClause(sortField string, sortOrder string, sortPinned bool) string {
	orderParts := make([]string, 0, 3)
	if sortPinned {
		orderParts = append(orderParts, "p.pinned desc")
	}
	field := "lower(p.name)"
	if strings.EqualFold(sortField, "created_at") {
		field = "p.created_at"
	}
	direction := sortDirection(sortOrder)
	orderParts = append(orderParts, field+" "+direction, "p.id "+direction)
	return strings.Join(orderParts, ", ")
}

func taskOrderClause(sortField string, sortOrder string) string {
	field := "lower(t.name)"
	if strings.EqualFold(sortField, "created_at") {
		field = "t.created_at"
	}
	direction := sortDirection(sortOrder)
	return field + " " + direction + ", t.id " + direction
}

func defaultTaskSortField(value string) string {
	if strings.EqualFold(value, "created_at") {
		return "created_at"
	}
	return "name"
}

func sortDirection(value string) string {
	if strings.EqualFold(value, "desc") {
		return "DESC"
	}
	return "ASC"
}

func queryInt(ctx echo.Context, key string, fallback int) int {
	value := strings.TrimSpace(ctx.QueryParam(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func queryBool(ctx echo.Context, key string) (bool, bool) {
	value := strings.TrimSpace(ctx.QueryParam(key))
	if value == "" {
		return false, false
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false, false
	}
	return parsed, true
}

func queryBoolValue(ctx echo.Context, key string) bool {
	value, ok := queryBool(ctx, key)
	return ok && value
}

func boolPointer(value bool) *bool {
	return &value
}

func stringPointer(value string) *string {
	return &value
}

func intPointerFromInt(value int) *int {
	return &value
}

func intPointer(value int64) *int {
	converted := int(value)
	return &converted
}

func intPointerFromInt64Pointer(value *int64) *int {
	if value == nil {
		return nil
	}
	return intPointer(*value)
}

func timePointer(value time.Time) *string {
	formatted := value.UTC().Format(time.RFC3339)
	return &formatted
}

func datePointer(value time.Time) *string {
	formatted := value.UTC().Format("2006-01-02")
	return &formatted
}

func min(left int, right int) int {
	if left < right {
		return left
	}
	return right
}

func max(left int, right int) int {
	if left > right {
		return left
	}
	return right
}
