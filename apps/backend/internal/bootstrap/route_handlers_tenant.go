package bootstrap

import (
	"errors"
	"net/http"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	tenantapplication "opentoggl/backend/apps/backend/internal/tenant/application"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
	tenantweb "opentoggl/backend/apps/backend/internal/tenant/transport/http/web"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

type workspacePermissionsRequest struct {
	OnlyAdminsMayCreateProjects bool `json:"only_admins_may_create_projects"`
	OnlyAdminsMayCreateTags     bool `json:"only_admins_may_create_tags"`
	OnlyAdminsSeeTeamDashboard  bool `json:"only_admins_see_team_dashboard"`
	LimitPublicProjectData      bool `json:"limit_public_project_data"`
}

type workspaceSettingsRequest struct {
	Workspace struct {
		Name                        string  `json:"name"`
		DefaultCurrency             string  `json:"default_currency"`
		DefaultHourlyRate           float64 `json:"default_hourly_rate"`
		Rounding                    int     `json:"rounding"`
		RoundingMinutes             int     `json:"rounding_minutes"`
		ReportsCollapse             bool    `json:"reports_collapse"`
		OnlyAdminsMayCreateProjects bool    `json:"only_admins_may_create_projects"`
		OnlyAdminsMayCreateTags     bool    `json:"only_admins_may_create_tags"`
		OnlyAdminsSeeTeamDashboard  bool    `json:"only_admins_see_team_dashboard"`
		ProjectsBillableByDefault   bool    `json:"projects_billable_by_default"`
		ProjectsPrivateByDefault    bool    `json:"projects_private_by_default"`
		ProjectsEnforceBillable     bool    `json:"projects_enforce_billable"`
		LimitPublicProjectData      bool    `json:"limit_public_project_data"`
	} `json:"workspace"`
	Preferences *workspacePreferences `json:"preferences"`
}

type workspacePreferences struct {
	HideStartEndTimes       bool     `json:"hide_start_end_times"`
	ReportLockedAt          string   `json:"report_locked_at"`
	ShowTimesheetView       bool     `json:"show_timesheet_view"`
	RequiredTimeEntryFields []string `json:"required_time_entry_fields"`
}

func (handlers *routeHandlers) deleteOrganization(ctx echo.Context) error {
	if response, ok := handlers.authorizeSession(ctx); !ok {
		return response
	}
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	home, err := handlers.currentSessionHome(ctx)
	if err != nil {
		return err
	}
	if home.organizationID != organizationID {
		return echo.NewHTTPError(http.StatusForbidden, "Forbidden").
			SetInternal(errors.New("requested organization does not match the current session organization"))
	}

	response := handlers.tenant.DeleteOrganization(ctx.Request().Context(), organizationID)
	return writeTenantResponse(ctx, response)
}

func (handlers *routeHandlers) workspaceSettings(ctx echo.Context) error {
	if response, ok := handlers.authorizeSession(ctx); !ok {
		return response
	}
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handlers.requireCurrentSessionWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	response := handlers.tenant.GetWorkspaceSettings(ctx.Request().Context(), workspaceID)
	return writeTenantResponse(ctx, response)
}

func (handlers *routeHandlers) updateWorkspaceSettings(ctx echo.Context) error {
	if response, ok := handlers.authorizeSession(ctx); !ok {
		return response
	}
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handlers.requireCurrentSessionWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	var request workspaceSettingsRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	workspace, err := handlers.tenantApp.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(workspaceID))
	if err != nil {
		return writeTenantResponse(ctx, tenantweb.Response{StatusCode: 404, Body: "Not Found"})
	}
	preferences := workspacePreferences{
		HideStartEndTimes:       workspace.Settings.HideStartEndTimes(),
		ReportLockedAt:          workspace.Settings.ReportLockedAt(),
		ShowTimesheetView:       workspace.Settings.ShowTimesheetView(),
		RequiredTimeEntryFields: workspace.Settings.RequiredTimeEntryFields(),
	}
	if request.Preferences != nil {
		preferences = *request.Preferences
	}
	response := handlers.tenant.UpdateWorkspaceSettings(ctx.Request().Context(), workspaceID, tenantweb.WorkspaceSettingsRequest{
		Workspace: struct {
			Name                        string  `json:"name"`
			DefaultCurrency             string  `json:"default_currency"`
			DefaultHourlyRate           float64 `json:"default_hourly_rate"`
			Rounding                    int     `json:"rounding"`
			RoundingMinutes             int     `json:"rounding_minutes"`
			ReportsCollapse             bool    `json:"reports_collapse"`
			OnlyAdminsMayCreateProjects bool    `json:"only_admins_may_create_projects"`
			OnlyAdminsMayCreateTags     bool    `json:"only_admins_may_create_tags"`
			OnlyAdminsSeeTeamDashboard  bool    `json:"only_admins_see_team_dashboard"`
			ProjectsBillableByDefault   bool    `json:"projects_billable_by_default"`
			ProjectsPrivateByDefault    bool    `json:"projects_private_by_default"`
			ProjectsEnforceBillable     bool    `json:"projects_enforce_billable"`
			LimitPublicProjectData      bool    `json:"limit_public_project_data"`
		}{
			Name:                        request.Workspace.Name,
			DefaultCurrency:             request.Workspace.DefaultCurrency,
			DefaultHourlyRate:           request.Workspace.DefaultHourlyRate,
			Rounding:                    request.Workspace.Rounding,
			RoundingMinutes:             request.Workspace.RoundingMinutes,
			ReportsCollapse:             request.Workspace.ReportsCollapse,
			OnlyAdminsMayCreateProjects: request.Workspace.OnlyAdminsMayCreateProjects,
			OnlyAdminsMayCreateTags:     request.Workspace.OnlyAdminsMayCreateTags,
			OnlyAdminsSeeTeamDashboard:  request.Workspace.OnlyAdminsSeeTeamDashboard,
			ProjectsBillableByDefault:   request.Workspace.ProjectsBillableByDefault,
			ProjectsPrivateByDefault:    request.Workspace.ProjectsPrivateByDefault,
			ProjectsEnforceBillable:     request.Workspace.ProjectsEnforceBillable,
			LimitPublicProjectData:      request.Workspace.LimitPublicProjectData,
		},
		Preferences: struct {
			HideStartEndTimes       bool     `json:"hide_start_end_times"`
			ReportLockedAt          string   `json:"report_locked_at"`
			ShowTimesheetView       bool     `json:"show_timesheet_view"`
			RequiredTimeEntryFields []string `json:"required_time_entry_fields"`
		}{
			HideStartEndTimes:       preferences.HideStartEndTimes,
			ReportLockedAt:          preferences.ReportLockedAt,
			ShowTimesheetView:       preferences.ShowTimesheetView,
			RequiredTimeEntryFields: preferences.RequiredTimeEntryFields,
		},
	})
	return writeTenantResponse(ctx, response)
}

func (handlers *routeHandlers) workspacePermissions(ctx echo.Context) error {
	if response, ok := handlers.authorizeSession(ctx); !ok {
		return response
	}
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handlers.requireCurrentSessionWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	workspace, err := handlers.tenantApp.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(workspaceID))
	if err != nil {
		return writeTenantResponse(ctx, tenantweb.Response{StatusCode: 404, Body: "Not Found"})
	}

	return ctx.JSON(http.StatusOK, webapi.WorkspacePermissions{
		OnlyAdminsMayCreateProjects: workspace.Settings.OnlyAdminsMayCreateProjects(),
		OnlyAdminsMayCreateTags:     workspace.Settings.OnlyAdminsMayCreateTags(),
		OnlyAdminsSeeTeamDashboard:  workspace.Settings.OnlyAdminsSeeTeamDashboard(),
		LimitPublicProjectData:      workspace.Settings.PublicProjectAccess() == tenantdomain.WorkspacePublicProjectAccessAdmins,
	})
}

func (handlers *routeHandlers) updateWorkspacePermissions(ctx echo.Context) error {
	if response, ok := handlers.authorizeSession(ctx); !ok {
		return response
	}
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handlers.requireCurrentSessionWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	var request workspacePermissionsRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	workspace, err := handlers.tenantApp.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(workspaceID))
	if err != nil {
		return writeTenantResponse(ctx, tenantweb.Response{StatusCode: 404, Body: "Not Found"})
	}

	input := tenantdomain.WorkspaceSettingsInput{
		DefaultCurrency:             workspace.Settings.DefaultCurrency(),
		DefaultHourlyRate:           workspace.Settings.DefaultHourlyRate(),
		Rounding:                    workspace.Settings.Rounding(),
		RoundingMinutes:             workspace.Settings.RoundingMinutes(),
		DisplayPolicy:               workspace.Settings.DisplayPolicy(),
		OnlyAdminsMayCreateProjects: request.OnlyAdminsMayCreateProjects,
		OnlyAdminsMayCreateTags:     request.OnlyAdminsMayCreateTags,
		OnlyAdminsSeeTeamDashboard:  request.OnlyAdminsSeeTeamDashboard,
		ProjectsBillableByDefault:   workspace.Settings.ProjectsBillableByDefault(),
		ProjectsPrivateByDefault:    workspace.Settings.ProjectsPrivateByDefault(),
		ProjectsEnforceBillable:     workspace.Settings.ProjectsEnforceBillable(),
		ReportsCollapse:             workspace.Settings.ReportsCollapse(),
		PublicProjectAccess:         workspacePublicProjectAccess(request.LimitPublicProjectData),
		ReportLockedAt:              workspace.Settings.ReportLockedAt(),
		ShowTimesheetView:           lo.ToPtr(workspace.Settings.ShowTimesheetView()),
		RequiredTimeEntryFields:     workspace.Settings.RequiredTimeEntryFields(),
	}
	if err := handlers.tenantApp.UpdateWorkspace(ctx.Request().Context(), tenantapplication.UpdateWorkspaceCommand{
		WorkspaceID: tenantdomain.WorkspaceID(workspaceID),
		Name:        workspace.Name,
		Settings:    input,
	}); err != nil {
		return writeTenantResponse(ctx, tenantweb.Response{StatusCode: 500, Body: "Internal Server Error"})
	}
	return handlers.workspacePermissions(ctx)
}

func workspacePublicProjectAccess(limitPublicProjectData bool) tenantdomain.WorkspacePublicProjectAccess {
	if limitPublicProjectData {
		return tenantdomain.WorkspacePublicProjectAccessAdmins
	}
	return tenantdomain.WorkspacePublicProjectAccessMembers
}
