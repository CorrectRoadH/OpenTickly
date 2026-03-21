package httpapp

import "context"

type generatedWebClientsAdapter struct {
	handlers *WebHandlers
}

func newGeneratedWebClientsAdapter(
	handlers *WebHandlers,
) GeneratedWebClientsHandler {
	return &generatedWebClientsAdapter{handlers: handlers}
}

func (adapter *generatedWebClientsAdapter) ListClients(
	ctx context.Context,
	session string,
	request GeneratedListClientsRequest,
) WebResponse {
	return adapter.handlers.Tenant.ListClients(ctx, session, ListProjectsRequest{
		WorkspaceID: request.WorkspaceID,
	})
}

func (adapter *generatedWebClientsAdapter) CreateClient(
	ctx context.Context,
	session string,
	request CreateClientRequestBody,
) WebResponse {
	return adapter.handlers.Tenant.CreateClient(ctx, session, ClientCreateRequest{
		WorkspaceID: request.WorkspaceID,
		Name:        request.Name,
	})
}
