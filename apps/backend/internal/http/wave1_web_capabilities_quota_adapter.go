package httpapp

import "context"

type generatedWave1WebCapabilitiesQuotaAdapter struct {
	handlers *Wave1WebHandlers
}

func newGeneratedWave1WebCapabilitiesQuotaAdapter(
	handlers *Wave1WebHandlers,
) GeneratedWave1WebCapabilitiesQuotaHandler {
	return &generatedWave1WebCapabilitiesQuotaAdapter{handlers: handlers}
}

func (adapter *generatedWave1WebCapabilitiesQuotaAdapter) GetWorkspaceCapabilities(
	ctx context.Context,
	session string,
	workspaceID int64,
) Wave1Response {
	return adapter.handlers.Tenant.GetWorkspaceCapabilities(ctx, session, workspaceID)
}

func (adapter *generatedWave1WebCapabilitiesQuotaAdapter) GetWorkspaceQuota(
	ctx context.Context,
	session string,
	workspaceID int64,
) Wave1Response {
	return adapter.handlers.Tenant.GetWorkspaceQuota(ctx, session, workspaceID)
}
