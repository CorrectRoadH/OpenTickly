package bootstrap

import (
	. "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (server *publicTrackOpenAPIServer) GetSharedReport(ctx echo.Context, workspaceId int, params GetSharedReportParams) error {
	_ = workspaceId
	_ = params
	return server.reports.GetSharedReport(ctx)
}

func (server *publicTrackOpenAPIServer) PostSharedReport(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.reports.PostSharedReport(ctx)
}

func (server *publicTrackOpenAPIServer) PutSharedReport(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.reports.PutSharedReport(ctx)
}

func (server *publicTrackOpenAPIServer) GetSavedReportResource(ctx echo.Context, workspaceId int, reportId int) error {
	_ = workspaceId
	_ = reportId
	return server.reports.GetSavedReportResource(ctx)
}

func (server *publicTrackOpenAPIServer) PutSavedReportResource(ctx echo.Context, workspaceId int, reportId int) error {
	_ = workspaceId
	_ = reportId
	return server.reports.PutSavedReportResource(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteSavedReportResource(ctx echo.Context, workspaceId int, reportId int) error {
	_ = workspaceId
	_ = reportId
	return server.reports.DeleteSavedReportResource(ctx)
}

func (server *publicTrackOpenAPIServer) BulkDeleteSavedReportResource(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.reports.BulkDeleteSavedReportResource(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceScheduledReports(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.reports.GetWorkspaceScheduledReports(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspaceScheduledReports(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.reports.PostWorkspaceScheduledReports(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteWorkspaceScheduledReports(ctx echo.Context, workspaceId int, reportId int) error {
	_ = workspaceId
	_ = reportId
	return server.reports.DeleteWorkspaceScheduledReports(ctx)
}
