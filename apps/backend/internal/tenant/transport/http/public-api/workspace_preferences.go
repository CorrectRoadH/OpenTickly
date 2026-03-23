package publicapi

import (
	"net/http"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	tenantapplication "opentoggl/backend/apps/backend/internal/tenant/application"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) GetPublicTrackWorkspacePreferences(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	view, err := handler.tenant.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(workspaceID))
	if err != nil {
		return mapError(err)
	}
	return ctx.JSON(http.StatusOK, workspacePreferencesBody(view))
}

func (handler *Handler) PostPublicTrackWorkspacePreferences(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.ModelsWorkspacePreferences
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	current, err := handler.tenant.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(workspaceID))
	if err != nil {
		return mapError(err)
	}

	settings := current.Settings
	displayPolicy := settings.DisplayPolicy()
	if request.HideStartEndTimes != nil {
		if lo.FromPtr(request.HideStartEndTimes) {
			displayPolicy = tenantdomain.WorkspaceDisplayPolicyHideStartEndTimes
		} else {
			displayPolicy = tenantdomain.WorkspaceDisplayPolicyStandard
		}
	}

	showTimesheetView := settings.ShowTimesheetView()
	if request.DisableTimesheetView != nil {
		showTimesheetView = !lo.FromPtr(request.DisableTimesheetView)
	}

	if err := handler.tenant.UpdateWorkspace(ctx.Request().Context(), tenantapplication.UpdateWorkspaceCommand{
		WorkspaceID: tenantdomain.WorkspaceID(workspaceID),
		Name:        current.Name,
		Settings: tenantdomain.WorkspaceSettingsInput{
			DefaultCurrency:             settings.DefaultCurrency(),
			DefaultHourlyRate:           settings.DefaultHourlyRate(),
			Rounding:                    settings.Rounding(),
			RoundingMinutes:             settings.RoundingMinutes(),
			DisplayPolicy:               displayPolicy,
			OnlyAdminsMayCreateProjects: settings.OnlyAdminsMayCreateProjects(),
			OnlyAdminsMayCreateTags:     settings.OnlyAdminsMayCreateTags(),
			OnlyAdminsSeeTeamDashboard:  settings.OnlyAdminsSeeTeamDashboard(),
			ProjectsBillableByDefault:   settings.ProjectsBillableByDefault(),
			ProjectsPrivateByDefault:    settings.ProjectsPrivateByDefault(),
			ProjectsEnforceBillable:     settings.ProjectsEnforceBillable(),
			ReportsCollapse:             settings.ReportsCollapse(),
			PublicProjectAccess:         settings.PublicProjectAccess(),
			ReportLockedAt:              settings.ReportLockedAt(),
			ShowTimesheetView:           lo.ToPtr(showTimesheetView),
			RequiredTimeEntryFields:     settings.RequiredTimeEntryFields(),
		},
	}); err != nil {
		return mapError(err)
	}

	updated, err := handler.tenant.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(workspaceID))
	if err != nil {
		return mapError(err)
	}
	return ctx.JSON(http.StatusOK, workspacePreferencesBody(updated))
}

func workspacePreferencesBody(view tenantapplication.WorkspaceView) publictrackapi.ModelsWorkspacePreferences {
	return publictrackapi.ModelsWorkspacePreferences{
		DisableApprovals:     lo.ToPtr(false),
		DisableExpenses:      lo.ToPtr(false),
		DisableTimesheetView: lo.ToPtr(!view.Settings.ShowTimesheetView()),
		HideStartEndTimes:    lo.ToPtr(view.Settings.HideStartEndTimes()),
		ReportLockedAt:       optionalString(view.Settings.ReportLockedAt()),
		SingleSignOn:         lo.ToPtr(false),
	}
}

func optionalString(value string) *string {
	if value == "" {
		return nil
	}
	return lo.ToPtr(value)
}
