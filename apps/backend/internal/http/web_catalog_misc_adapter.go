package httpapp

import "context"

type generatedWebCatalogMiscAdapter struct {
	handlers *WebHandlers
}

func newGeneratedWebCatalogMiscAdapter(handlers *WebHandlers) GeneratedWebCatalogMiscHandler {
	return &generatedWebCatalogMiscAdapter{handlers: handlers}
}

func (adapter *generatedWebCatalogMiscAdapter) ListTasks(
	ctx context.Context,
	session string,
	request GeneratedListTasksRequest,
) WebResponse {
	return adapter.handlers.Tenant.ListTasks(ctx, session, ListProjectsRequest{
		WorkspaceID: request.WorkspaceID,
	})
}

func (adapter *generatedWebCatalogMiscAdapter) CreateTask(
	ctx context.Context,
	session string,
	request CreateTaskRequestBody,
) WebResponse {
	return adapter.handlers.Tenant.CreateTask(ctx, session, TaskCreateRequest{
		WorkspaceID: request.WorkspaceID,
		Name:        request.Name,
	})
}

func (adapter *generatedWebCatalogMiscAdapter) ListTags(
	ctx context.Context,
	session string,
	request GeneratedListTagsRequest,
) WebResponse {
	return adapter.handlers.Tenant.ListTags(ctx, session, ListProjectsRequest{
		WorkspaceID: request.WorkspaceID,
	})
}

func (adapter *generatedWebCatalogMiscAdapter) CreateTag(
	ctx context.Context,
	session string,
	request CreateTagRequestBody,
) WebResponse {
	return adapter.handlers.Tenant.CreateTag(ctx, session, TagCreateRequest{
		WorkspaceID: request.WorkspaceID,
		Name:        request.Name,
	})
}

func (adapter *generatedWebCatalogMiscAdapter) ListGroups(
	ctx context.Context,
	session string,
	request GeneratedListGroupsRequest,
) WebResponse {
	return adapter.handlers.Tenant.ListGroups(ctx, session, ListProjectsRequest{
		WorkspaceID: request.WorkspaceID,
	})
}

func (adapter *generatedWebCatalogMiscAdapter) CreateGroup(
	ctx context.Context,
	session string,
	request CreateGroupRequestBody,
) WebResponse {
	return adapter.handlers.Tenant.CreateGroup(ctx, session, GroupCreateRequest{
		WorkspaceID: request.WorkspaceID,
		Name:        request.Name,
	})
}
