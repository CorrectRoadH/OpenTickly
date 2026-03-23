package bootstrap

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
)

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

	status, err := publicTrackClientStatus(ctx.QueryParam("status"))
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	views, err := runtime.catalogApp.ListClients(ctx.Request().Context(), workspaceID, catalogapplication.ListClientsFilter{
		Name:   ctx.QueryParam("name"),
		Status: status,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	clients := make([]publictrackapi.ModelsClient, 0, len(views))
	for _, view := range views {
		clients = append(clients, clientViewToAPI(view))
	}
	return ctx.JSON(http.StatusOK, clients)
}

func (runtime *webRuntime) getPublicTrackClient(ctx echo.Context) error {
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

	view, err := runtime.catalogApp.GetClient(ctx.Request().Context(), workspaceID, clientID)
	if err != nil {
		if errors.Is(err, catalogapplication.ErrClientNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}
	return ctx.JSON(http.StatusOK, clientViewToAPI(view))
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

	if raw := strings.TrimSpace(ctx.QueryParam("project_ids")); raw != "" {
		projectIDs, err := parseCSVInt64s(raw)
		if err != nil {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		views, err := runtime.catalogApp.ListProjectUsers(ctx.Request().Context(), workspaceID, catalogapplication.ListProjectUsersFilter{
			ProjectIDs: projectIDs,
		})
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
		}
		users := make([]publictrackapi.ModelsProjectUser, 0, len(views))
		for _, view := range views {
			users = append(users, projectUserViewToAPI(view))
		}
		return ctx.JSON(http.StatusOK, users)
	}

	views, err := runtime.catalogApp.ListProjectUsers(ctx.Request().Context(), workspaceID, catalogapplication.ListProjectUsersFilter{})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	users := make([]publictrackapi.ModelsProjectUser, 0, len(views))
	for _, view := range views {
		users = append(users, projectUserViewToAPI(view))
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

	filter := catalogapplication.ListProjectsFilter{
		Page:       max(queryInt(ctx, "page", 1), 1),
		PerPage:    max(min(queryInt(ctx, "per_page", 151), 200), 1),
		SortPinned: queryBoolValue(ctx, "sort_pinned"),
	}
	if activeValue := strings.TrimSpace(ctx.QueryParam("active")); activeValue != "" {
		active, err := strconv.ParseBool(activeValue)
		if err != nil {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		filter.Active = &active
	}
	if onlyTemplates, ok := queryBool(ctx, "only_templates"); ok && onlyTemplates {
		filter.OnlyTemplates = true
	}
	if strings.EqualFold(ctx.QueryParam("sort_field"), "created_at") {
		filter.SortField = catalogapplication.ProjectSortFieldCreatedAt
	}
	if strings.EqualFold(ctx.QueryParam("sort_order"), "desc") {
		filter.SortOrder = catalogapplication.SortOrderDescending
	}
	filter.Name = ctx.QueryParam("name")
	filter.Search = ctx.QueryParam("search")

	views, err := runtime.catalogApp.ListProjects(ctx.Request().Context(), workspaceID, filter)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	projects := make([]publictrackapi.GithubComTogglTogglApiInternalModelsProject, 0, len(views))
	for _, view := range views {
		projects = append(projects, projectViewToAPI(view))
	}
	return ctx.JSON(http.StatusOK, projects)
}

func (runtime *webRuntime) getPublicTrackProject(ctx echo.Context) error {
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

	view, err := runtime.catalogApp.GetProject(ctx.Request().Context(), workspaceID, projectID)
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}
	return ctx.JSON(http.StatusOK, projectViewToAPI(view))
}

func (runtime *webRuntime) getPublicTrackTasksBasic(ctx echo.Context) error {
	pageView, err := runtime.listPublicTrackTasks(ctx, publicTrackTaskListQuery{
		projectQueryKey: "project_id",
		requireActive:   true,
		defaultPerPage:  50,
	})
	if err != nil {
		return err
	}

	tasks := make([]publictrackapi.ModelsTask, 0, len(pageView.Tasks))
	for _, view := range pageView.Tasks {
		tasks = append(tasks, taskViewToAPI(view))
	}

	return ctx.JSON(http.StatusOK, publictrackapi.TaskResponse{
		Data:       &tasks,
		Page:       intPointerFromInt(pageView.Page),
		PerPage:    intPointerFromInt(pageView.PerPage),
		SortField:  stringPointer(defaultTaskSortField(string(pageView.SortField))),
		SortOrder:  stringPointer(string(pageView.SortOrder)),
		TotalCount: intPointerFromInt(pageView.TotalCount),
	})
}

func (runtime *webRuntime) getPublicTrackTasks(ctx echo.Context) error {
	pageView, err := runtime.listPublicTrackTasks(ctx, publicTrackTaskListQuery{
		projectQueryKey: "pid",
		defaultPerPage:  50,
	})
	if err != nil {
		return err
	}

	tasks := make([]publictrackapi.ModelsTask, 0, len(pageView.Tasks))
	for _, view := range pageView.Tasks {
		tasks = append(tasks, taskViewToAPI(view))
	}

	return ctx.JSON(http.StatusOK, publictrackapi.TaskResponse{
		Data:       &tasks,
		Page:       intPointerFromInt(pageView.Page),
		PerPage:    intPointerFromInt(pageView.PerPage),
		SortField:  stringPointer(defaultTaskSortField(string(pageView.SortField))),
		SortOrder:  stringPointer(string(pageView.SortOrder)),
		TotalCount: intPointerFromInt(pageView.TotalCount),
	})
}

func (runtime *webRuntime) getPublicTrackProjectTasks(ctx echo.Context) error {
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
	if _, err := runtime.catalogApp.GetProject(ctx.Request().Context(), workspaceID, projectID); err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	filter := catalogapplication.ListTasksFilter{
		Page:       1,
		PerPage:    200,
		IncludeAll: true,
		ProjectID:  &projectID,
	}
	if activeValue := strings.TrimSpace(ctx.QueryParam("active")); activeValue != "" {
		active, err := strconv.ParseBool(activeValue)
		if err != nil {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		if active {
			filter.Active = boolPtr(true)
			filter.IncludeAll = false
		}
	}

	pageView, err := runtime.catalogApp.ListTasks(ctx.Request().Context(), workspaceID, filter)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	tasks := make([]publictrackapi.ModelsTask, 0, len(pageView.Tasks))
	for _, view := range pageView.Tasks {
		tasks = append(tasks, taskViewToAPI(view))
	}

	return ctx.JSON(http.StatusOK, tasks)
}

func (runtime *webRuntime) getPublicTrackProjectTask(ctx echo.Context) error {
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

	view, err := runtime.catalogApp.GetTask(ctx.Request().Context(), workspaceID, projectID, taskID)
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) || errors.Is(err, catalogapplication.ErrTaskNotFound) {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}
	return ctx.JSON(http.StatusOK, taskViewToAPI(view))
}

type publicTrackTaskListQuery struct {
	projectQueryKey string
	requireActive   bool
	defaultPerPage  int
}

func (runtime *webRuntime) listPublicTrackTasks(
	ctx echo.Context,
	query publicTrackTaskListQuery,
) (catalogapplication.TaskPage, error) {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return catalogapplication.TaskPage{}, echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return catalogapplication.TaskPage{}, err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return catalogapplication.TaskPage{}, err
	}

	filter := catalogapplication.ListTasksFilter{
		Page:    max(queryInt(ctx, "page", 1), 1),
		PerPage: max(min(queryInt(ctx, "per_page", query.defaultPerPage), 200), 1),
	}
	if activeValue := strings.TrimSpace(ctx.QueryParam("active")); activeValue == "" {
		if query.requireActive {
			filter.Active = boolPtr(true)
		}
	} else if strings.EqualFold(activeValue, "both") {
		filter.IncludeAll = true
	} else {
		active, err := strconv.ParseBool(activeValue)
		if err != nil {
			return catalogapplication.TaskPage{}, echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
		}
		filter.Active = &active
	}
	if query.projectQueryKey != "" {
		if projectID := strings.TrimSpace(ctx.QueryParam(query.projectQueryKey)); projectID != "" {
			parsed, err := strconv.ParseInt(projectID, 10, 64)
			if err != nil {
				return catalogapplication.TaskPage{}, echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
			}
			filter.ProjectID = &parsed
		}
	}
	if strings.EqualFold(ctx.QueryParam("sort_field"), "created_at") {
		filter.SortField = catalogapplication.TaskSortFieldCreatedAt
	}
	if strings.EqualFold(ctx.QueryParam("sort_order"), "desc") {
		filter.SortOrder = catalogapplication.SortOrderDescending
	}
	filter.Search = ctx.QueryParam("search")

	pageView, err := runtime.catalogApp.ListTasks(ctx.Request().Context(), workspaceID, filter)
	if err != nil {
		return catalogapplication.TaskPage{}, echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}
	return pageView, nil
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

func clientViewToAPI(view catalogapplication.ClientView) publictrackapi.ModelsClient {
	return publictrackapi.ModelsClient{
		Archived:  boolPointer(view.Archived),
		At:        timePointer(view.CreatedAt),
		CreatorId: intPointerFromInt64Pointer(view.CreatedBy),
		Id:        intPointer(view.ID),
		Name:      stringPointer(view.Name),
		Wid:       intPointer(view.WorkspaceID),
	}
}

func projectUserViewToAPI(view catalogapplication.ProjectUserView) publictrackapi.ModelsProjectUser {
	return publictrackapi.ModelsProjectUser{
		At:          timePointer(view.CreatedAt),
		Id:          intPointer(view.ProjectID*1000000 + view.UserID),
		Manager:     boolPointer(view.Role == "admin"),
		ProjectId:   intPointer(view.ProjectID),
		UserId:      intPointer(view.UserID),
		WorkspaceId: intPointer(view.WorkspaceID),
	}
}

func projectViewToAPI(view catalogapplication.ProjectView) publictrackapi.GithubComTogglTogglApiInternalModelsProject {
	project := publictrackapi.GithubComTogglTogglApiInternalModelsProject{
		Active:        boolPointer(view.Active),
		ActualSeconds: intPointer(view.ActualSeconds),
		At:            timePointer(view.CreatedAt),
		CanTrackTime:  boolPointer(view.Active),
		ClientId:      intPointerFromInt64Pointer(view.ClientID),
		ClientName:    view.ClientName,
		CreatedAt:     timePointer(view.CreatedAt),
		Id:            intPointer(view.ID),
		Name:          stringPointer(view.Name),
		Pinned:        boolPointer(view.Pinned),
		Recurring:     boolPointer(view.Recurring),
		Template:      boolPointer(view.Template),
		Wid:           intPointer(view.WorkspaceID),
		WorkspaceId:   intPointer(view.WorkspaceID),
	}
	if view.ClientID != nil {
		project.Cid = intPointer(*view.ClientID)
	}
	if view.Recurring && view.PeriodStart != nil && view.PeriodEnd != nil {
		project.CurrentPeriod = &publictrackapi.ModelsRecurringPeriod{
			StartDate: datePointer(*view.PeriodStart),
			EndDate:   datePointer(*view.PeriodEnd),
		}
	}
	return project
}

func taskViewToAPI(view catalogapplication.TaskView) publictrackapi.ModelsTask {
	return publictrackapi.ModelsTask{
		Active:      boolPointer(view.Active),
		Id:          intPointer(view.ID),
		Name:        stringPointer(view.Name),
		ProjectId:   intPointerFromInt64Pointer(view.ProjectID),
		ProjectName: view.ProjectName,
		WorkspaceId: intPointer(view.WorkspaceID),
	}
}

func publicTrackClientStatus(value string) (catalogapplication.ClientStatus, error) {
	switch strings.TrimSpace(value) {
	case "":
		return catalogapplication.ClientStatusActive, nil
	case "both":
		return catalogapplication.ClientStatusBoth, nil
	case "active":
		return catalogapplication.ClientStatusActive, nil
	case "archived":
		return catalogapplication.ClientStatusArchived, nil
	default:
		return "", strconv.ErrSyntax
	}
}
