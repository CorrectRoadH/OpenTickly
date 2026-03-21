package httpapp

import "context"

type generatedWave1WebCatalogMiscAdapter struct {
	handlers *Wave1WebHandlers
}

func newGeneratedWave1WebCatalogMiscAdapter(handlers *Wave1WebHandlers) GeneratedWave1WebCatalogMiscHandler {
	return &generatedWave1WebCatalogMiscAdapter{handlers: handlers}
}

func (adapter *generatedWave1WebCatalogMiscAdapter) ListTasks(
	ctx context.Context,
	session string,
	request GeneratedListTasksRequest,
) Wave1Response {
	return adapter.handlers.Tenant.ListTasks(ctx, session, ListProjectsRequest{
		WorkspaceID: request.WorkspaceID,
	})
}

func (adapter *generatedWave1WebCatalogMiscAdapter) CreateTask(
	ctx context.Context,
	session string,
	request CreateTaskRequestBody,
) Wave1Response {
	return adapter.handlers.Tenant.CreateTask(ctx, session, TaskCreateRequest{
		WorkspaceID: request.WorkspaceID,
		Name:        request.Name,
	})
}

func (adapter *generatedWave1WebCatalogMiscAdapter) ListTags(
	ctx context.Context,
	session string,
	request GeneratedListTagsRequest,
) Wave1Response {
	return adapter.handlers.Tenant.ListTags(ctx, session, ListProjectsRequest{
		WorkspaceID: request.WorkspaceID,
	})
}

func (adapter *generatedWave1WebCatalogMiscAdapter) CreateTag(
	ctx context.Context,
	session string,
	request CreateTagRequestBody,
) Wave1Response {
	return adapter.handlers.Tenant.CreateTag(ctx, session, TagCreateRequest{
		WorkspaceID: request.WorkspaceID,
		Name:        request.Name,
	})
}

func (adapter *generatedWave1WebCatalogMiscAdapter) ListGroups(
	ctx context.Context,
	session string,
	request GeneratedListGroupsRequest,
) Wave1Response {
	return adapter.handlers.Tenant.ListGroups(ctx, session, ListProjectsRequest{
		WorkspaceID: request.WorkspaceID,
	})
}

func (adapter *generatedWave1WebCatalogMiscAdapter) CreateGroup(
	ctx context.Context,
	session string,
	request CreateGroupRequestBody,
) Wave1Response {
	return adapter.handlers.Tenant.CreateGroup(ctx, session, GroupCreateRequest{
		WorkspaceID: request.WorkspaceID,
		Name:        request.Name,
	})
}
