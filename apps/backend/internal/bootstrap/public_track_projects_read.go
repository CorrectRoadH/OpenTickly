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

func (runtime *webRuntime) projectTaskCount(ctx echo.Context) error {
	return runtime.publicTrackProjectCount(ctx, func(ctx echo.Context, workspaceID int64, projectIDs []int64) ([]catalogapplication.ProjectCountView, error) {
		return runtime.catalogApp.CountProjectTasks(ctx.Request().Context(), workspaceID, projectIDs)
	})
}

func (runtime *webRuntime) projectUserCount(ctx echo.Context) error {
	return runtime.publicTrackProjectCount(ctx, func(ctx echo.Context, workspaceID int64, projectIDs []int64) ([]catalogapplication.ProjectCountView, error) {
		return runtime.catalogApp.CountProjectUsers(ctx.Request().Context(), workspaceID, projectIDs)
	})
}

func (runtime *webRuntime) publicTrackProjectCount(
	ctx echo.Context,
	count func(echo.Context, int64, []int64) ([]catalogapplication.ProjectCountView, error),
) error {
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

	var request publictrackapi.ProjectsTaskCountPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	projectIDs := make([]int64, 0)
	if request.ProjectIds != nil {
		projectIDs = intsToInt64s(*request.ProjectIds)
	}

	counts, err := count(ctx, workspaceID, projectIDs)
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	return ctx.JSON(http.StatusOK, projectCountsToAPI(projectIDs, counts))
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
