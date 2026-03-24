package bootstrap

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type publicReportsUnimplementedServer struct{}

func (server *publicReportsUnimplementedServer) PostInsightsApiV1WorkspaceWorkspaceIdDataTrendsProjects(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostInsightsApiV1WorkspaceWorkspaceIdProfitabilityEmployeesExtension(ctx echo.Context, workspaceId int, extension string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostInsightsApiV1WorkspaceWorkspaceIdProfitabilityProjectsExtension(ctx echo.Context, workspaceId int, extension string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostInsightsApiV1WorkspaceWorkspaceIdTrendsProjectsExtension(ctx echo.Context, workspaceId int, extension string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3SharedReportToken(ctx echo.Context, reportToken string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3SharedReportTokenCsv(ctx echo.Context, reportToken string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3SharedReportTokenPdf(ctx echo.Context, reportToken string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3SharedReportTokenXlsx(ctx echo.Context, reportToken string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdComparative(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdDataTrendsClients(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdDataTrendsProjects(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdDataTrendsUsers(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdFiltersClients(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdFiltersProjectGroups(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdFiltersProjectUsers(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdFiltersProjects(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdFiltersProjectsStatus(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdFiltersTasksStatus(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdFiltersUsers(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdProfitabilityProjects(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdProjectsSummary(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdProjectsProjectIdSummary(ctx echo.Context, workspaceId int, projectId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdSearchClients(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdSearchProjects(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdSearchTimeEntries(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdSearchTimeEntriesPdf(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdSearchTimeEntriesExtension(ctx echo.Context, workspaceId int, extension string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdSearchTimeEntriesTotals(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdSearchUsers(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdSummaryTimeEntries(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdSummaryTimeEntriesPdf(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdSummaryTimeEntriesExtension(ctx echo.Context, workspaceId int, extension string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdWeeklyTimeEntries(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdWeeklyTimeEntriesCsv(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdWeeklyTimeEntriesPdf(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
func (server *publicReportsUnimplementedServer) PostReportsApiV3WorkspaceWorkspaceIdActionTasks(ctx echo.Context, workspaceId int, action string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
