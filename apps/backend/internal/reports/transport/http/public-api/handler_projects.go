package publicapi

import (
	"net/http"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publicreportsapi "opentoggl/backend/apps/backend/internal/http/generated/publicreports"
	reportsapplication "opentoggl/backend/apps/backend/internal/reports/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

// ---------------------------------------------------------------------------
// Profitability: Projects (JSON)
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdProfitabilityProjects(
	ctx echo.Context,
	workspaceID int,
) error {
	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.DtoProjectProfitability
	filters, err := bindWithNullableIDs(ctx, &request)
	if err != nil {
		return err
	}

	location := loadLocation(user.Timezone)
	query := reportsapplication.ProjectProfitabilityQuery{
		WorkspaceID: int64(workspaceID),
		RequestedBy: user.ID,
		Timezone:    user.Timezone,
		Currency:    request.Currency,
		Billable:    request.Billable,
		ProjectIDs:  filters.ProjectIDs,
		ClientIDs:   filters.ClientIDs,
		NoClient:    filters.NoClient,
	}
	if request.StartDate != nil {
		s, err := parseDate(*request.StartDate, location)
		if err != nil {
			return err
		}
		query.StartDate = s
	}
	if request.EndDate != nil {
		e, err := parseDate(*request.EndDate, location)
		if err != nil {
			return err
		}
		query.EndDate = e
	}

	rows, err := handler.reports.BuildProjectProfitability(ctx.Request().Context(), query)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	currency := request.Currency
	if currency == "" {
		currency = "USD"
	}

	table := make([]publicreportsapi.ProjectsReportTableRow, 0, len(rows))
	for _, row := range rows {
		pid := int(row.ProjectID)
		table = append(table, publicreportsapi.ProjectsReportTableRow{
			ProjectId:       &pid,
			Name:            lo.ToPtr(row.ProjectName),
			Color:           lo.ToPtr(row.ProjectColor),
			TotalSeconds:    lo.ToPtr(row.TotalSeconds),
			BillableSeconds: lo.ToPtr(row.BillableSeconds),
			Earnings:        lo.ToPtr(row.Earnings),
			Currency:        &currency,
		})
	}

	return ctx.JSON(http.StatusOK, publicreportsapi.ProjectsReport{
		Currency: &currency,
		Table:    &table,
	})
}

// ---------------------------------------------------------------------------
// Projects Summary
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdProjectsSummary(
	ctx echo.Context,
	workspaceID int,
) error {
	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.DtoProjectUsersRequest
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	location := loadLocation(user.Timezone)
	startDate, endDate, err := parseDateRange(request.StartDate, request.EndDate, location)
	if err != nil {
		return err
	}

	query := reportsapplication.Query{
		WorkspaceID: int64(workspaceID),
		RequestedBy: user.ID,
		Timezone:    user.Timezone,
		StartDate:   startDate,
		EndDate:     endDate,
	}

	entries, err := handler.reports.BuildWeeklyReportEntries(ctx.Request().Context(), query)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	// Get project info.
	projects, err := handler.catalog.ListProjects(ctx.Request().Context(), int64(workspaceID), catalogapplication.ListProjectsFilter{})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	projectMap := map[int64]catalogapplication.ProjectView{}
	for _, p := range projects {
		projectMap[p.ID] = p
	}

	// Aggregate per project.
	type accum struct {
		totalSeconds    int
		billableSeconds int
		userSet         map[int64]struct{}
	}
	projectStats := map[int64]*accum{}
	for _, e := range entries {
		pid := derefInt64Ptr(e.ProjectID)
		acc, ok := projectStats[pid]
		if !ok {
			acc = &accum{userSet: map[int64]struct{}{}}
			projectStats[pid] = acc
		}
		acc.totalSeconds += e.Duration
		if e.Billable {
			acc.billableSeconds += e.Duration
		}
		acc.userSet[e.UserID] = struct{}{}
	}

	// Build per-project user responses.
	result := make([]publicreportsapi.DtoProjectUserResponse, 0)
	for pid, acc := range projectStats {
		for uid := range acc.userSet {
			result = append(result, publicreportsapi.DtoProjectUserResponse{
				ProjectId: lo.ToPtr(int(pid)),
				UserId:    lo.ToPtr(int(uid)),
				Id:        lo.ToPtr(int(uid)),
			})
		}
		_ = acc
	}

	return ctx.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// Single Project Summary
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdProjectsProjectIdSummary(
	ctx echo.Context,
	workspaceID int,
	projectID int,
) error {
	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.BaseRangePost
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	location := loadLocation(user.Timezone)
	startDate, endDate, err := parseDateRange(request.StartDate, request.EndDate, location)
	if err != nil {
		return err
	}

	query := reportsapplication.Query{
		WorkspaceID: int64(workspaceID),
		RequestedBy: user.ID,
		Timezone:    user.Timezone,
		StartDate:   startDate,
		EndDate:     endDate,
		ProjectIDs:  []int64{int64(projectID)},
	}

	entries, err := handler.reports.BuildWeeklyReportEntries(ctx.Request().Context(), query)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	totalSeconds := 0
	trackedDays := map[string]struct{}{}
	for _, e := range entries {
		totalSeconds += e.Duration
		trackedDays[e.Start.In(location).Format("2006-01-02")] = struct{}{}
	}

	return ctx.JSON(http.StatusOK, publicreportsapi.TotalsReportData{
		Seconds:     lo.ToPtr(totalSeconds),
		TrackedDays: lo.ToPtr(len(trackedDays)),
	})
}

// ---------------------------------------------------------------------------
// Action Tasks
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdActionTasks(
	ctx echo.Context,
	workspaceID int,
	action string,
) error {
	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.TasksTasksPost
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	filter := catalogapplication.ListTasksFilter{
		Active:     request.Active,
		IncludeAll: true,
	}
	if request.Name != nil {
		filter.Search = *request.Name
	}
	if request.ProjectIds != nil && len(*request.ProjectIds) > 0 {
		pid := int64((*request.ProjectIds)[0])
		filter.ProjectID = &pid
	}

	page, err := handler.catalog.ListTasks(ctx.Request().Context(), int64(workspaceID), filter)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	// Get time tracked per task.
	entries, err := handler.tracking.ListTimeEntries(
		ctx.Request().Context(), int64(workspaceID), trackingListFilter(user),
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	taskSecs := aggregateTaskSeconds(entries)

	idSet := map[int64]bool{}
	if request.Ids != nil {
		for _, id := range *request.Ids {
			idSet[int64(id)] = true
		}
	}

	result := make([]publicreportsapi.TasksTaskStatus, 0, len(page.Tasks))
	for _, t := range page.Tasks {
		if len(idSet) > 0 && !idSet[t.ID] {
			continue
		}
		id := int(t.ID)
		tracked := taskSecs[t.ID]
		result = append(result, publicreportsapi.TasksTaskStatus{
			Id:              &id,
			TrackedSeconds:  lo.ToPtr(tracked.total),
			BillableSeconds: lo.ToPtr(tracked.billable),
		})
	}

	return ctx.JSON(http.StatusOK, result)
}
