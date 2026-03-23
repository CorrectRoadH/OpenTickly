package publicapi

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) GetPublicTrackTasksBasic(ctx echo.Context) error {
	pageView, err := handler.listPublicTrackTasks(ctx, publicTrackTaskListQuery{
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
		Page:       lo.ToPtr(pageView.Page),
		PerPage:    lo.ToPtr(pageView.PerPage),
		SortField:  lo.ToPtr(defaultTaskSortField(string(pageView.SortField))),
		SortOrder:  lo.ToPtr(string(pageView.SortOrder)),
		TotalCount: lo.ToPtr(pageView.TotalCount),
	})
}

func (handler *Handler) GetPublicTrackTasks(ctx echo.Context) error {
	pageView, err := handler.listPublicTrackTasks(ctx, publicTrackTaskListQuery{
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
		Page:       lo.ToPtr(pageView.Page),
		PerPage:    lo.ToPtr(pageView.PerPage),
		SortField:  lo.ToPtr(defaultTaskSortField(string(pageView.SortField))),
		SortOrder:  lo.ToPtr(string(pageView.SortOrder)),
		TotalCount: lo.ToPtr(pageView.TotalCount),
	})
}

func (handler *Handler) GetPublicTrackWorkspaceTasksData(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	pageView, err := handler.catalog.ListTasks(ctx.Request().Context(), workspaceID, catalogapplication.ListTasksFilter{
		Page:    max(queryInt(ctx, "page", 1), 1),
		PerPage: max(min(queryInt(ctx, "per_page", 50), 200), 1),
		Search:  ctx.QueryParam("search"),
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	tasks := make([]publictrackapi.ModelsTask, 0, len(pageView.Tasks))
	for _, view := range pageView.Tasks {
		tasks = append(tasks, taskViewToAPI(view))
	}

	return ctx.JSON(http.StatusOK, publictrackapi.TaskResponse{
		Data:       &tasks,
		Page:       lo.ToPtr(pageView.Page),
		PerPage:    lo.ToPtr(pageView.PerPage),
		SortField:  lo.ToPtr(defaultTaskSortField(string(pageView.SortField))),
		SortOrder:  lo.ToPtr(string(pageView.SortOrder)),
		TotalCount: lo.ToPtr(pageView.TotalCount),
	})
}

func (handler *Handler) GetPublicTrackProjectTasks(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectID, ok := parsePathID(ctx, "project_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	if _, err := handler.catalog.GetProject(ctx.Request().Context(), workspaceID, projectID); err != nil {
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
			filter.Active = lo.ToPtr(true)
			filter.IncludeAll = false
		}
	}

	pageView, err := handler.catalog.ListTasks(ctx.Request().Context(), workspaceID, filter)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	tasks := make([]publictrackapi.ModelsTask, 0, len(pageView.Tasks))
	for _, view := range pageView.Tasks {
		tasks = append(tasks, taskViewToAPI(view))
	}

	return ctx.JSON(http.StatusOK, tasks)
}

func (handler *Handler) GetPublicTrackProjectTask(ctx echo.Context) error {
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
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	view, err := handler.catalog.GetTask(ctx.Request().Context(), workspaceID, projectID, taskID)
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

func (handler *Handler) listPublicTrackTasks(
	ctx echo.Context,
	query publicTrackTaskListQuery,
) (catalogapplication.TaskPage, error) {
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return catalogapplication.TaskPage{}, err
	}
	workspaceID, err := handler.publicTrackWorkspaceID(ctx)
	if err != nil {
		return catalogapplication.TaskPage{}, err
	}

	filter := catalogapplication.ListTasksFilter{
		Page:    max(queryInt(ctx, "page", 1), 1),
		PerPage: max(min(queryInt(ctx, "per_page", query.defaultPerPage), 200), 1),
	}
	if activeValue := strings.TrimSpace(ctx.QueryParam("active")); activeValue == "" {
		if query.requireActive {
			filter.Active = lo.ToPtr(true)
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

	pageView, err := handler.catalog.ListTasks(ctx.Request().Context(), workspaceID, filter)
	if err != nil {
		return catalogapplication.TaskPage{}, echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}
	return pageView, nil
}

func taskViewToAPI(view catalogapplication.TaskView) publictrackapi.ModelsTask {
	return publictrackapi.ModelsTask{
		Active:      lo.ToPtr(view.Active),
		Id:          lo.ToPtr(int(view.ID)),
		Name:        lo.ToPtr(view.Name),
		ProjectId:   intPointerFromInt64Pointer(view.ProjectID),
		ProjectName: view.ProjectName,
		WorkspaceId: lo.ToPtr(int(view.WorkspaceID)),
	}
}

func defaultTaskSortField(value string) string {
	if strings.EqualFold(value, "created_at") {
		return "created_at"
	}
	return "name"
}
