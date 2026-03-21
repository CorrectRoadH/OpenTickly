package httpapp

import "context"

type generatedWebProfilePreferencesAdapter struct {
	handlers *WebHandlers
}

func newGeneratedWebProfilePreferencesAdapter(
	handlers *WebHandlers,
) GeneratedWebProfilePreferencesHandler {
	return &generatedWebProfilePreferencesAdapter{handlers: handlers}
}

func (adapter *generatedWebProfilePreferencesAdapter) GetCurrentUserProfile(
	ctx context.Context,
	session string,
) WebResponse {
	return adapter.handlers.GetProfile(ctx, session)
}

func (adapter *generatedWebProfilePreferencesAdapter) UpdateCurrentUserProfile(
	ctx context.Context,
	session string,
	request UpdateCurrentUserProfileRequestBody,
) WebResponse {
	profileRequest := ProfileRequest{
		Email:              request.Email,
		FullName:           request.Fullname,
		Timezone:           request.Timezone,
		BeginningOfWeek:    &request.BeginningOfWeek,
		CountryID:          &request.CountryID,
		DefaultWorkspaceID: &request.DefaultWorkspaceID,
	}
	if request.CurrentPassword != nil {
		profileRequest.CurrentPassword = *request.CurrentPassword
	}
	if request.Password != nil {
		profileRequest.Password = *request.Password
	}
	return adapter.handlers.UpdateProfile(ctx, session, profileRequest)
}

func (adapter *generatedWebProfilePreferencesAdapter) ResetCurrentUserAPIToken(
	ctx context.Context,
	session string,
) WebResponse {
	return adapter.handlers.ResetAPIToken(ctx, session)
}

func (adapter *generatedWebProfilePreferencesAdapter) GetCurrentUserPreferences(
	ctx context.Context,
	session string,
) WebResponse {
	return adapter.handlers.GetPreferences(ctx, session)
}

func (adapter *generatedWebProfilePreferencesAdapter) UpdateCurrentUserPreferences(
	ctx context.Context,
	session string,
	request UpdateCurrentUserPreferencesRequestBody,
) WebResponse {
	return adapter.handlers.UpdatePreferences(ctx, session, PreferencesRequest{
		DateFormat:          request.DateFormat,
		TimeOfDayFormat:     request.TimeOfDayFormat,
		DurationFormat:      request.DurationFormat,
		PGTimeZoneName:      request.PGTimeZoneName,
		BeginningOfWeek:     request.BeginningOfWeek,
		CollapseTimeEntries: request.CollapseTimeEntries,
		LanguageCode:        request.LanguageCode,
		HideSidebarRight:    request.HideSidebarRight,
		ReportsCollapse:     request.ReportsCollapse,
		ManualMode:          request.ManualMode,
		ManualEntryMode:     request.ManualEntryMode,
	})
}
