package httpapp

import "context"

type generatedWebProjectsAdapter struct {
	handlers *WebHandlers
}

func newGeneratedWebProjectsAdapter(
	handlers *WebHandlers,
) GeneratedWebProjectsHandler {
	return &generatedWebProjectsAdapter{handlers: handlers}
}

func (adapter *generatedWebProjectsAdapter) ListProjects(
	ctx context.Context,
	session string,
	request GeneratedListProjectsRequest,
) WebResponse {
	return adapter.handlers.Tenant.ListProjects(ctx, session, ListProjectsRequest{
		WorkspaceID: request.WorkspaceID,
		Status:      request.Status,
	})
}

func (adapter *generatedWebProjectsAdapter) CreateProject(
	ctx context.Context,
	session string,
	request CreateProjectRequestBody,
) WebResponse {
	return adapter.handlers.Tenant.CreateProject(ctx, session, ProjectCreateRequest{
		WorkspaceID: request.WorkspaceID,
		Name:        request.Name,
	})
}

func (adapter *generatedWebProjectsAdapter) GetProject(
	ctx context.Context,
	session string,
	projectID int64,
) WebResponse {
	return adapter.handlers.Tenant.GetProject(ctx, session, projectID)
}

func (adapter *generatedWebProjectsAdapter) ArchiveProject(
	ctx context.Context,
	session string,
	projectID int64,
) WebResponse {
	return adapter.handlers.Tenant.ArchiveProject(ctx, session, projectID)
}

func (adapter *generatedWebProjectsAdapter) RestoreProject(
	ctx context.Context,
	session string,
	projectID int64,
) WebResponse {
	return adapter.handlers.Tenant.RestoreProject(ctx, session, projectID)
}

func (adapter *generatedWebProjectsAdapter) PinProject(
	ctx context.Context,
	session string,
	projectID int64,
) WebResponse {
	return adapter.handlers.Tenant.PinProject(ctx, session, projectID)
}

func (adapter *generatedWebProjectsAdapter) UnpinProject(
	ctx context.Context,
	session string,
	projectID int64,
) WebResponse {
	return adapter.handlers.Tenant.UnpinProject(ctx, session, projectID)
}
