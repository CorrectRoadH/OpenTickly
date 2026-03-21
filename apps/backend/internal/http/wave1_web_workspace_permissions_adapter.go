package httpapp

import "context"

type generatedWave1WebWorkspacePermissionsAdapter struct {
	handlers *Wave1WebHandlers
}

func newGeneratedWave1WebWorkspacePermissionsAdapter(
	handlers *Wave1WebHandlers,
) GeneratedWave1WebWorkspacePermissionsHandler {
	return &generatedWave1WebWorkspacePermissionsAdapter{handlers: handlers}
}

func (adapter *generatedWave1WebWorkspacePermissionsAdapter) GetWorkspacePermissions(
	ctx context.Context,
	session string,
	workspaceID int64,
) Wave1Response {
	return adapter.handlers.Tenant.GetWorkspacePermissions(ctx, session, workspaceID)
}

func (adapter *generatedWave1WebWorkspacePermissionsAdapter) UpdateWorkspacePermissions(
	ctx context.Context,
	session string,
	workspaceID int64,
	request UpdateWorkspacePermissionsRequestBody,
) Wave1Response {
	return adapter.handlers.Tenant.UpdateWorkspacePermissions(ctx, session, workspaceID, WorkspacePermissionsRequest{
		OnlyAdminsMayCreateProjects: request.OnlyAdminsMayCreateProjects,
		OnlyAdminsMayCreateTags:     request.OnlyAdminsMayCreateTags,
		OnlyAdminsSeeTeamDashboard:  request.OnlyAdminsSeeTeamDashboard,
		LimitPublicProjectData:      request.LimitPublicProjectData,
	})
}
