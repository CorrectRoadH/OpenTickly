package httpapp

import "context"

type generatedWave1WebProjectsAdapter struct {
	handlers *Wave1WebHandlers
}

func newGeneratedWave1WebProjectsAdapter(
	handlers *Wave1WebHandlers,
) GeneratedWave1WebProjectsHandler {
	return &generatedWave1WebProjectsAdapter{handlers: handlers}
}

func (adapter *generatedWave1WebProjectsAdapter) ListProjects(
	ctx context.Context,
	session string,
	request GeneratedListProjectsRequest,
) Wave1Response {
	return adapter.handlers.Tenant.ListProjects(ctx, session, ListProjectsRequest{
		WorkspaceID: request.WorkspaceID,
		Status:      request.Status,
	})
}

func (adapter *generatedWave1WebProjectsAdapter) CreateProject(
	ctx context.Context,
	session string,
	request CreateProjectRequestBody,
) Wave1Response {
	return adapter.handlers.Tenant.CreateProject(ctx, session, ProjectCreateRequest{
		WorkspaceID: request.WorkspaceID,
		Name:        request.Name,
	})
}

func (adapter *generatedWave1WebProjectsAdapter) GetProject(
	ctx context.Context,
	session string,
	projectID int64,
) Wave1Response {
	return adapter.handlers.Tenant.GetProject(ctx, session, projectID)
}

func (adapter *generatedWave1WebProjectsAdapter) ArchiveProject(
	ctx context.Context,
	session string,
	projectID int64,
) Wave1Response {
	return adapter.handlers.Tenant.ArchiveProject(ctx, session, projectID)
}

func (adapter *generatedWave1WebProjectsAdapter) RestoreProject(
	ctx context.Context,
	session string,
	projectID int64,
) Wave1Response {
	return adapter.handlers.Tenant.RestoreProject(ctx, session, projectID)
}

func (adapter *generatedWave1WebProjectsAdapter) PinProject(
	ctx context.Context,
	session string,
	projectID int64,
) Wave1Response {
	return adapter.handlers.Tenant.PinProject(ctx, session, projectID)
}

func (adapter *generatedWave1WebProjectsAdapter) UnpinProject(
	ctx context.Context,
	session string,
	projectID int64,
) Wave1Response {
	return adapter.handlers.Tenant.UnpinProject(ctx, session, projectID)
}
