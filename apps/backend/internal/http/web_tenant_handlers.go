package httpapp

import "context"

type WorkspacePermissionsRequest struct {
	OnlyAdminsMayCreateProjects bool `json:"only_admins_may_create_projects"`
	OnlyAdminsMayCreateTags     bool `json:"only_admins_may_create_tags"`
	OnlyAdminsSeeTeamDashboard  bool `json:"only_admins_see_team_dashboard"`
	LimitPublicProjectData      bool `json:"limit_public_project_data"`
}

func (handlers *WebTenantHandlers) GetOrganizationSettings(
	_ context.Context,
	sessionID string,
	organizationID int64,
) WebResponse {
	handlers.state.mu.RLock()
	defer handlers.state.mu.RUnlock()

	user, home, ok := handlers.state.userAndHomeBySessionLocked(sessionID)
	if !ok || user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	if organizationID != home.OrganizationID {
		return WebResponse{StatusCode: 404, Body: "organization not found"}
	}

	return WebResponse{
		StatusCode: 200,
		Body: map[string]any{
			"organization": handlers.organizationBody(home),
			"subscription": map[string]any{
				"plan_name": "Free",
				"state":     "free",
			},
		},
	}
}

func (handlers *WebTenantHandlers) UpdateOrganizationSettings(
	_ context.Context,
	sessionID string,
	organizationID int64,
	request OrganizationSettingsRequest,
) WebResponse {
	handlers.state.mu.Lock()
	defer handlers.state.mu.Unlock()

	user, home, ok := handlers.state.userAndHomeBySessionLocked(sessionID)
	if !ok || user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	if organizationID != home.OrganizationID {
		return WebResponse{StatusCode: 404, Body: "organization not found"}
	}

	if request.Organization.Name != "" {
		stored := handlers.state.homes[user.ID]
		stored.OrganizationName = request.Organization.Name
		home = *stored
	}

	return WebResponse{
		StatusCode: 200,
		Body: map[string]any{
			"organization": handlers.organizationBody(home),
			"subscription": map[string]any{
				"plan_name": "Free",
				"state":     "free",
			},
		},
	}
}

func (handlers *WebTenantHandlers) GetWorkspaceSettings(
	_ context.Context,
	sessionID string,
	workspaceID int64,
) WebResponse {
	handlers.state.mu.RLock()
	defer handlers.state.mu.RUnlock()

	user, home, ok := handlers.state.userAndHomeBySessionLocked(sessionID)
	if !ok || user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	if workspaceID != home.WorkspaceID {
		return WebResponse{StatusCode: 404, Body: "workspace not found"}
	}

	return WebResponse{
		StatusCode: 200,
		Body: map[string]any{
			"workspace":    handlers.workspaceBody(home),
			"preferences":  handlers.workspacePreferencesBody(home),
			"subscription": map[string]any{"plan_name": "Free", "state": "free"},
			"capabilities": handlers.capabilityBody(home),
			"quota":        handlers.quotaBody(home),
		},
	}
}

func (handlers *WebTenantHandlers) GetWorkspacePermissions(
	_ context.Context,
	sessionID string,
	workspaceID int64,
) WebResponse {
	handlers.state.mu.RLock()
	defer handlers.state.mu.RUnlock()

	user, home, ok := handlers.state.userAndHomeBySessionLocked(sessionID)
	if !ok || user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	if workspaceID != home.WorkspaceID {
		return WebResponse{StatusCode: 404, Body: "workspace not found"}
	}

	return WebResponse{
		StatusCode: 200,
		Body:       handlers.workspacePermissionsBody(home),
	}
}

func (handlers *WebTenantHandlers) UpdateWorkspacePermissions(
	_ context.Context,
	sessionID string,
	workspaceID int64,
	request WorkspacePermissionsRequest,
) WebResponse {
	handlers.state.mu.Lock()
	defer handlers.state.mu.Unlock()

	user, home, ok := handlers.state.userAndHomeBySessionLocked(sessionID)
	if !ok || user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	if workspaceID != home.WorkspaceID {
		return WebResponse{StatusCode: 404, Body: "workspace not found"}
	}

	stored := handlers.state.homes[user.ID]
	stored.Settings.OnlyAdminsMayCreateProjects = request.OnlyAdminsMayCreateProjects
	stored.Settings.OnlyAdminsMayCreateTags = request.OnlyAdminsMayCreateTags
	stored.Settings.OnlyAdminsSeeTeamDashboard = request.OnlyAdminsSeeTeamDashboard
	stored.Settings.LimitPublicProjectData = request.LimitPublicProjectData
	home = *stored

	return WebResponse{
		StatusCode: 200,
		Body:       handlers.workspacePermissionsBody(home),
	}
}

func (handlers *WebTenantHandlers) GetWorkspaceCapabilities(
	_ context.Context,
	sessionID string,
	workspaceID int64,
) WebResponse {
	handlers.state.mu.RLock()
	defer handlers.state.mu.RUnlock()

	user, home, ok := handlers.state.userAndHomeBySessionLocked(sessionID)
	if !ok || user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	if workspaceID != home.WorkspaceID {
		return WebResponse{StatusCode: 404, Body: "workspace not found"}
	}

	return WebResponse{
		StatusCode: 200,
		Body:       handlers.capabilityBody(home),
	}
}

func (handlers *WebTenantHandlers) GetWorkspaceQuota(
	_ context.Context,
	sessionID string,
	workspaceID int64,
) WebResponse {
	handlers.state.mu.RLock()
	defer handlers.state.mu.RUnlock()

	user, home, ok := handlers.state.userAndHomeBySessionLocked(sessionID)
	if !ok || user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	if workspaceID != home.WorkspaceID {
		return WebResponse{StatusCode: 404, Body: "workspace not found"}
	}

	return WebResponse{
		StatusCode: 200,
		Body:       handlers.quotaBody(home),
	}
}

func (handlers *WebTenantHandlers) UpdateWorkspaceSettings(
	_ context.Context,
	sessionID string,
	workspaceID int64,
	request WorkspaceSettingsRequest,
) WebResponse {
	handlers.state.mu.Lock()
	defer handlers.state.mu.Unlock()

	user, home, ok := handlers.state.userAndHomeBySessionLocked(sessionID)
	if !ok || user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	if workspaceID != home.WorkspaceID {
		return WebResponse{StatusCode: 404, Body: "workspace not found"}
	}

	stored := handlers.state.homes[user.ID]
	if request.Workspace != nil {
		stored.Settings = *request.Workspace
		if stored.Settings.Name == "" {
			stored.Settings.Name = home.Settings.Name
		}
		if stored.Settings.DefaultCurrency == "" {
			stored.Settings.DefaultCurrency = "USD"
		}
	}
	if request.Preferences != nil {
		stored.WorkspacePreferences = *request.Preferences
	}
	home = *stored

	return WebResponse{
		StatusCode: 200,
		Body: map[string]any{
			"workspace":    handlers.workspaceBody(home),
			"preferences":  handlers.workspacePreferencesBody(home),
			"subscription": map[string]any{"plan_name": "Free", "state": "free"},
			"capabilities": handlers.capabilityBody(home),
			"quota":        handlers.quotaBody(home),
		},
	}
}

func (state *webState) userAndHomeBySessionLocked(
	sessionID string,
) (*userRecord, homeRecord, bool) {
	userID, ok := state.sessions[sessionID]
	if !ok {
		return nil, homeRecord{}, false
	}
	user := state.users[userID]
	home := state.homes[userID]
	if user == nil || home == nil {
		return nil, homeRecord{}, false
	}
	return user, *home, true
}

func (handlers *WebTenantHandlers) workspaceBody(home homeRecord) map[string]any {
	return map[string]any{
		"id":                              home.WorkspaceID,
		"organization_id":                 home.OrganizationID,
		"name":                            home.Settings.Name,
		"default_currency":                home.Settings.DefaultCurrency,
		"default_hourly_rate":             home.Settings.DefaultHourlyRate,
		"rounding":                        home.Settings.Rounding,
		"rounding_minutes":                home.Settings.RoundingMinutes,
		"reports_collapse":                home.Settings.ReportsCollapse,
		"only_admins_may_create_projects": home.Settings.OnlyAdminsMayCreateProjects,
		"only_admins_may_create_tags":     home.Settings.OnlyAdminsMayCreateTags,
		"only_admins_see_team_dashboard":  home.Settings.OnlyAdminsSeeTeamDashboard,
		"projects_billable_by_default":    home.Settings.ProjectsBillableByDefault,
		"projects_private_by_default":     home.Settings.ProjectsPrivateByDefault,
		"projects_enforce_billable":       home.Settings.ProjectsEnforceBillable,
		"limit_public_project_data":       home.Settings.LimitPublicProjectData,
		"admin":                           true,
		"premium":                         false,
		"role":                            "admin",
	}
}

func (handlers *WebTenantHandlers) workspacePermissionsBody(home homeRecord) map[string]any {
	return map[string]any{
		"only_admins_may_create_projects": home.Settings.OnlyAdminsMayCreateProjects,
		"only_admins_may_create_tags":     home.Settings.OnlyAdminsMayCreateTags,
		"only_admins_see_team_dashboard":  home.Settings.OnlyAdminsSeeTeamDashboard,
		"limit_public_project_data":       home.Settings.LimitPublicProjectData,
	}
}

func (handlers *WebTenantHandlers) organizationBody(home homeRecord) map[string]any {
	return map[string]any{
		"id":                         home.OrganizationID,
		"name":                       home.OrganizationName,
		"admin":                      true,
		"max_workspaces":             1,
		"pricing_plan_name":          "Free",
		"is_multi_workspace_enabled": false,
		"user_count":                 1,
	}
}

func (handlers *WebTenantHandlers) workspacePreferencesBody(home homeRecord) map[string]any {
	return map[string]any{
		"hide_start_end_times":       home.WorkspacePreferences.HideStartEndTimes,
		"report_locked_at":           home.WorkspacePreferences.ReportLockedAt,
		"show_timesheet_view":        home.WorkspacePreferences.ShowTimesheetView,
		"required_time_entry_fields": home.WorkspacePreferences.RequiredTimeEntryFields,
	}
}

func (handlers *WebTenantHandlers) capabilityBody(home homeRecord) map[string]any {
	return map[string]any{
		"context": map[string]any{
			"organization_id": home.OrganizationID,
			"workspace_id":    home.WorkspaceID,
			"scope":           "workspace",
		},
		"capabilities": []any{
			map[string]any{
				"key":     "reports.summary",
				"enabled": true,
				"source":  "billing",
			},
		},
	}
}

func (handlers *WebTenantHandlers) quotaBody(home homeRecord) map[string]any {
	return map[string]any{
		"organization_id": home.OrganizationID,
		"remaining":       20,
		"resets_in_secs":  600,
		"total":           100,
	}
}
