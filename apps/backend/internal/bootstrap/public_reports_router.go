package bootstrap

import "github.com/labstack/echo/v4"

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdSummaryTimeEntries(
	ctx echo.Context,
	workspaceId int,
) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdSummaryTimeEntries(ctx, workspaceId)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdWeeklyTimeEntries(
	ctx echo.Context,
	workspaceId int,
) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdWeeklyTimeEntries(ctx, workspaceId)
}
