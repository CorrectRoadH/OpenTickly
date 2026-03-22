package bootstrap

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
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

	views, err := runtime.catalogApp.ListGroups(ctx.Request().Context(), workspaceID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	groups := make([]publictrackapi.GithubComTogglTogglApiInternalModelsGroup, 0, len(views))
	for _, view := range views {
		groups = append(groups, groupViewToAPI(view))
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

	views, err := runtime.catalogApp.ListTags(ctx.Request().Context(), workspaceID, catalogapplication.ListTagsFilter{
		Search:  ctx.QueryParam("search"),
		Page:    max(queryInt(ctx, "page", 1), 1),
		PerPage: max(min(queryInt(ctx, "per_page", 200), 200), 1),
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	tags := make([]publictrackapi.ModelsTag, 0, len(views))
	for _, view := range views {
		tags = append(tags, tagViewToAPI(view))
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
	view, err := runtime.catalogApp.CreateClient(ctx.Request().Context(), catalogapplication.CreateClientCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   user.ID,
		Name:        stringValue(request.Name),
	})
	if err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, clientViewToAPI(view))
}

func (runtime *webRuntime) putPublicTrackClient(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	clientID, ok := parsePathID(ctx, "client_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.ClientPayload
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	view, err := runtime.catalogApp.UpdateClient(ctx.Request().Context(), catalogapplication.UpdateClientCommand{
		WorkspaceID: workspaceID,
		ClientID:    clientID,
		Name:        request.Name,
	})
	if err != nil {
		if errors.Is(err, catalogapplication.ErrClientNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, clientViewToAPI(view))
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
	view, err := runtime.catalogApp.CreateGroup(ctx.Request().Context(), catalogapplication.CreateGroupCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   user.ID,
		Name:        stringValue(request.Name),
	})
	if err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, groupViewToAPI(view))
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
	view, err := runtime.catalogApp.CreateTag(ctx.Request().Context(), catalogapplication.CreateTagCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   user.ID,
		Name:        stringValue(request.Name),
	})
	if err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, []publictrackapi.ModelsTag{tagViewToAPI(view)})
}

func (runtime *webRuntime) putPublicTrackTag(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	tagID, ok := parsePathID(ctx, "tag_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.TagsPayload
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	view, err := runtime.catalogApp.UpdateTag(ctx.Request().Context(), catalogapplication.UpdateTagCommand{
		WorkspaceID: workspaceID,
		TagID:       tagID,
		Name:        request.Name,
	})
	if err != nil {
		if errors.Is(err, catalogapplication.ErrTagNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, []publictrackapi.ModelsTag{tagViewToAPI(view)})
}

func (runtime *webRuntime) deletePublicTrackTag(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	tagID, ok := parsePathID(ctx, "tag_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	if err := runtime.catalogApp.DeleteTag(ctx.Request().Context(), workspaceID, tagID); err != nil {
		if errors.Is(err, catalogapplication.ErrTagNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, "OK")
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
	clientID := int64PointerFromTrackIntPointer(request.ClientId)
	if clientID == nil {
		clientID = int64PointerFromTrackIntPointer(request.Cid)
	}
	view, err := runtime.catalogApp.CreateProject(ctx.Request().Context(), catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   user.ID,
		ClientID:    clientID,
		Name:        stringValue(request.Name),
		Active:      request.Active,
		Template:    request.Template,
		Recurring:   request.Recurring,
	})
	if err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, projectViewToAPI(view))
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

	var request publictrackapi.ProjectPayload
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	command := catalogapplication.UpdateProjectCommand{
		WorkspaceID: workspaceID,
		ProjectID:   projectID,
		Name:        request.Name,
		Active:      request.Active,
		Template:    request.Template,
		Recurring:   request.Recurring,
	}
	if request.ClientId != nil || request.Cid != nil {
		command.ClientID = int64PointerFromTrackIntPointer(request.ClientId)
		if command.ClientID == nil {
			command.ClientID = int64PointerFromTrackIntPointer(request.Cid)
		}
	}

	updated, err := runtime.catalogApp.UpdateProject(ctx.Request().Context(), command)
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, projectViewToAPI(updated))
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
	project, err := runtime.catalogApp.SetProjectPinned(ctx.Request().Context(), catalogapplication.SetProjectPinnedCommand{
		WorkspaceID: workspaceID,
		ProjectID:   projectID,
		Pinned:      boolValue(request.Pin),
	})
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, projectViewToAPI(project))
}

func (runtime *webRuntime) postPublicTrackProjectTask(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectID, ok := parsePathID(ctx, "project_id")
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

	var request publictrackapi.TaskPayload
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	task, err := runtime.catalogApp.CreateTask(ctx.Request().Context(), catalogapplication.CreateTaskCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   user.ID,
		ProjectID:   &projectID,
		Name:        stringValue(request.Name),
		Active:      request.Active,
	})
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
		}
		return writePublicTrackCatalogError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, taskViewToAPI(task))
}

func (runtime *webRuntime) putPublicTrackProjectTask(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectID, ok := parsePathID(ctx, "project_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	taskID, ok := parsePathID(ctx, "task_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.TaskPayload
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	task, err := runtime.catalogApp.UpdateTask(ctx.Request().Context(), catalogapplication.UpdateTaskCommand{
		WorkspaceID: workspaceID,
		ProjectID:   projectID,
		TaskID:      taskID,
		Name:        request.Name,
		Active:      request.Active,
	})
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) || errors.Is(err, catalogapplication.ErrTaskNotFound) {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, taskViewToAPI(task))
}

func (runtime *webRuntime) deletePublicTrackProjectTask(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectID, ok := parsePathID(ctx, "project_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	taskID, ok := parsePathID(ctx, "task_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	if err := runtime.catalogApp.DeleteTask(ctx.Request().Context(), workspaceID, projectID, taskID); err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) || errors.Is(err, catalogapplication.ErrTaskNotFound) {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func writePublicTrackCatalogError(ctx echo.Context, err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && (pgErr.Code == "23505" || pgErr.Code == "23503") {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	}
	return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
}

func groupViewToAPI(view catalogapplication.GroupView) publictrackapi.GithubComTogglTogglApiInternalModelsGroup {
	return publictrackapi.GithubComTogglTogglApiInternalModelsGroup{
		At:          timePointer(view.CreatedAt),
		HasUsers:    boolPointer(view.HasUsers),
		Id:          intPointer(view.ID),
		Name:        stringPointer(view.Name),
		WorkspaceId: intPointer(view.WorkspaceID),
	}
}

func tagViewToAPI(view catalogapplication.TagView) publictrackapi.ModelsTag {
	return publictrackapi.ModelsTag{
		At:          timePointer(view.CreatedAt),
		CreatorId:   intPointerFromInt64Pointer(view.CreatedBy),
		DeletedAt:   view.DeletedAt,
		Id:          intPointer(view.ID),
		Name:        stringPointer(view.Name),
		WorkspaceId: intPointer(view.WorkspaceID),
	}
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
