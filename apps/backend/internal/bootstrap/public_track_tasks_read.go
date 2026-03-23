package bootstrap

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

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

func defaultTaskSortField(value string) string {
	if strings.EqualFold(value, "created_at") {
		return "created_at"
	}
	return "name"
}
