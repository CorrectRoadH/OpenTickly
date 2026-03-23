package publicapi

import (
	"net/http"
	"strconv"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

type ScopeAuthorizer interface {
	RequirePublicTrackUser(ctx echo.Context) (any, error)
	RequirePublicTrackWorkspace(ctx echo.Context, workspaceID int64) error
}

type Handler struct {
	scope ScopeAuthorizer
}

func NewHandler(scope ScopeAuthorizer) *Handler {
	return &Handler{scope: scope}
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
