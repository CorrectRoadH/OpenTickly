package httpapp

import "context"

type generatedWave1WebOrganizationSettingsAdapter struct {
	handlers *Wave1WebHandlers
}

func newGeneratedWave1WebOrganizationSettingsAdapter(
	handlers *Wave1WebHandlers,
) GeneratedWave1WebOrganizationSettingsHandler {
	return &generatedWave1WebOrganizationSettingsAdapter{handlers: handlers}
}

func (adapter *generatedWave1WebOrganizationSettingsAdapter) GetOrganizationSettings(
	ctx context.Context,
	session string,
	organizationID int64,
) Wave1Response {
	return adapter.handlers.Tenant.GetOrganizationSettings(ctx, session, organizationID)
}

func (adapter *generatedWave1WebOrganizationSettingsAdapter) UpdateOrganizationSettings(
	ctx context.Context,
	session string,
	organizationID int64,
	request UpdateOrganizationSettingsEnvelopeRequestBody,
) Wave1Response {
	organizationRequest := OrganizationSettingsRequest{}
	if request.Organization != nil {
		organizationRequest.Organization.Name = request.Organization.Name
	}

	return adapter.handlers.Tenant.UpdateOrganizationSettings(ctx, session, organizationID, organizationRequest)
}
