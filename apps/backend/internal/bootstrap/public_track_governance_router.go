package bootstrap

import (
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (server *publicTrackOpenAPIServer) GetWorkspaceTimeEntryConstraints(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.governance.GetPublicTrackTimeEntryConstraints(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspaceTimeEntryConstraints(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.governance.PostPublicTrackTimeEntryConstraints(ctx)
}

func (server *publicTrackOpenAPIServer) GetAlerts(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.governance.GetPublicTrackAlerts(ctx)
}

func (server *publicTrackOpenAPIServer) PostAlerts(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.governance.PostPublicTrackAlerts(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteAlerts(ctx echo.Context, workspaceId int, alertId int) error {
	_ = workspaceId
	_ = alertId
	return server.governance.DeletePublicTrackAlerts(ctx)
}

func (server *publicTrackOpenAPIServer) PutAlerts(ctx echo.Context, workspaceId int, alertId int) error {
	_ = workspaceId
	_ = alertId
	return server.governance.PutPublicTrackAlerts(ctx)
}

func (server *publicTrackOpenAPIServer) GetTimesheetSetups(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetTimesheetSetupsParams,
) error {
	_ = workspaceId
	_ = params
	return server.governance.GetPublicTrackTimesheetSetups(ctx)
}

func (server *publicTrackOpenAPIServer) PostTimesheetSetups(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.governance.PostPublicTrackTimesheetSetups(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteTimesheetSetups(ctx echo.Context, workspaceId int, setupId int) error {
	_ = workspaceId
	_ = setupId
	return server.governance.DeletePublicTrackTimesheetSetups(ctx)
}

func (server *publicTrackOpenAPIServer) PutTimesheetSetups(ctx echo.Context, workspaceId int, setupId int) error {
	_ = workspaceId
	_ = setupId
	return server.governance.PutPublicTrackTimesheetSetups(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceTimesheetsHandler(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetWorkspaceTimesheetsHandlerParams,
) error {
	_ = workspaceId
	_ = params
	return server.governance.GetPublicTrackTimesheets(ctx)
}

func (server *publicTrackOpenAPIServer) PutWorkspaceTimesheetsBatchHandler(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.governance.PutPublicTrackTimesheetsBatch(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceTimesheetHoursHandler(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.governance.GetPublicTrackTimesheetHours(ctx)
}

func (server *publicTrackOpenAPIServer) PutWorkspaceTimesheetsHandler(
	ctx echo.Context,
	workspaceId int,
	setupId int,
	startDate string,
) error {
	_ = workspaceId
	_ = setupId
	_ = startDate
	return server.governance.PutPublicTrackTimesheet(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceTimesheetHistoryHandler(
	ctx echo.Context,
	workspaceId int,
	setupId int,
	startDate string,
) error {
	_ = workspaceId
	_ = setupId
	_ = startDate
	return server.governance.GetPublicTrackTimesheetHistory(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceTimesheetTimeEntriesHandler(
	ctx echo.Context,
	workspaceId int,
	setupId int,
	startDate string,
) error {
	_ = workspaceId
	_ = setupId
	_ = startDate
	return server.governance.GetPublicTrackTimesheetTimeEntries(ctx)
}

func (server *publicTrackOpenAPIServer) GetMeTimesheets(ctx echo.Context) error {
	return server.governance.GetPublicTrackMeTimesheets(ctx)
}
