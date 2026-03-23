package publicapi

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) GetPublicTrackProjectUsers(ctx echo.Context) error {
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

	if raw := strings.TrimSpace(ctx.QueryParam("project_ids")); raw != "" {
		projectIDs, err := parseCSVInt64s(raw)
		if err != nil {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		views, err := handler.catalog.ListProjectUsers(ctx.Request().Context(), workspaceID, catalogapplication.ListProjectUsersFilter{
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

	views, err := handler.catalog.ListProjectUsers(ctx.Request().Context(), workspaceID, catalogapplication.ListProjectUsersFilter{})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	users := make([]publictrackapi.ModelsProjectUser, 0, len(views))
	for _, view := range views {
		users = append(users, projectUserViewToAPI(view))
	}
	return ctx.JSON(http.StatusOK, users)
}

func (handler *Handler) GetPublicTrackProjects(ctx echo.Context) error {
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	workspaceID, err := handler.publicTrackWorkspaceID(ctx)
	if err != nil {
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

	views, err := handler.catalog.ListProjects(ctx.Request().Context(), workspaceID, filter)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	projects := make([]publictrackapi.GithubComTogglTogglApiInternalModelsProject, 0, len(views))
	for _, view := range views {
		projects = append(projects, projectViewToAPI(view))
	}
	return ctx.JSON(http.StatusOK, projects)
}

func (handler *Handler) GetPublicTrackProjectTemplates(ctx echo.Context) error {
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	workspaceID, err := handler.publicTrackWorkspaceID(ctx)
	if err != nil {
		return err
	}

	views, err := handler.catalog.ListProjects(ctx.Request().Context(), workspaceID, catalogapplication.ListProjectsFilter{
		OnlyTemplates: true,
		Page:          1,
		PerPage:       200,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	projects := make([]publictrackapi.GithubComTogglTogglApiInternalModelsProject, 0, len(views))
	for _, view := range views {
		projects = append(projects, projectViewToAPI(view))
	}
	return ctx.JSON(http.StatusOK, projects)
}

func (handler *Handler) GetPublicTrackProject(ctx echo.Context) error {
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

	view, err := handler.catalog.GetProject(ctx.Request().Context(), workspaceID, projectID)
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}
	return ctx.JSON(http.StatusOK, projectViewToAPI(view))
}

func (handler *Handler) GetPublicTrackProjectRecurringPeriod(ctx echo.Context) error {
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

	startDate, err := optionalTrackDate(ctx.QueryParam("start_date"))
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	endDate, err := optionalTrackDate(ctx.QueryParam("end_date"))
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	period, err := handler.catalog.GetProjectRecurringPeriod(ctx.Request().Context(), workspaceID, projectID, startDate, endDate)
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}
	if period == nil {
		return ctx.JSON(http.StatusOK, publictrackapi.ModelsRecurringPeriod{})
	}
	return ctx.JSON(http.StatusOK, publictrackapi.ModelsRecurringPeriod{
		StartDate: datePointer(period.StartDate),
		EndDate:   datePointer(period.EndDate),
	})
}

func (handler *Handler) ProjectTaskCount(ctx echo.Context) error {
	return handler.publicTrackProjectCount(ctx, func(ctx echo.Context, workspaceID int64, projectIDs []int64) ([]catalogapplication.ProjectCountView, error) {
		return handler.catalog.CountProjectTasks(ctx.Request().Context(), workspaceID, projectIDs)
	})
}

func (handler *Handler) ProjectUserCount(ctx echo.Context) error {
	return handler.publicTrackProjectCount(ctx, func(ctx echo.Context, workspaceID int64, projectIDs []int64) ([]catalogapplication.ProjectCountView, error) {
		return handler.catalog.CountProjectUsers(ctx.Request().Context(), workspaceID, projectIDs)
	})
}

func (handler *Handler) publicTrackProjectCount(
	ctx echo.Context,
	count func(echo.Context, int64, []int64) ([]catalogapplication.ProjectCountView, error),
) error {
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
		Id:          lo.ToPtr(int(view.ProjectID*1000000 + view.UserID)),
		Manager:     lo.ToPtr(view.Role == "admin"),
		ProjectId:   lo.ToPtr(int(view.ProjectID)),
		UserId:      lo.ToPtr(int(view.UserID)),
		WorkspaceId: lo.ToPtr(int(view.WorkspaceID)),
	}
}

func projectViewToAPI(view catalogapplication.ProjectView) publictrackapi.GithubComTogglTogglApiInternalModelsProject {
	project := publictrackapi.GithubComTogglTogglApiInternalModelsProject{
		Active:        lo.ToPtr(view.Active),
		ActualSeconds: lo.ToPtr(int(view.ActualSeconds)),
		At:            timePointer(view.CreatedAt),
		CanTrackTime:  lo.ToPtr(view.Active),
		ClientId:      intPointerFromInt64Pointer(view.ClientID),
		ClientName:    view.ClientName,
		CreatedAt:     timePointer(view.CreatedAt),
		Id:            lo.ToPtr(int(view.ID)),
		Name:          lo.ToPtr(view.Name),
		Pinned:        lo.ToPtr(view.Pinned),
		Recurring:     lo.ToPtr(view.Recurring),
		Template:      lo.ToPtr(view.Template),
		Wid:           lo.ToPtr(int(view.WorkspaceID)),
		WorkspaceId:   lo.ToPtr(int(view.WorkspaceID)),
	}
	if view.ClientID != nil {
		project.Cid = lo.ToPtr(int(*view.ClientID))
	}
	if view.Recurring && view.PeriodStart != nil && view.PeriodEnd != nil {
		project.CurrentPeriod = &publictrackapi.ModelsRecurringPeriod{
			StartDate: datePointer(*view.PeriodStart),
			EndDate:   datePointer(*view.PeriodEnd),
		}
	}
	return project
}

func optionalTrackDate(value string) (*time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}
