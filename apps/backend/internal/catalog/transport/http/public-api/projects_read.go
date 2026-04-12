package publicapi

import (
	"encoding/json"
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

// trackProjectResponse wraps the generated project model to patch two
// wire-shape drifts between the oapi-codegen output and what official
// api.track.toggl.com emits:
//
//   - The codegen applied `omitempty` to a handful of nullable premium
//     fields (rate, fixed_fee, recurring_parameters). Upstream emits
//     those as explicit null when absent; omitempty strips them, which
//     breaks strict typed clients that deserialize them as required
//     nullable. Force-null on marshal fixes the shape.
//   - The codegen carries a `current_period` field that upstream does
//     not emit on /me/projects or /workspaces/{id}/projects. Drop it
//     from the marshalled output so our response is byte-for-byte
//     comparable.
//
// The workaround lives on the wrapper rather than on the generated
// struct so regeneration (which overwrites generated code) can't
// accidentally undo the patch. Keep the list of force-null and drop
// fields minimal — every entry here is an observed drift against the
// live upstream response, not a speculative tweak.
type trackProjectResponse struct {
	publictrackapi.GithubComTogglTogglApiInternalModelsProject
}

var trackProjectForceNullFields = []string{
	"rate",
	"fixed_fee",
	"recurring_parameters",
}

var trackProjectDropFields = []string{
	"current_period",
}

func (p trackProjectResponse) MarshalJSON() ([]byte, error) {
	raw, err := json.Marshal(p.GithubComTogglTogglApiInternalModelsProject)
	if err != nil {
		return nil, err
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &fields); err != nil {
		return nil, err
	}
	for _, key := range trackProjectForceNullFields {
		if _, present := fields[key]; !present {
			fields[key] = json.RawMessage("null")
		}
	}
	for _, key := range trackProjectDropFields {
		delete(fields, key)
	}
	return json.Marshal(fields)
}

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
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
		}
		users := make([]publictrackapi.ModelsProjectUser, 0, len(views))
		for _, view := range views {
			users = append(users, projectUserViewToAPI(view))
		}
		return ctx.JSON(http.StatusOK, users)
	}

	views, err := handler.catalog.ListProjectUsers(ctx.Request().Context(), workspaceID, catalogapplication.ListProjectUsersFilter{})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
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
	workspaceIDs, err := handler.publicTrackWorkspaceIDs(ctx)
	if err != nil {
		return err
	}
	_, pathScoped := parsePathID(ctx, "workspace_id")

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
	} else if !pathScoped {
		// Official /me/projects only returns active projects unless the
		// caller explicitly opts in via include_archived=true. The
		// workspace-scoped /workspaces/{id}/projects keeps its existing
		// "return everything" default because Toggl's own workspace list
		// includes archived projects too.
		includeArchived, _ := queryBool(ctx, "include_archived")
		if !includeArchived {
			filter.Active = lo.ToPtr(true)
		}
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

	projects := make([]trackProjectResponse, 0)
	for _, workspaceID := range workspaceIDs {
		views, err := handler.catalog.ListProjects(ctx.Request().Context(), workspaceID, filter)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
		}
		for _, view := range views {
			projects = append(projects, trackProjectResponse{projectViewToAPI(view)})
		}
	}
	return ctx.JSON(http.StatusOK, projects)
}

func (handler *Handler) GetPublicTrackProjectTemplates(ctx echo.Context) error {
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	workspaceIDs, err := handler.publicTrackWorkspaceIDs(ctx)
	if err != nil {
		return err
	}

	projects := make([]trackProjectResponse, 0)
	for _, workspaceID := range workspaceIDs {
		views, err := handler.catalog.ListProjects(ctx.Request().Context(), workspaceID, catalogapplication.ListProjectsFilter{
			OnlyTemplates: true,
			Page:          1,
			PerPage:       200,
		})
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
		}
		for _, view := range views {
			projects = append(projects, trackProjectResponse{projectViewToAPI(view)})
		}
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
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	return ctx.JSON(http.StatusOK, trackProjectResponse{projectViewToAPI(view)})
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
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
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
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	return ctx.JSON(http.StatusOK, projectCountsToAPI(projectIDs, counts))
}

func projectUserViewToAPI(view catalogapplication.ProjectUserView) publictrackapi.ModelsProjectUser {
	return publictrackapi.ModelsProjectUser{
		At:          timePointer(view.CreatedAt),
		Id:          lo.ToPtr(int(catalogapplication.EncodeProjectUserID(view.ProjectID, view.UserID))),
		Manager:     lo.ToPtr(view.Role == "admin"),
		ProjectId:   lo.ToPtr(int(view.ProjectID)),
		UserId:      lo.ToPtr(int(view.UserID)),
		WorkspaceId: lo.ToPtr(int(view.WorkspaceID)),
	}
}

func projectViewToAPI(view catalogapplication.ProjectView) publictrackapi.GithubComTogglTogglApiInternalModelsProject {
	status := lo.ToPtr(publictrackapi.ModelsProjectStatus("active"))
	if !view.Active {
		status = lo.ToPtr(publictrackapi.ModelsProjectStatus("archived"))
	}

	// Toggl reports actual_hours and actual_seconds as null when the
	// project has never been tracked against, and as integers when
	// there is time data (e.g. actual_hours=1 paired with
	// actual_seconds=4413, integer truncation). Our domain stores
	// ActualSeconds as a non-nullable int64 with 0 for untracked, so
	// treat zero as "untracked" and emit null for both fields, then
	// derive actual_hours via integer division for non-zero values.
	// total_count is always emitted on list responses; upstream returns
	// 0 for accounts without paginated analytics, which matches what
	// we can promise today.
	var actualHours, actualSeconds *int
	if view.ActualSeconds > 0 {
		actualSeconds = lo.ToPtr(int(view.ActualSeconds))
		actualHours = lo.ToPtr(int(view.ActualSeconds / 3600))
	}
	var estimatedHours *int
	if view.EstimatedSeconds != nil {
		estimatedHours = lo.ToPtr(int(*view.EstimatedSeconds / 3600))
	}

	project := publictrackapi.GithubComTogglTogglApiInternalModelsProject{
		Active:           lo.ToPtr(view.Active),
		ActualHours:      actualHours,
		ActualSeconds:    actualSeconds,
		At:               timePointer(view.CreatedAt),
		Billable:         lo.ToPtr(view.Billable),
		CanTrackTime:     lo.ToPtr(view.Active),
		ClientId:         intPointerFromInt64Pointer(view.ClientID),
		ClientName:       view.ClientName,
		Color:            lo.ToPtr(view.Color),
		CreatedAt:        timePointer(view.CreatedAt),
		Id:               lo.ToPtr(int(view.ID)),
		IsPrivate:        lo.ToPtr(view.IsPrivate),
		Name:             lo.ToPtr(view.Name),
		Pinned:           lo.ToPtr(view.Pinned),
		Recurring:        lo.ToPtr(view.Recurring),
		ServerDeletedAt:  nil,
		StartDate:        resolveProjectStartDate(view),
		Status:           status,
		Template:         lo.ToPtr(view.Template),
		TotalCount:       lo.ToPtr(0),
		Wid:              lo.ToPtr(int(view.WorkspaceID)),
		WorkspaceId:      lo.ToPtr(int(view.WorkspaceID)),
		Currency:         view.Currency,
		EstimatedHours:   estimatedHours,
		EstimatedSeconds: intPointerFromInt64Pointer(view.EstimatedSeconds),
		FixedFee:         float32PointerFromFloat64(view.FixedFee),
		Rate:             float32PointerFromFloat64(view.Rate),
	}
	if view.EndDate != nil {
		project.EndDate = datePointer(*view.EndDate)
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

func resolveProjectStartDate(view catalogapplication.ProjectView) *string {
	if view.StartDate != nil {
		return datePointer(*view.StartDate)
	}
	return datePointer(view.CreatedAt)
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
