package publicapi

import (
	"context"
	"errors"

	"opentoggl/backend/apps/backend/internal/identity/application"
	"opentoggl/backend/apps/backend/internal/identity/domain"
)

type Response struct {
	StatusCode int
	Body       any
}

type Handler struct {
	service *application.Service
}

func NewHandler(service *application.Service) *Handler {
	return &Handler{service: service}
}

func (handler *Handler) GetMe(ctx context.Context, credentials domain.BasicCredentials) Response {
	user, err := handler.service.ResolveBasicUser(ctx, credentials)
	if err != nil {
		return mapError(err)
	}

	return Response{
		StatusCode: 200,
		Body: currentUserBody(user),
	}
}

func (handler *Handler) PutMe(ctx context.Context, credentials domain.BasicCredentials, update domain.ProfileUpdate) Response {
	user, err := handler.service.ResolveBasicUser(ctx, credentials)
	if err != nil {
		return mapError(err)
	}

	updated, err := handler.service.UpdateProfile(ctx, user.ID, update)
	if err != nil {
		return mapError(err)
	}

	return Response{
		StatusCode: 200,
		Body: currentUserBody(updated),
	}
}

func (handler *Handler) GetPreferences(ctx context.Context, credentials domain.BasicCredentials, client string) Response {
	user, err := handler.service.ResolveBasicUser(ctx, credentials)
	if err != nil {
		return mapError(err)
	}

	preferences, err := handler.service.GetPreferences(ctx, user.ID, client)
	if err != nil {
		return mapError(err)
	}

	return Response{
		StatusCode: 200,
		Body: map[string]any{
			"alpha_features":   preferences.AlphaFeatures,
			"date_format":      preferences.DateFormat,
			"timeofday_format": preferences.TimeOfDayFormat,
		},
	}
}

func (handler *Handler) PostPreferences(ctx context.Context, credentials domain.BasicCredentials, client string, preferences domain.Preferences) Response {
	user, err := handler.service.ResolveBasicUser(ctx, credentials)
	if err != nil {
		return mapError(err)
	}

	if err := handler.service.UpdatePreferences(ctx, user.ID, client, preferences); err != nil {
		return mapError(err)
	}

	return Response{
		StatusCode: 200,
		Body:       "Successful operation.",
	}
}

func (handler *Handler) PostResetToken(ctx context.Context, credentials domain.BasicCredentials) Response {
	user, err := handler.service.ResolveBasicUser(ctx, credentials)
	if err != nil {
		return mapError(err)
	}

	token, err := handler.service.ResetAPIToken(ctx, user.ID)
	if err != nil {
		return mapError(err)
	}

	return Response{
		StatusCode: 200,
		Body:       token,
	}
}

func (handler *Handler) GetLogged(ctx context.Context, sessionID string) Response {
	if _, err := handler.service.ResolveCurrentUser(ctx, sessionID); err != nil {
		return mapError(err)
	}

	return Response{StatusCode: 200}
}

func mapError(err error) Response {
	switch {
	case errors.Is(err, domain.ErrCurrentPasswordRequired):
		return Response{StatusCode: 400, Body: "Current password must be present to change password"}
	case errors.Is(err, domain.ErrCurrentPasswordInvalid):
		return Response{StatusCode: 400, Body: "Current password is not valid"}
	case errors.Is(err, domain.ErrPreferencesFieldProtected):
		return Response{StatusCode: 400, Body: "Cannot set value for ToSAcceptNeeded"}
	case errors.Is(err, domain.ErrInvalidDateFormat):
		return Response{StatusCode: 400, Body: "Value in date_format is invalid"}
	case errors.Is(err, domain.ErrInvalidTimeOfDayFormat):
		return Response{StatusCode: 400, Body: "Value in timeofday_format is invalid"}
	case errors.Is(err, application.ErrUnknownAlphaFeature):
		return Response{StatusCode: 400, Body: "Invalid feature code(s)"}
	case errors.Is(err, application.ErrUnknownPreferencesClient):
		return Response{StatusCode: 400, Body: "Unknown client"}
	case errors.Is(err, domain.ErrInvalidCredentials),
		errors.Is(err, domain.ErrUserDeactivated),
		errors.Is(err, domain.ErrUserDeleted),
		errors.Is(err, application.ErrSessionNotFound):
		return Response{StatusCode: 403, Body: "User does not have access to this resource."}
	default:
		return Response{StatusCode: 500, Body: "Internal Server Error"}
	}
}

func currentUserBody(user application.UserSnapshot) map[string]any {
	return map[string]any{
		"id":                   user.ID,
		"email":                user.Email,
		"fullname":             user.FullName,
		"image_url":            nil,
		"api_token":            user.APIToken,
		"timezone":             user.Timezone,
		"default_workspace_id": user.DefaultWorkspaceID,
		"beginning_of_week":    user.BeginningOfWeek,
		"country_id":           user.CountryID,
		"has_password":         user.HasPassword,
		"2fa_enabled":          user.TwoFactorEnabled,
	}
}
