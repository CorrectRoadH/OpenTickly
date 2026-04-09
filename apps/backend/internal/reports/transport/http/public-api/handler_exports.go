package publicapi

import (
	"encoding/csv"
	"net/http"
	"strconv"

	publicreportsapi "opentoggl/backend/apps/backend/internal/http/generated/publicreports"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

// ---------------------------------------------------------------------------
// Shared Report (by token)
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3SharedReportToken(
	ctx echo.Context,
	reportToken string,
) error {
	report, err := handler.reports.GetSavedReportByToken(ctx.Request().Context(), reportToken)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Report not found").SetInternal(err)
	}
	_ = report

	return ctx.JSON(http.StatusOK, publicreportsapi.SavedSummaryReportData{
		Report: &publicreportsapi.SummaryReportData{},
		Totals: &publicreportsapi.TotalsReportData{
			Seconds:     lo.ToPtr(0),
			TrackedDays: lo.ToPtr(0),
		},
	})
}

func (handler *Handler) PostReportsApiV3SharedReportTokenCsv(
	ctx echo.Context,
	reportToken string,
) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Shared report CSV export is not yet supported")
}

func (handler *Handler) PostReportsApiV3SharedReportTokenPdf(
	ctx echo.Context,
	reportToken string,
) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "PDF export is not yet supported")
}

func (handler *Handler) PostReportsApiV3SharedReportTokenXlsx(
	ctx echo.Context,
	reportToken string,
) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "XLSX export is not yet supported")
}

// ---------------------------------------------------------------------------
// Summary Export (CSV)
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdSummaryTimeEntriesExtension(
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

	var request publicreportsapi.SummaryReportPost
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	location := loadLocation(user.Timezone)
	startDate, endDate, err := parseDateRange(request.StartDate, request.EndDate, location)
	if err != nil {
		return err
	}

	query, err := buildQuery(int64(workspaceID), user, request.StartDate, request.EndDate)
	if err != nil {
		return err
	}
	_ = startDate
	_ = endDate
	applySummaryPostFilters(&query, request)

	report, err := handler.reports.BuildSummaryReport(ctx.Request().Context(), query)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	ctx.Response().Header().Set("Content-Type", "text/csv")
	ctx.Response().Header().Set("Content-Disposition", "attachment; filename=summary_report.csv")
	ctx.Response().WriteHeader(http.StatusOK)

	w := csv.NewWriter(ctx.Response())
	_ = w.Write([]string{"Project", "Total Seconds", "Billable Seconds"})
	for _, group := range report.Groups {
		_ = w.Write([]string{
			group.Label,
			strconv.Itoa(group.Seconds),
			strconv.Itoa(group.BillableSeconds),
		})
	}
	w.Flush()
	return nil
}

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdSummaryTimeEntriesPdf(
	ctx echo.Context,
	workspaceID int,
) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "PDF export is not yet supported")
}

// ---------------------------------------------------------------------------
// Weekly Export (CSV)
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdWeeklyTimeEntriesCsv(
	ctx echo.Context,
	workspaceID int,
) error {
	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.WeeklyExportPost
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	query, err := buildQuery(int64(workspaceID), user, request.StartDate, request.EndDate)
	if err != nil {
		return err
	}
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

	report, err := handler.reports.BuildWeeklyReport(ctx.Request().Context(), query)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	ctx.Response().Header().Set("Content-Type", "text/csv")
	ctx.Response().Header().Set("Content-Disposition", "attachment; filename=weekly_report.csv")
	ctx.Response().WriteHeader(http.StatusOK)

	w := csv.NewWriter(ctx.Response())
	_ = w.Write([]string{"User", "Project", "Client", "Total Seconds"})
	for _, row := range report.Rows {
		total := 0
		for _, s := range row.Seconds {
			total += s
		}
		_ = w.Write([]string{
			row.UserName,
			row.ProjectName,
			row.ClientName,
			strconv.Itoa(total),
		})
	}
	w.Flush()
	return nil
}

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdWeeklyTimeEntriesPdf(
	ctx echo.Context,
	workspaceID int,
) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "PDF export is not yet supported")
}
