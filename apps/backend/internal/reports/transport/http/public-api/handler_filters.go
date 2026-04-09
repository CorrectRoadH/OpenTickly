package publicapi

import (
	"net/http"
	"slices"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publicreportsapi "opentoggl/backend/apps/backend/internal/http/generated/publicreports"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func trackingListFilter(_ *identityapplication.UserSnapshot) trackingapplication.ListTimeEntriesFilter {
	return trackingapplication.ListTimeEntriesFilter{
		IncludeAll: true,
	}
}

// ---------------------------------------------------------------------------
// Filters: Clients
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdFiltersClients(
	ctx echo.Context,
	workspaceID int,
) error {
	if _, err := handler.requireReportsScope(ctx, int64(workspaceID)); err != nil {
		return err
	}

	var request publicreportsapi.DtoClientFilterParamsRequest
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	filter := catalogapplication.ListClientsFilter{}
	if request.Name != nil {
		filter.Name = *request.Name
	}

	clients, err := handler.catalog.ListClients(ctx.Request().Context(), int64(workspaceID), filter)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	// Filter by IDs if specified.
	result := make([]publicreportsapi.DtoClientFilterResponse, 0, len(clients))
	for _, c := range clients {
		if request.Ids != nil && len(*request.Ids) > 0 && !containsInt(*request.Ids, int(c.ID)) {
			continue
		}
		id := int(c.ID)
		result = append(result, publicreportsapi.DtoClientFilterResponse{
			Id:   &id,
			Name: lo.ToPtr(c.Name),
		})
	}
	return ctx.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// Filters: Projects
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdFiltersProjects(
	ctx echo.Context,
	workspaceID int,
) error {
	if _, err := handler.requireReportsScope(ctx, int64(workspaceID)); err != nil {
		return err
	}

	var request publicreportsapi.DtoProjectFilterParamRequest
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	filter := catalogapplication.ListProjectsFilter{
		Active: request.IsActive,
	}
	if request.Name != nil {
		filter.Name = *request.Name
	}

	projects, err := handler.catalog.ListProjects(ctx.Request().Context(), int64(workspaceID), filter)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	result := make([]publicreportsapi.DtoProjectFilterResponse, 0, len(projects))
	for _, p := range projects {
		if request.Ids != nil && len(*request.Ids) > 0 && !containsInt(*request.Ids, int(p.ID)) {
			continue
		}
		if request.ClientIds != nil && len(*request.ClientIds) > 0 {
			clientID := 0
			if p.ClientID != nil {
				clientID = int(*p.ClientID)
			}
			if !containsInt(*request.ClientIds, clientID) {
				continue
			}
		}
		if request.IsBillable != nil && p.Billable != *request.IsBillable {
			continue
		}
		if request.IsPrivate != nil && p.IsPrivate != *request.IsPrivate {
			continue
		}

		id := int(p.ID)
		entry := publicreportsapi.DtoProjectFilterResponse{
			Active:   lo.ToPtr(p.Active),
			Billable: lo.ToPtr(p.Billable),
			Color:    lo.ToPtr(p.Color),
			Id:       &id,
			Name:     lo.ToPtr(p.Name),
		}
		if p.ClientID != nil {
			entry.ClientId = lo.ToPtr(int(*p.ClientID))
		}
		if p.Currency != nil {
			entry.Currency = p.Currency
		}
		result = append(result, entry)
	}
	return ctx.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// Filters: Projects Status
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdFiltersProjectsStatus(
	ctx echo.Context,
	workspaceID int,
) error {
	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.DtoProjectStatusParamsRequest
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	filter := catalogapplication.ListProjectsFilter{Active: request.Active}
	projects, err := handler.catalog.ListProjects(ctx.Request().Context(), int64(workspaceID), filter)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	// Build a set of requested IDs for filtering.
	idSet := map[int64]bool{}
	if request.Ids != nil {
		for _, id := range *request.Ids {
			idSet[int64(id)] = true
		}
	}

	// Get time entry totals for each project.
	entries, err := handler.tracking.ListTimeEntries(ctx.Request().Context(), int64(workspaceID), trackingListFilter(user))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	projectSeconds := aggregateProjectSeconds(entries)

	result := make([]publicreportsapi.DtoProjectStatusResponse, 0, len(projects))
	for _, p := range projects {
		if len(idSet) > 0 && !idSet[p.ID] {
			continue
		}
		id := int(p.ID)
		tracked := projectSeconds[p.ID]
		entry := publicreportsapi.DtoProjectStatusResponse{
			Id:             &id,
			TrackedSeconds: lo.ToPtr(tracked.total),
			BillableSeconds: lo.ToPtr(tracked.billable),
		}
		if p.EstimatedSeconds != nil {
			entry.EstimatedSeconds = lo.ToPtr(int(*p.EstimatedSeconds))
		}
		if p.Currency != nil {
			entry.Currency = p.Currency
		}
		result = append(result, entry)
	}
	return ctx.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// Filters: Project Groups
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdFiltersProjectGroups(
	ctx echo.Context,
	workspaceID int,
) error {
	if _, err := handler.requireReportsScope(ctx, int64(workspaceID)); err != nil {
		return err
	}

	var request publicreportsapi.DtoProjectGroupParamsRequest
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	projectIDs := make([]int64, 0)
	if request.ProjectIds != nil {
		projectIDs = intsToInt64s(*request.ProjectIds)
	}
	if request.GroupIds != nil {
		projectIDs = append(projectIDs, intsToInt64s(*request.GroupIds)...)
	}

	groups, err := handler.catalog.ListProjectGroups(ctx.Request().Context(), int64(workspaceID), projectIDs)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	result := make([]publicreportsapi.DtoProjectGroupResponse, 0, len(groups))
	for _, g := range groups {
		id := int(g.ID)
		result = append(result, publicreportsapi.DtoProjectGroupResponse{
			GroupId:   lo.ToPtr(int(g.GroupID)),
			Id:        &id,
			ProjectId: lo.ToPtr(int(g.ProjectID)),
		})
	}
	return ctx.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// Filters: Project Users
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdFiltersProjectUsers(
	ctx echo.Context,
	workspaceID int,
) error {
	if _, err := handler.requireReportsScope(ctx, int64(workspaceID)); err != nil {
		return err
	}

	var request publicreportsapi.DtoProjectUserParamsRequest
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	filter := catalogapplication.ListProjectUsersFilter{}
	if request.ProjectIds != nil {
		filter.ProjectIDs = intsToInt64s(*request.ProjectIds)
	}

	users, err := handler.catalog.ListProjectUsers(ctx.Request().Context(), int64(workspaceID), filter)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	result := make([]publicreportsapi.DtoProjectUserResponse, 0, len(users))
	for _, u := range users {
		result = append(result, publicreportsapi.DtoProjectUserResponse{
			Id:        lo.ToPtr(int(u.UserID)),
			ProjectId: lo.ToPtr(int(u.ProjectID)),
			UserId:    lo.ToPtr(int(u.UserID)),
		})
	}
	return ctx.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// Filters: Tasks Status
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdFiltersTasksStatus(
	ctx echo.Context,
	workspaceID int,
) error {
	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.TasksTasksStatusPost
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	tasks, err := handler.catalog.ListTasks(ctx.Request().Context(), int64(workspaceID), catalogapplication.ListTasksFilter{
		IncludeAll: true,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	idSet := map[int64]bool{}
	if request.Ids != nil {
		for _, id := range *request.Ids {
			idSet[int64(id)] = true
		}
	}

	entries, err := handler.tracking.ListTimeEntries(ctx.Request().Context(), int64(workspaceID), trackingListFilter(user))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	taskSeconds := aggregateTaskSeconds(entries)

	result := make([]publicreportsapi.TasksTaskStatus, 0)
	for _, t := range tasks.Tasks {
		if len(idSet) > 0 && !idSet[t.ID] {
			continue
		}
		id := int(t.ID)
		tracked := taskSeconds[t.ID]
		result = append(result, publicreportsapi.TasksTaskStatus{
			Id:             &id,
			TrackedSeconds: lo.ToPtr(tracked.total),
			BillableSeconds: lo.ToPtr(tracked.billable),
		})
	}
	return ctx.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// Filters: Users
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdFiltersUsers(
	ctx echo.Context,
	workspaceID int,
) error {
	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.DtoUserFilterParamsRequest
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	members, err := handler.membership.ListWorkspaceMembers(
		ctx.Request().Context(), int64(workspaceID), user.ID,
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	result := make([]publicreportsapi.DtoUserFilterResponse, 0, len(members))
	for _, m := range members {
		if m.UserID == nil {
			continue
		}
		if request.Ids != nil && len(*request.Ids) > 0 && !containsInt(*request.Ids, int(*m.UserID)) {
			continue
		}
		id := int(*m.UserID)
		result = append(result, publicreportsapi.DtoUserFilterResponse{
			Id:   &id,
			Name: lo.ToPtr(m.FullName),
		})
	}
	return ctx.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func containsInt(haystack []int, needle int) bool {
	return slices.Contains(haystack, needle)
}

type secondsAccum struct {
	total    int
	billable int
}

func aggregateProjectSeconds(entries []trackingapplication.TimeEntryView) map[int64]secondsAccum {
	result := map[int64]secondsAccum{}
	for _, e := range entries {
		pid := int64(0)
		if e.ProjectID != nil {
			pid = *e.ProjectID
		}
		acc := result[pid]
		if e.Duration > 0 {
			acc.total += e.Duration
			if e.Billable {
				acc.billable += e.Duration
			}
		}
		result[pid] = acc
	}
	return result
}

func aggregateTaskSeconds(entries []trackingapplication.TimeEntryView) map[int64]secondsAccum {
	result := map[int64]secondsAccum{}
	for _, e := range entries {
		tid := int64(0)
		if e.TaskID != nil {
			tid = *e.TaskID
		}
		if tid == 0 {
			continue
		}
		acc := result[tid]
		if e.Duration > 0 {
			acc.total += e.Duration
			if e.Billable {
				acc.billable += e.Duration
			}
		}
		result[tid] = acc
	}
	return result
}
