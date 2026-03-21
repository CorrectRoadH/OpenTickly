package httpapp

import "context"

type generatedWebWorkspacePermissionsAdapter struct {
	handlers *WebHandlers
}

func newGeneratedWebWorkspacePermissionsAdapter(
	handlers *WebHandlers,
) GeneratedWebWorkspacePermissionsHandler {
	return &generatedWebWorkspacePermissionsAdapter{handlers: handlers}
}

func (adapter *generatedWebWorkspacePermissionsAdapter) GetWorkspacePermissions(
	ctx context.Context,
	session string,
	workspaceID int64,
) WebResponse {
	return adapter.handlers.Tenant.GetWorkspacePermissions(ctx, session, workspaceID)
}

func (adapter *generatedWebWorkspacePermissionsAdapter) UpdateWorkspacePermissions(
	ctx context.Context,
	session string,
	workspaceID int64,
	request UpdateWorkspacePermissionsRequestBody,
) WebResponse {
	return adapter.handlers.Tenant.UpdateWorkspacePermissions(ctx, session, workspaceID, WorkspacePermissionsRequest{
		OnlyAdminsMayCreateProjects: request.OnlyAdminsMayCreateProjects,
		OnlyAdminsMayCreateTags:     request.OnlyAdminsMayCreateTags,
		OnlyAdminsSeeTeamDashboard:  request.OnlyAdminsSeeTeamDashboard,
		LimitPublicProjectData:      request.LimitPublicProjectData,
	})
}
