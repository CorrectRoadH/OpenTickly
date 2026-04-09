package bootstrap

import "github.com/labstack/echo/v4"

// ---------------------------------------------------------------------------
// Reports: Summary & Weekly (existing)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

func (server *publicReportsOpenAPIServer) PostInsightsApiV1WorkspaceWorkspaceIdDataTrendsProjects(
	ctx echo.Context,
	workspaceId int,
) error {
	return server.reports.PostInsightsApiV1WorkspaceWorkspaceIdDataTrendsProjects(ctx, workspaceId)
}

func (server *publicReportsOpenAPIServer) PostInsightsApiV1WorkspaceWorkspaceIdProfitabilityProjectsExtension(
	ctx echo.Context,
	workspaceId int,
	extension string,
) error {
	return server.reports.PostInsightsApiV1WorkspaceWorkspaceIdProfitabilityProjectsExtension(ctx, workspaceId, extension)
}

func (server *publicReportsOpenAPIServer) PostInsightsApiV1WorkspaceWorkspaceIdProfitabilityEmployeesExtension(
	ctx echo.Context,
	workspaceId int,
	extension string,
) error {
	return server.reports.PostInsightsApiV1WorkspaceWorkspaceIdProfitabilityEmployeesExtension(ctx, workspaceId, extension)
}

func (server *publicReportsOpenAPIServer) PostInsightsApiV1WorkspaceWorkspaceIdTrendsProjectsExtension(
	ctx echo.Context,
	workspaceId int,
	extension string,
) error {
	return server.reports.PostInsightsApiV1WorkspaceWorkspaceIdTrendsProjectsExtension(ctx, workspaceId, extension)
}

// ---------------------------------------------------------------------------
// Shared Reports
// ---------------------------------------------------------------------------

func (server *publicReportsOpenAPIServer) PostReportsApiV3SharedReportToken(ctx echo.Context, reportToken string) error {
	return server.reports.PostReportsApiV3SharedReportToken(ctx, reportToken)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3SharedReportTokenCsv(ctx echo.Context, reportToken string) error {
	return server.reports.PostReportsApiV3SharedReportTokenCsv(ctx, reportToken)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3SharedReportTokenPdf(ctx echo.Context, reportToken string) error {
	return server.reports.PostReportsApiV3SharedReportTokenPdf(ctx, reportToken)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3SharedReportTokenXlsx(ctx echo.Context, reportToken string) error {
	return server.reports.PostReportsApiV3SharedReportTokenXlsx(ctx, reportToken)
}

// ---------------------------------------------------------------------------
// Data Trends
// ---------------------------------------------------------------------------

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdDataTrendsClients(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdDataTrendsClients(ctx, workspaceId)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdDataTrendsProjects(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdDataTrendsProjects(ctx, workspaceId)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdDataTrendsUsers(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdDataTrendsUsers(ctx, workspaceId)
}

// ---------------------------------------------------------------------------
// Comparative
// ---------------------------------------------------------------------------

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdComparative(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdComparative(ctx, workspaceId)
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdFiltersClients(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdFiltersClients(ctx, workspaceId)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdFiltersProjectGroups(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdFiltersProjectGroups(ctx, workspaceId)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdFiltersProjectUsers(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdFiltersProjectUsers(ctx, workspaceId)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdFiltersProjects(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdFiltersProjects(ctx, workspaceId)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdFiltersProjectsStatus(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdFiltersProjectsStatus(ctx, workspaceId)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdFiltersTasksStatus(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdFiltersTasksStatus(ctx, workspaceId)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdFiltersUsers(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdFiltersUsers(ctx, workspaceId)
}

// ---------------------------------------------------------------------------
// Profitability
// ---------------------------------------------------------------------------

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdProfitabilityProjects(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdProfitabilityProjects(ctx, workspaceId)
}

// ---------------------------------------------------------------------------
// Projects Summary
// ---------------------------------------------------------------------------

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdProjectsSummary(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdProjectsSummary(ctx, workspaceId)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdProjectsProjectIdSummary(ctx echo.Context, workspaceId int, projectId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdProjectsProjectIdSummary(ctx, workspaceId, projectId)
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdSearchClients(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdSearchClients(ctx, workspaceId)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdSearchProjects(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdSearchProjects(ctx, workspaceId)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdSearchTimeEntries(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdSearchTimeEntries(ctx, workspaceId)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdSearchTimeEntriesPdf(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdSearchTimeEntriesPdf(ctx, workspaceId)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdSearchTimeEntriesExtension(ctx echo.Context, workspaceId int, extension string) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdSearchTimeEntriesExtension(ctx, workspaceId, extension)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdSearchTimeEntriesTotals(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdSearchTimeEntriesTotals(ctx, workspaceId)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdSearchUsers(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdSearchUsers(ctx, workspaceId)
}

// ---------------------------------------------------------------------------
// Summary Exports
// ---------------------------------------------------------------------------

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdSummaryTimeEntriesPdf(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdSummaryTimeEntriesPdf(ctx, workspaceId)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdSummaryTimeEntriesExtension(ctx echo.Context, workspaceId int, extension string) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdSummaryTimeEntriesExtension(ctx, workspaceId, extension)
}

// ---------------------------------------------------------------------------
// Weekly Exports
// ---------------------------------------------------------------------------

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdWeeklyTimeEntriesCsv(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdWeeklyTimeEntriesCsv(ctx, workspaceId)
}

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdWeeklyTimeEntriesPdf(ctx echo.Context, workspaceId int) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdWeeklyTimeEntriesPdf(ctx, workspaceId)
}

// ---------------------------------------------------------------------------
// Action Tasks
// ---------------------------------------------------------------------------

func (server *publicReportsOpenAPIServer) PostReportsApiV3WorkspaceWorkspaceIdActionTasks(ctx echo.Context, workspaceId int, action string) error {
	return server.reports.PostReportsApiV3WorkspaceWorkspaceIdActionTasks(ctx, workspaceId, action)
}
