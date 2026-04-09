package publicapi

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publicreportsapi "opentoggl/backend/apps/backend/internal/http/generated/publicreports"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	reportsapplication "opentoggl/backend/apps/backend/internal/reports/application"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

type ScopeAuthorizer interface {
	RequirePublicTrackUser(ctx echo.Context) (*identityapplication.UserSnapshot, error)
	RequirePublicTrackWorkspace(ctx echo.Context, workspaceID int64) error
}

type Handler struct {
	catalog    *catalogapplication.Service
	membership *membershipapplication.Service
	reports    *reportsapplication.Service
	scope      ScopeAuthorizer
	tracking   *trackingapplication.Service
}

// summarySubGroupEntry is the JSON shape for a single sub-group entry in a
// summary report response, replacing an untyped map[string]any.
type summarySubGroupEntry struct {
	BillableSeconds int    `json:"billable_seconds"`
	ID              int64  `json:"id"`
	Seconds         int    `json:"seconds"`
	Title           string `json:"title"`
}

func NewHandler(
	scope ScopeAuthorizer,
	reports *reportsapplication.Service,
	catalog *catalogapplication.Service,
	membership *membershipapplication.Service,
	tracking *trackingapplication.Service,
) *Handler {
	return &Handler{
		catalog:    catalog,
		membership: membership,
		reports:    reports,
		scope:      scope,
		tracking:   tracking,
	}
}

func workspaceIDFromPath(ctx echo.Context) (int64, error) {
	value, err := strconv.ParseInt(ctx.Param("workspace_id"), 10, 64)
	if err != nil {
		return 0, echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	return value, nil
}

func reportIDFromPath(ctx echo.Context) (int64, error) {
	value, err := strconv.ParseInt(ctx.Param("report_id"), 10, 64)
	if err != nil {
		return 0, echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	return value, nil
}

// ---------------------------------------------------------------------------
// Saved/Shared Reports
// ---------------------------------------------------------------------------

func (handler *Handler) GetSharedReport(ctx echo.Context) error {
	workspaceID, err := workspaceIDFromPath(ctx)
	if err != nil {
		return err
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	views, err := handler.reports.ListSavedReports(ctx.Request().Context(), workspaceID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	result := make([]publictrackapi.ModelsSavedReport, 0, len(views))
	for _, v := range views {
		result = append(result, savedReportViewToAPI(v))
	}
	return ctx.JSON(http.StatusOK, result)
}

func (handler *Handler) PostSharedReport(ctx echo.Context) error {
	workspaceID, err := workspaceIDFromPath(ctx)
	if err != nil {
		return err
	}
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.ModelsSavedReport
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	view, err := handler.reports.CreateSavedReport(ctx.Request().Context(), reportsapplication.CreateSavedReportCommand{
		WorkspaceID:    workspaceID,
		Name:           lo.FromPtr(request.Name),
		Public:         lo.FromPtr(request.Public),
		FixedDateRange: lo.FromPtr(request.FixedDaterange),
		Params:         paramsToJSON(request.Params),
		CreatedBy:      user.ID,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	return ctx.JSON(http.StatusOK, savedReportViewToAPI(view))
}

func (handler *Handler) PutSharedReport(ctx echo.Context) error {
	workspaceID, err := workspaceIDFromPath(ctx)
	if err != nil {
		return err
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.ModelsSavedReport
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	view, err := handler.reports.UpdateSavedReport(ctx.Request().Context(), reportsapplication.UpdateSavedReportCommand{
		ID:             int64(lo.FromPtr(request.Id)),
		WorkspaceID:    workspaceID,
		Name:           lo.FromPtr(request.Name),
		Public:         lo.FromPtr(request.Public),
		FixedDateRange: lo.FromPtr(request.FixedDaterange),
		Params:         paramsToJSON(request.Params),
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	return ctx.JSON(http.StatusOK, savedReportViewToAPI(view))
}

func (handler *Handler) GetSavedReportResource(ctx echo.Context) error {
	workspaceID, err := workspaceIDFromPath(ctx)
	if err != nil {
		return err
	}
	reportID, err := reportIDFromPath(ctx)
	if err != nil {
		return err
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	view, err := handler.reports.GetSavedReport(ctx.Request().Context(), workspaceID, reportID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
	}

	return ctx.JSON(http.StatusOK, savedReportViewToAPI(view))
}

func (handler *Handler) PutSavedReportResource(ctx echo.Context) error {
	workspaceID, err := workspaceIDFromPath(ctx)
	if err != nil {
		return err
	}
	reportID, err := reportIDFromPath(ctx)
	if err != nil {
		return err
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.ModelsSavedReport
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	view, err := handler.reports.UpdateSavedReport(ctx.Request().Context(), reportsapplication.UpdateSavedReportCommand{
		ID:             reportID,
		WorkspaceID:    workspaceID,
		Name:           lo.FromPtr(request.Name),
		Public:         lo.FromPtr(request.Public),
		FixedDateRange: lo.FromPtr(request.FixedDaterange),
		Params:         paramsToJSON(request.Params),
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	return ctx.JSON(http.StatusOK, savedReportViewToAPI(view))
}

func (handler *Handler) DeleteSavedReportResource(ctx echo.Context) error {
	workspaceID, err := workspaceIDFromPath(ctx)
	if err != nil {
		return err
	}
	reportID, err := reportIDFromPath(ctx)
	if err != nil {
		return err
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	if err := handler.reports.DeleteSavedReport(ctx.Request().Context(), workspaceID, reportID); err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
	}
	return ctx.NoContent(http.StatusOK)
}

func (handler *Handler) BulkDeleteSavedReportResource(ctx echo.Context) error {
	workspaceID, err := workspaceIDFromPath(ctx)
	if err != nil {
		return err
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request struct {
		IDs []int64 `json:"ids"`
	}
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	if len(request.IDs) == 0 {
		return ctx.NoContent(http.StatusOK)
	}

	if err := handler.reports.BulkDeleteSavedReports(ctx.Request().Context(), workspaceID, request.IDs); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	return ctx.NoContent(http.StatusOK)
}

// ---------------------------------------------------------------------------
// Scheduled Reports
// ---------------------------------------------------------------------------

func (handler *Handler) GetWorkspaceScheduledReports(ctx echo.Context) error {
	workspaceID, err := workspaceIDFromPath(ctx)
	if err != nil {
		return err
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	views, err := handler.reports.ListScheduledReports(ctx.Request().Context(), workspaceID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	result := make([]publictrackapi.ModelsScheduledReport, 0, len(views))
	for _, v := range views {
		result = append(result, scheduledReportViewToAPI(v))
	}
	return ctx.JSON(http.StatusOK, result)
}

func (handler *Handler) PostWorkspaceScheduledReports(ctx echo.Context) error {
	workspaceID, err := workspaceIDFromPath(ctx)
	if err != nil {
		return err
	}
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.ModelsScheduledReport
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	view, err := handler.reports.CreateScheduledReport(ctx.Request().Context(), reportsapplication.CreateScheduledReportCommand{
		WorkspaceID: workspaceID,
		ReportID:    int64(lo.FromPtr(request.ReportId)),
		Frequency:   lo.FromPtr(request.Frequency),
		CreatorID:   user.ID,
		UserIDs:     intsToInt64s(lo.FromPtr(request.UserIds)),
		GroupIDs:    intsToInt64s(lo.FromPtr(request.GroupIds)),
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	return ctx.JSON(http.StatusOK, scheduledReportViewToAPI(view))
}

func (handler *Handler) DeleteWorkspaceScheduledReports(ctx echo.Context) error {
	workspaceID, err := workspaceIDFromPath(ctx)
	if err != nil {
		return err
	}
	reportID, err := reportIDFromPath(ctx)
	if err != nil {
		return err
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	if err := handler.reports.DeleteScheduledReport(ctx.Request().Context(), workspaceID, reportID); err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
	}
	return ctx.NoContent(http.StatusOK)
}

// ---------------------------------------------------------------------------
// Report Generation (existing)
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdSummaryTimeEntries(
	ctx echo.Context,
	workspaceID int,
) error {
	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}
	var request publicreportsapi.SummaryReportPost
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	query, err := buildQuery(int64(workspaceID), user, request.StartDate, request.EndDate)
	if err != nil {
		return err
	}
	applySummaryPostFilters(&query, request)
	report, err := handler.reports.BuildSummaryReport(ctx.Request().Context(), query)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	groups := make([]publicreportsapi.SummaryGroupData, 0, len(report.Groups))
	for _, group := range report.Groups {
		subGroups := make(publicreportsapi.IndexedIndexedSummarySubGroupDataString, len(group.SubGroups))
		for _, subGroup := range group.SubGroups {
			subGroups[strconv.FormatInt(subGroup.UserID, 10)] = summarySubGroupEntry{
				BillableSeconds: subGroup.BillableSeconds,
				ID:              subGroup.UserID,
				Seconds:         subGroup.Seconds,
				Title:           subGroup.Label,
			}
		}
		projectID := int(group.ProjectID)
		names := []string{group.Label}
		groups = append(groups, publicreportsapi.SummaryGroupData{
			Id:        lo.ToPtr(projectID),
			Names:     &names,
			SubGroups: &subGroups,
		})
	}

	return ctx.JSON(http.StatusOK, publicreportsapi.SavedSummaryReportData{
		Report: &publicreportsapi.SummaryReportData{
			Groups: &groups,
		},
		Totals: &publicreportsapi.TotalsReportData{
			Seconds:     lo.ToPtr(report.TotalSeconds),
			TrackedDays: lo.ToPtr(report.TrackedDays),
		},
	})
}

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdWeeklyTimeEntries(
	ctx echo.Context,
	workspaceID int,
) error {
	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}
	var request publicreportsapi.BasePost
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	query, err := buildQuery(int64(workspaceID), user, request.StartDate, request.EndDate)
	if err != nil {
		return err
	}
	applyBasePostFilters(&query, request)
	report, err := handler.reports.BuildWeeklyReport(ctx.Request().Context(), query)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	rows := make([]publicreportsapi.WeeklyDataRow, 0, len(report.Rows))
	for _, row := range report.Rows {
		projectID := int(row.ProjectID)
		userID := int(row.UserID)
		billableAmounts := append([]int(nil), row.BillableAmountsInCents...)
		billableSeconds := append([]int(nil), row.BillableSeconds...)
		seconds := append([]int(nil), row.Seconds...)
		dataRow := publicreportsapi.WeeklyDataRow{
			BillableAmountsInCents: &billableAmounts,
			BillableSeconds:        &billableSeconds,
			ClientName:             lo.ToPtr(row.ClientName),
			ProjectId:              lo.ToPtr(projectID),
			ProjectName:            lo.ToPtr(row.ProjectName),
			Seconds:                &seconds,
			UserId:                 lo.ToPtr(userID),
			UserName:               lo.ToPtr(row.UserName),
		}
		if row.HourlyRateInCents > 0 {
			dataRow.HourlyRateInCents = lo.ToPtr(row.HourlyRateInCents)
			dataRow.Currency = lo.ToPtr(row.Currency)
		}
		rows = append(rows, dataRow)
	}

	totals := publicreportsapi.TotalsReportData{
		Seconds:     lo.ToPtr(report.TotalSeconds),
		TrackedDays: lo.ToPtr(report.TrackedDays),
	}
	if report.BillableAmountInCents > 0 {
		totals.BillableAmountInCents = lo.ToPtr(report.BillableAmountInCents)
	}

	return ctx.JSON(http.StatusOK, publicreportsapi.SavedWeeklyReportData{
		Report: &rows,
		Totals: &totals,
	})
}

// ---------------------------------------------------------------------------
// Insights: Data Trends
// ---------------------------------------------------------------------------

func (handler *Handler) PostInsightsApiV1WorkspaceWorkspaceIdDataTrendsProjects(
	ctx echo.Context,
	workspaceID int,
) error {
	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.ProjectsProjectTrend
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	location, err := time.LoadLocation(user.Timezone)
	if err != nil {
		location = time.UTC
	}

	if request.StartDate == nil || request.EndDate == nil {
		return echo.NewHTTPError(http.StatusBadRequest, "At least one parameter must be set")
	}
	startDate, err := time.ParseInLocation(time.DateOnly, *request.StartDate, location)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Wrong format date").SetInternal(err)
	}
	endDate, err := time.ParseInLocation(time.DateOnly, *request.EndDate, location)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Wrong format date").SetInternal(err)
	}

	query := reportsapplication.ProjectDataTrendsQuery{
		WorkspaceID: int64(workspaceID),
		RequestedBy: user.ID,
		Timezone:    user.Timezone,
		StartDate:   startDate,
		EndDate:     endDate,
		Billable:    request.Billable,
	}
	if request.ProjectIds != nil {
		query.ProjectIDs = intsToInt64s(*request.ProjectIds)
	}
	if request.PreviousPeriodStart != nil {
		prevStart, err := time.ParseInLocation(time.DateOnly, *request.PreviousPeriodStart, location)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Wrong format date").SetInternal(err)
		}
		query.PreviousPeriodStart = &prevStart
	}

	trends, err := handler.reports.BuildProjectDataTrends(ctx.Request().Context(), query)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	results := make([]publicreportsapi.ProjectsProjectTrends, 0, len(trends))
	for _, t := range trends {
		projectID := int(t.ProjectID)
		start := t.Start.Format(time.DateOnly)
		end := t.End.Format(time.DateOnly)
		currentSeconds := append([]int(nil), t.CurrentPeriodSeconds...)
		previousSeconds := append([]int(nil), t.PreviousPeriodSeconds...)
		userIDs := int64sToInts(t.UserIDs)

		item := publicreportsapi.ProjectsProjectTrends{
			ProjectId:             &projectID,
			Start:                 &start,
			End:                   &end,
			CurrentPeriodSeconds:  &currentSeconds,
			PreviousPeriodSeconds: &previousSeconds,
			UserIds:               &userIDs,
		}
		if t.PreviousStart != nil {
			ps := t.PreviousStart.Format(time.DateOnly)
			item.PreviousStart = &ps
		}
		results = append(results, item)
	}

	return ctx.JSON(http.StatusOK, results)
}

// ---------------------------------------------------------------------------
// Insights: Profitability Exports
// ---------------------------------------------------------------------------

func (handler *Handler) PostInsightsApiV1WorkspaceWorkspaceIdProfitabilityProjectsExtension(
	ctx echo.Context,
	workspaceID int,
	extension string,
) error {
	if extension != "csv" {
		return echo.NewHTTPError(http.StatusBadRequest, "Only csv export is currently supported")
	}

	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.DtoProjectProfitability
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid parameters").SetInternal(err)
	}

	location, err := time.LoadLocation(user.Timezone)
	if err != nil {
		location = time.UTC
	}

	query := reportsapplication.ProjectProfitabilityQuery{
		WorkspaceID: int64(workspaceID),
		RequestedBy: user.ID,
		Timezone:    user.Timezone,
		Currency:    request.Currency,
		Billable:    request.Billable,
	}
	if request.StartDate != nil {
		startDate, err := time.ParseInLocation(time.DateOnly, *request.StartDate, location)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid parameters").SetInternal(err)
		}
		query.StartDate = startDate
	}
	if request.EndDate != nil {
		endDate, err := time.ParseInLocation(time.DateOnly, *request.EndDate, location)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid parameters").SetInternal(err)
		}
		query.EndDate = endDate
	}
	if request.ProjectIds != nil {
		query.ProjectIDs = intsToInt64s(*request.ProjectIds)
	}
	if request.ClientIds != nil {
		query.ClientIDs = intsToInt64s(*request.ClientIds)
	}

	rows, err := handler.reports.BuildProjectProfitability(ctx.Request().Context(), query)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	ctx.Response().Header().Set("Content-Type", "text/csv")
	ctx.Response().Header().Set("Content-Disposition", "attachment; filename=project_profitability.csv")
	ctx.Response().WriteHeader(http.StatusOK)

	w := csv.NewWriter(ctx.Response())
	_ = w.Write([]string{"Project", "Total Seconds", "Billable Seconds", "Earnings (" + query.Currency + ")"})
	for _, row := range rows {
		_ = w.Write([]string{
			row.ProjectName,
			strconv.Itoa(row.TotalSeconds),
			strconv.Itoa(row.BillableSeconds),
			fmt.Sprintf("%.2f", float64(row.Earnings)/100),
		})
	}
	w.Flush()
	return nil
}

func (handler *Handler) PostInsightsApiV1WorkspaceWorkspaceIdProfitabilityEmployeesExtension(
	ctx echo.Context,
	workspaceID int,
	extension string,
) error {
	if extension != "csv" {
		return echo.NewHTTPError(http.StatusBadRequest, "Only csv export is currently supported")
	}

	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.DtoEmployeeProfitability
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid parameters").SetInternal(err)
	}

	location, err := time.LoadLocation(user.Timezone)
	if err != nil {
		location = time.UTC
	}

	query := reportsapplication.EmployeeProfitabilityQuery{
		WorkspaceID: int64(workspaceID),
		RequestedBy: user.ID,
		Timezone:    user.Timezone,
		Currency:    request.Currency,
	}
	if request.StartDate != nil {
		startDate, err := time.ParseInLocation(time.DateOnly, *request.StartDate, location)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid parameters").SetInternal(err)
		}
		query.StartDate = startDate
	}
	if request.EndDate != nil {
		endDate, err := time.ParseInLocation(time.DateOnly, *request.EndDate, location)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid parameters").SetInternal(err)
		}
		query.EndDate = endDate
	}
	if request.UserIds != nil {
		query.UserIDs = intsToInt64s(*request.UserIds)
	}
	if request.GroupIds != nil {
		query.GroupIDs = intsToInt64s(*request.GroupIds)
	}

	rows, err := handler.reports.BuildEmployeeProfitability(ctx.Request().Context(), query)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	ctx.Response().Header().Set("Content-Type", "text/csv")
	ctx.Response().Header().Set("Content-Disposition", "attachment; filename=employee_profitability.csv")
	ctx.Response().WriteHeader(http.StatusOK)

	w := csv.NewWriter(ctx.Response())
	_ = w.Write([]string{"Employee", "Total Seconds", "Billable Seconds", "Earnings (" + query.Currency + ")"})
	for _, row := range rows {
		_ = w.Write([]string{
			row.UserName,
			strconv.Itoa(row.TotalSeconds),
			strconv.Itoa(row.BillableSeconds),
			fmt.Sprintf("%.2f", float64(row.Earnings)/100),
		})
	}
	w.Flush()
	return nil
}

// ---------------------------------------------------------------------------
// Insights: Trends Export
// ---------------------------------------------------------------------------

func (handler *Handler) PostInsightsApiV1WorkspaceWorkspaceIdTrendsProjectsExtension(
	ctx echo.Context,
	workspaceID int,
	extension string,
) error {
	if extension != "csv" {
		return echo.NewHTTPError(http.StatusBadRequest, "Only csv export is currently supported")
	}

	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.ProjectsProjectTrend
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	location, err := time.LoadLocation(user.Timezone)
	if err != nil {
		location = time.UTC
	}

	if request.StartDate == nil || request.EndDate == nil {
		return echo.NewHTTPError(http.StatusBadRequest, "At least one parameter must be set")
	}
	startDate, err := time.ParseInLocation(time.DateOnly, *request.StartDate, location)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Wrong format date").SetInternal(err)
	}
	endDate, err := time.ParseInLocation(time.DateOnly, *request.EndDate, location)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Wrong format date").SetInternal(err)
	}

	query := reportsapplication.ProjectDataTrendsQuery{
		WorkspaceID: int64(workspaceID),
		RequestedBy: user.ID,
		Timezone:    user.Timezone,
		StartDate:   startDate,
		EndDate:     endDate,
		Billable:    request.Billable,
	}
	if request.ProjectIds != nil {
		query.ProjectIDs = intsToInt64s(*request.ProjectIds)
	}
	if request.PreviousPeriodStart != nil {
		prevStart, err := time.ParseInLocation(time.DateOnly, *request.PreviousPeriodStart, location)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Wrong format date").SetInternal(err)
		}
		query.PreviousPeriodStart = &prevStart
	}

	trends, err := handler.reports.BuildProjectDataTrends(ctx.Request().Context(), query)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	ctx.Response().Header().Set("Content-Type", "text/csv")
	ctx.Response().Header().Set("Content-Disposition", "attachment; filename=project_trends.csv")
	ctx.Response().WriteHeader(http.StatusOK)

	w := csv.NewWriter(ctx.Response())
	_ = w.Write([]string{"Project ID", "Current Period Total (s)", "Previous Period Total (s)", "User IDs"})
	for _, t := range trends {
		currentTotal := 0
		for _, s := range t.CurrentPeriodSeconds {
			currentTotal += s
		}
		previousTotal := 0
		for _, s := range t.PreviousPeriodSeconds {
			previousTotal += s
		}
		userIDStrs := make([]string, len(t.UserIDs))
		for i, uid := range t.UserIDs {
			userIDStrs[i] = strconv.FormatInt(uid, 10)
		}
		_ = w.Write([]string{
			strconv.FormatInt(t.ProjectID, 10),
			strconv.Itoa(currentTotal),
			strconv.Itoa(previousTotal),
			fmt.Sprintf("%v", userIDStrs),
		})
	}
	w.Flush()
	return nil
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func buildQuery(
	workspaceID int64,
	user *identityapplication.UserSnapshot,
	startDate *string,
	endDate *string,
) (reportsapplication.Query, error) {
	if startDate == nil || endDate == nil {
		return reportsapplication.Query{}, echo.NewHTTPError(http.StatusBadRequest, "At least one parameter must be set")
	}

	location, err := time.LoadLocation(user.Timezone)
	if err != nil {
		location = time.UTC
	}
	start, err := time.ParseInLocation(time.DateOnly, *startDate, location)
	if err != nil {
		return reportsapplication.Query{}, echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	end, err := time.ParseInLocation(time.DateOnly, *endDate, location)
	if err != nil {
		return reportsapplication.Query{}, echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	if end.Before(start) {
		return reportsapplication.Query{}, echo.NewHTTPError(http.StatusBadRequest, "end date must not be before start date")
	}

	return reportsapplication.Query{
		EndDate:     end,
		RequestedBy: user.ID,
		StartDate:   start,
		Timezone:    user.Timezone,
		WorkspaceID: workspaceID,
	}, nil
}

func applyBasePostFilters(query *reportsapplication.Query, request publicreportsapi.BasePost) {
	if request.ProjectIds != nil {
		query.ProjectIDs = intsToInt64s(*request.ProjectIds)
	}
	if request.TagIds != nil {
		query.TagIDs = intsToInt64s(*request.TagIds)
	}
	if request.TaskIds != nil {
		query.TaskIDs = intsToInt64s(*request.TaskIds)
	}
	if request.Description != nil {
		query.Description = *request.Description
	}
}

func applySummaryPostFilters(query *reportsapplication.Query, request publicreportsapi.SummaryReportPost) {
	if request.ProjectIds != nil {
		query.ProjectIDs = intsToInt64s(*request.ProjectIds)
	}
	if request.TagIds != nil {
		query.TagIDs = intsToInt64s(*request.TagIds)
	}
	if request.Description != nil {
		query.Description = *request.Description
	}
}

func intsToInt64s(values []int) []int64 {
	result := make([]int64, len(values))
	for index, value := range values {
		result[index] = int64(value)
	}
	return result
}

func (handler *Handler) requireReportsScope(
	ctx echo.Context,
	workspaceID int64,
) (*identityapplication.UserSnapshot, error) {
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return nil, err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return nil, err
	}
	return user, nil
}

func savedReportViewToAPI(v reportsapplication.SavedReportView) publictrackapi.ModelsSavedReport {
	updatedAt := v.UpdatedAt.UTC().Format(time.RFC3339)
	uid := int(v.CreatedBy)
	return publictrackapi.ModelsSavedReport{
		Id:             lo.ToPtr(int(v.ID)),
		Name:           lo.ToPtr(v.Name),
		Public:         lo.ToPtr(v.Public),
		FixedDaterange: lo.ToPtr(v.FixedDateRange),
		Token:          v.Token,
		Params:         paramsFromJSON(v.Params),
		Uid:            lo.ToPtr(uid),
		UpdatedAt:      lo.ToPtr(updatedAt),
		UpdatedBy:      lo.ToPtr(uid),
	}
}

func scheduledReportViewToAPI(v reportsapplication.ScheduledReportView) publictrackapi.ModelsScheduledReport {
	createdAt := v.CreatedAt.UTC().Format(time.RFC3339)
	return publictrackapi.ModelsScheduledReport{
		BookmarkId:  lo.ToPtr(int(v.ReportID)),
		ReportId:    lo.ToPtr(int(v.ReportID)),
		WorkspaceId: lo.ToPtr(int(v.WorkspaceID)),
		Frequency:   lo.ToPtr(v.Frequency),
		CreatorId:   lo.ToPtr(int(v.CreatorID)),
		UserIds:     lo.ToPtr(int64sToInts(v.UserIDs)),
		GroupIds:    lo.ToPtr(int64sToInts(v.GroupIDs)),
		CreatedAt:   lo.ToPtr(createdAt),
	}
}

func int64sToInts(values []int64) []int {
	result := make([]int, len(values))
	for i, v := range values {
		result[i] = int(v)
	}
	return result
}

func paramsToJSON(s *string) json.RawMessage {
	if s == nil || *s == "" {
		return json.RawMessage("{}")
	}
	return json.RawMessage(*s)
}

func paramsFromJSON(raw json.RawMessage) *string {
	if raw == nil {
		return nil
	}
	s := string(raw)
	return &s
}
