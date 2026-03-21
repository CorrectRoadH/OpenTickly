package httpapp

import "context"

type generatedWebCapabilitiesQuotaAdapter struct {
	handlers *WebHandlers
}

func newGeneratedWebCapabilitiesQuotaAdapter(
	handlers *WebHandlers,
) GeneratedWebCapabilitiesQuotaHandler {
	return &generatedWebCapabilitiesQuotaAdapter{handlers: handlers}
}

func (adapter *generatedWebCapabilitiesQuotaAdapter) GetWorkspaceCapabilities(
	ctx context.Context,
	session string,
	workspaceID int64,
) WebResponse {
	return adapter.handlers.Tenant.GetWorkspaceCapabilities(ctx, session, workspaceID)
}

func (adapter *generatedWebCapabilitiesQuotaAdapter) GetWorkspaceQuota(
	ctx context.Context,
	session string,
	workspaceID int64,
) WebResponse {
	return adapter.handlers.Tenant.GetWorkspaceQuota(ctx, session, workspaceID)
}
