package publicapi

import (
	"encoding/json"
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

// projectsSummaryRow wraps the generated UsersProjectUsersSummaryRow to fix
// two wire-shape drifts between the oapi-codegen output (driven by the
// upstream Toggl Reports v3 swagger) and the live api.track.toggl.com
// response for POST /reports/api/v3/workspace/{id}/projects/summary:
//
//   - The generated struct tags every field with omitempty because the
//     swagger does not mark them required. Upstream always emits all
//     four fields on the wire, including project_id: null when time was
//     tracked without a project. Forcing full output keeps the shape
//     byte-compatible with official for third-party clients (e.g. the
//     obsidian-toggl-integration plugin, which sends only start_date and
//     consumes {user_id, project_id, tracked_seconds}).
//   - project_id must serialize as an explicit JSON null (not omitted)
//     when the backing pointer is nil, so the field is always present.
//
// Overriding MarshalJSON on a wrapper (rather than patching the generated
// struct) is the repo's standard fix for upstream swagger drift — see
// catalog/transport/http/public-api/projects_read.go for the same pattern.
// Regeneration cannot undo this because the wrapper lives in handler code.
type projectsSummaryRow struct {
	publicreportsapi.UsersProjectUsersSummaryRow
}

var projectsSummaryForceNullFields = []string{"project_id"}

func (r projectsSummaryRow) MarshalJSON() ([]byte, error) {
	raw, err := json.Marshal(r.UsersProjectUsersSummaryRow)
	if err != nil {
		return nil, err
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &fields); err != nil {
		return nil, err
	}
	// Always emit the four documented fields; fill missing integer
	// fields with 0, and nullable project_id with null.
	for _, key := range []string{"user_id", "tracked_seconds", "billable_seconds"} {
		if _, present := fields[key]; !present {
			fields[key] = json.RawMessage("0")
		}
	}
	for _, key := range projectsSummaryForceNullFields {
		if _, present := fields[key]; !present {
			fields[key] = json.RawMessage("null")
		}
	}
	return json.Marshal(fields)
}

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

	// Aggregate per (user_id, project_id) preserving nil project_id as a
	// separate bucket so "no project" time is still emitted (matches official).
	type key struct {
		userID    int64
		projectID int64
		noProject bool
	}
	type bucket struct {
		tracked  int
		billable int
	}
	totals := map[key]*bucket{}
	for _, e := range entries {
		k := key{userID: e.UserID}
		if e.ProjectID == nil {
			k.noProject = true
		} else {
			k.projectID = *e.ProjectID
		}
		b, ok := totals[k]
		if !ok {
			b = &bucket{}
			totals[k] = b
		}
		b.tracked += e.Duration
		if e.Billable {
			b.billable += e.Duration
		}
	}

	result := make([]projectsSummaryRow, 0, len(totals))
	for k, b := range totals {
		row := projectsSummaryRow{
			UsersProjectUsersSummaryRow: publicreportsapi.UsersProjectUsersSummaryRow{
				UserId:          lo.ToPtr(int(k.userID)),
				TrackedSeconds:  lo.ToPtr(b.tracked),
				BillableSeconds: lo.ToPtr(b.billable),
			},
		}
		if !k.noProject {
			row.ProjectId = lo.ToPtr(int(k.projectID))
		}
		result = append(result, row)
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
