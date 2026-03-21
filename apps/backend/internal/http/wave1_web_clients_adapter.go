package httpapp

import "context"

type generatedWave1WebClientsAdapter struct {
	handlers *Wave1WebHandlers
}

func newGeneratedWave1WebClientsAdapter(
	handlers *Wave1WebHandlers,
) GeneratedWave1WebClientsHandler {
	return &generatedWave1WebClientsAdapter{handlers: handlers}
}

func (adapter *generatedWave1WebClientsAdapter) ListClients(
	ctx context.Context,
	session string,
	request GeneratedListClientsRequest,
) Wave1Response {
	return adapter.handlers.Tenant.ListClients(ctx, session, ListProjectsRequest{
		WorkspaceID: request.WorkspaceID,
	})
}

func (adapter *generatedWave1WebClientsAdapter) CreateClient(
	ctx context.Context,
	session string,
	request CreateClientRequestBody,
) Wave1Response {
	return adapter.handlers.Tenant.CreateClient(ctx, session, ClientCreateRequest{
		WorkspaceID: request.WorkspaceID,
		Name:        request.Name,
	})
}
