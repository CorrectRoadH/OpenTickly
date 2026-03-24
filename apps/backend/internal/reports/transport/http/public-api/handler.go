package publicapi

import (
	"net/http"
	"strconv"
	"time"

	publicreportsapi "opentoggl/backend/apps/backend/internal/http/generated/publicreports"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	reportsapplication "opentoggl/backend/apps/backend/internal/reports/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

type ScopeAuthorizer interface {
	RequirePublicTrackUser(ctx echo.Context) (*identityapplication.UserSnapshot, error)
	RequirePublicTrackWorkspace(ctx echo.Context, workspaceID int64) error
}

type Handler struct {
	reports *reportsapplication.Service
	scope   ScopeAuthorizer
}

func NewHandler(scope ScopeAuthorizer, reports *reportsapplication.Service) *Handler {
	return &Handler{reports: reports, scope: scope}
}

func workspaceIDFromPath(ctx echo.Context) (int64, error) {
	value, err := strconv.ParseInt(ctx.Param("workspace_id"), 10, 64)
	if err != nil {
		return 0, echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	}
	return value, nil
}

// GetSharedReport returns a shared report.
func (handler *Handler) GetSharedReport(ctx echo.Context) error {
	_ = ctx.Param("workspace_id")
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

// PostSharedReport creates a shared report.
func (handler *Handler) PostSharedReport(ctx echo.Context) error {
	_ = ctx.Param("workspace_id")
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

// PutSharedReport updates a shared report.
func (handler *Handler) PutSharedReport(ctx echo.Context) error {
	_ = ctx.Param("workspace_id")
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

// BulkDeleteSavedReportResource deletes multiple saved reports.
func (handler *Handler) BulkDeleteSavedReportResource(ctx echo.Context) error {
	_ = ctx.Param("workspace_id")
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

// DeleteSavedReportResource deletes a single saved report.
func (handler *Handler) DeleteSavedReportResource(ctx echo.Context) error {
	_ = ctx.Param("workspace_id")
	_ = ctx.Param("report_id")
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

// GetSavedReportResource returns a single saved report.
func (handler *Handler) GetSavedReportResource(ctx echo.Context) error {
	_ = ctx.Param("workspace_id")
	_ = ctx.Param("report_id")
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

// PutSavedReportResource updates a single saved report.
func (handler *Handler) PutSavedReportResource(ctx echo.Context) error {
	_ = ctx.Param("workspace_id")
	_ = ctx.Param("report_id")
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

// GetWorkspaceScheduledReports returns scheduled reports for a workspace.
func (handler *Handler) GetWorkspaceScheduledReports(ctx echo.Context) error {
	workspaceID, err := workspaceIDFromPath(ctx)
	if err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	_ = workspaceID
	return ctx.JSON(http.StatusOK, []publictrackapi.ModelsScheduledReport{})
}

// PostWorkspaceScheduledReports creates a scheduled report for a workspace.
func (handler *Handler) PostWorkspaceScheduledReports(ctx echo.Context) error {
	workspaceID, err := workspaceIDFromPath(ctx)
	if err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	_ = workspaceID
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

// DeleteWorkspaceScheduledReports deletes a scheduled report.
func (handler *Handler) DeleteWorkspaceScheduledReports(ctx echo.Context) error {
	workspaceID, err := workspaceIDFromPath(ctx)
	if err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	_ = workspaceID
	_ = ctx.Param("report_id")
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

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
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	}
	query, err := buildQuery(int64(workspaceID), user, request.StartDate, request.EndDate)
	if err != nil {
		return err
	}
	report, err := handler.reports.BuildSummaryReport(ctx.Request().Context(), query)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	groups := make([]publicreportsapi.SummaryGroupData, 0, len(report.Groups))
	for _, group := range report.Groups {
		subGroups := make(map[string]interface{}, len(group.SubGroups))
		for _, subGroup := range group.SubGroups {
			subGroups[strconv.FormatInt(subGroup.UserID, 10)] = map[string]any{
				"billable_seconds": subGroup.BillableSeconds,
				"id":               subGroup.UserID,
				"seconds":          subGroup.Seconds,
				"title":            subGroup.Label,
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
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	}
	query, err := buildQuery(int64(workspaceID), user, request.StartDate, request.EndDate)
	if err != nil {
		return err
	}
	report, err := handler.reports.BuildWeeklyReport(ctx.Request().Context(), query)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	rows := make([]publicreportsapi.WeeklyDataRow, 0, len(report.Rows))
	for _, row := range report.Rows {
		projectID := int(row.ProjectID)
		userID := int(row.UserID)
		billableSeconds := append([]int(nil), row.BillableSeconds...)
		seconds := append([]int(nil), row.Seconds...)
		rows = append(rows, publicreportsapi.WeeklyDataRow{
			BillableSeconds: &billableSeconds,
			ClientName:      lo.ToPtr(row.ClientName),
			ProjectId:       lo.ToPtr(projectID),
			ProjectName:     lo.ToPtr(row.ProjectName),
			Seconds:         &seconds,
			UserId:          lo.ToPtr(userID),
			UserName:        lo.ToPtr(row.UserName),
		})
	}

	return ctx.JSON(http.StatusOK, publicreportsapi.SavedWeeklyReportData{
		Report: &rows,
		Totals: &publicreportsapi.TotalsReportData{
			Seconds:     lo.ToPtr(report.TotalSeconds),
			TrackedDays: lo.ToPtr(report.TrackedDays),
		},
	})
}

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
		return reportsapplication.Query{}, echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	}
	end, err := time.ParseInLocation(time.DateOnly, *endDate, location)
	if err != nil {
		return reportsapplication.Query{}, echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	}
	if end.Before(start) {
		return reportsapplication.Query{}, echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	}

	return reportsapplication.Query{
		EndDate:     end,
		RequestedBy: user.ID,
		StartDate:   start,
		Timezone:    user.Timezone,
		WorkspaceID: workspaceID,
	}, nil
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
