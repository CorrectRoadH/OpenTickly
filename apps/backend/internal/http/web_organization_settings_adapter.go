package httpapp

import "context"

type generatedWebOrganizationSettingsAdapter struct {
	handlers *WebHandlers
}

func newGeneratedWebOrganizationSettingsAdapter(
	handlers *WebHandlers,
) GeneratedWebOrganizationSettingsHandler {
	return &generatedWebOrganizationSettingsAdapter{handlers: handlers}
}

func (adapter *generatedWebOrganizationSettingsAdapter) GetOrganizationSettings(
	ctx context.Context,
	session string,
	organizationID int64,
) WebResponse {
	return adapter.handlers.Tenant.GetOrganizationSettings(ctx, session, organizationID)
}

func (adapter *generatedWebOrganizationSettingsAdapter) UpdateOrganizationSettings(
	ctx context.Context,
	session string,
	organizationID int64,
	request UpdateOrganizationSettingsEnvelopeRequestBody,
) WebResponse {
	organizationRequest := OrganizationSettingsRequest{}
	if request.Organization != nil {
		organizationRequest.Organization.Name = request.Organization.Name
	}

	return adapter.handlers.Tenant.UpdateOrganizationSettings(ctx, session, organizationID, organizationRequest)
}
