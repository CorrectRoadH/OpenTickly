package httpapp

import "context"

type generatedWebWorkspaceSettingsAdapter struct {
	handlers *WebHandlers
}

func newGeneratedWebWorkspaceSettingsAdapter(
	handlers *WebHandlers,
) GeneratedWebWorkspaceSettingsHandler {
	return &generatedWebWorkspaceSettingsAdapter{handlers: handlers}
}

func (adapter *generatedWebWorkspaceSettingsAdapter) GetWorkspaceSettings(
	ctx context.Context,
	session string,
	workspaceID int64,
) WebResponse {
	return adapter.handlers.Tenant.GetWorkspaceSettings(ctx, session, workspaceID)
}

func (adapter *generatedWebWorkspaceSettingsAdapter) UpdateWorkspaceSettings(
	ctx context.Context,
	session string,
	workspaceID int64,
	request UpdateWorkspaceSettingsEnvelopeRequestBody,
) WebResponse {
	workspaceRequest := WorkspaceSettingsRequest{}
	if request.Workspace != nil {
		workspaceRequest.Workspace = &workspaceSettingsSnapshot{
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
		}
	}
	if request.Preferences != nil {
		workspaceRequest.Preferences = &workspacePreferencesSnapshot{
			HideStartEndTimes: request.Preferences.HideStartEndTimes,
			ReportLockedAt:    request.Preferences.ReportLockedAt,
		}
	}
	return adapter.handlers.Tenant.UpdateWorkspaceSettings(ctx, session, workspaceID, workspaceRequest)
}
