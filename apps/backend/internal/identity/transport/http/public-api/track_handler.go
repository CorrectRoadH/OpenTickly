package publicapi

import (
	"net/http"
	"strings"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	application "opentoggl/backend/apps/backend/internal/identity/application"
	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"

	"github.com/labstack/echo/v4"
	openapi_types "github.com/oapi-codegen/runtime/types"
	"github.com/samber/lo"
)

type PublicTrackHandler struct {
	identity *Handler
}

func NewPublicTrackHandler(identity *Handler) *PublicTrackHandler {
	return &PublicTrackHandler{identity: identity}
}

func (handler *PublicTrackHandler) GetPublicTrackMe(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, currentUserBody(user))
}

func (handler *PublicTrackHandler) PutPublicTrackMe(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}

	var request publictrackapi.MePayload
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	updated, updateErr := handler.identity.service.UpdateProfile(ctx.Request().Context(), user.ID, identitydomain.ProfileUpdate{
		CurrentPassword:    lo.FromPtr(request.CurrentPassword),
		Password:           lo.FromPtr(request.Password),
		Email:              emailValue(request.Email),
		FullName:           lo.FromPtr(request.Fullname),
		Timezone:           lo.FromPtr(request.Timezone),
		BeginningOfWeek:    request.BeginningOfWeek,
		CountryID:          int64PointerFromTrackIntPointer(request.CountryId),
		DefaultWorkspaceID: int64PointerFromTrackIntPointer(request.DefaultWorkspaceId),
	})
	if updateErr != nil {
		response := mapError(updateErr)
		return ctx.JSON(response.StatusCode, response.Body)
	}
	return ctx.JSON(http.StatusOK, currentUserBody(updated))
}

func (handler *PublicTrackHandler) GetPublicTrackPreferences(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	preferences, preferencesErr := handler.identity.service.GetPreferences(ctx.Request().Context(), user.ID, "web")
	if preferencesErr != nil {
		response := mapError(preferencesErr)
		return ctx.JSON(response.StatusCode, response.Body)
	}
	return ctx.JSON(http.StatusOK, preferencesBody(preferences))
}

func (handler *PublicTrackHandler) PostPublicTrackPreferences(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}

	var request publictrackapi.ModelsAllPreferences
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	if updateErr := handler.identity.service.UpdatePreferences(ctx.Request().Context(), user.ID, "web", identitydomain.Preferences{
		DateFormat:      lo.FromPtr(request.DateFormat),
		TimeOfDayFormat: normalizeTrackTimeOfDayFormat(lo.FromPtr(request.TimeofdayFormat)),
		AlphaFeatures:   alphaFeaturesFromPublicTrack(request.AlphaFeatures),
	}); updateErr != nil {
		response := mapError(updateErr)
		return ctx.JSON(response.StatusCode, response.Body)
	}

	preferences, preferencesErr := handler.identity.service.GetPreferences(ctx.Request().Context(), user.ID, "web")
	if preferencesErr != nil {
		response := mapError(preferencesErr)
		return ctx.JSON(response.StatusCode, response.Body)
	}
	return ctx.JSON(http.StatusOK, preferencesBody(preferences))
}

func (handler *PublicTrackHandler) GetPublicTrackPreferencesClient(ctx echo.Context, client string) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	preferences, preferencesErr := handler.identity.service.GetPreferences(ctx.Request().Context(), user.ID, client)
	if preferencesErr != nil {
		response := mapError(preferencesErr)
		return ctx.JSON(response.StatusCode, response.Body)
	}
	return ctx.JSON(http.StatusOK, preferencesBody(preferences))
}

func (handler *PublicTrackHandler) PostPublicTrackPreferencesClient(ctx echo.Context, client string) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}

	var request publictrackapi.ModelsAllPreferences
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	if updateErr := handler.identity.service.UpdatePreferences(ctx.Request().Context(), user.ID, client, identitydomain.Preferences{
		DateFormat:      lo.FromPtr(request.DateFormat),
		TimeOfDayFormat: normalizeTrackTimeOfDayFormat(lo.FromPtr(request.TimeofdayFormat)),
		AlphaFeatures:   alphaFeaturesFromPublicTrack(request.AlphaFeatures),
	}); updateErr != nil {
		response := mapError(updateErr)
		return ctx.JSON(response.StatusCode, response.Body)
	}
	preferences, preferencesErr := handler.identity.service.GetPreferences(ctx.Request().Context(), user.ID, client)
	if preferencesErr != nil {
		response := mapError(preferencesErr)
		return ctx.JSON(response.StatusCode, response.Body)
	}
	return ctx.JSON(http.StatusOK, preferencesBody(preferences))
}

func (handler *PublicTrackHandler) PostPublicTrackResetToken(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	token, resetErr := handler.identity.service.ResetAPIToken(ctx.Request().Context(), user.ID)
	if resetErr != nil {
		response := mapError(resetErr)
		return ctx.JSON(response.StatusCode, response.Body)
	}
	return ctx.JSON(http.StatusOK, token)
}

func (handler *PublicTrackHandler) GetPublicTrackMeFeatures(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	features, err := handler.identity.service.ListAlphaFeatures(ctx.Request().Context(), user.ID, "web")
	if err != nil {
		response := mapError(err)
		return ctx.JSON(response.StatusCode, response.Body)
	}

	apiFeatures := make([]publictrackapi.MeFeature, 0, len(features))
	for index, feature := range features {
		featureID := index + 1
		apiFeatures = append(apiFeatures, publictrackapi.MeFeature{
			Enabled:   lo.ToPtr(feature.Enabled),
			FeatureId: lo.ToPtr(featureID),
			Name:      lo.ToPtr(feature.Code),
		})
	}

	response := []publictrackapi.MeWorkspace{{
		Features:    &apiFeatures,
		WorkspaceId: lo.ToPtr(int(user.DefaultWorkspaceID)),
	}}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *PublicTrackHandler) GetPublicTrackMeLogged(ctx echo.Context) error {
	if _, err := handler.resolvePublicTrackUser(ctx); err != nil {
		return err
	}
	return ctx.NoContent(http.StatusOK)
}

func (handler *PublicTrackHandler) GetPublicTrackMeID(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, user.ID)
}

func (handler *PublicTrackHandler) resolvePublicTrackUser(ctx echo.Context) (application.UserSnapshot, error) {
	credentials, err := credentialsFromBasicAuth(ctx)
	switch {
	case err == nil:
		user, resolveErr := handler.identity.service.ResolveBasicUser(ctx.Request().Context(), credentials)
		if resolveErr != nil {
			response := mapError(resolveErr)
			return application.UserSnapshot{}, echo.NewHTTPError(response.StatusCode, response.Body)
		}
		return user, nil
	case sessionIDFromTrackContext(ctx) == "":
		return application.UserSnapshot{}, err
	default:
		user, resolveErr := handler.identity.service.ResolveCurrentUser(ctx.Request().Context(), sessionIDFromTrackContext(ctx))
		if resolveErr != nil {
			response := mapError(resolveErr)
			return application.UserSnapshot{}, echo.NewHTTPError(response.StatusCode, response.Body)
		}
		return user, nil
	}
}

func credentialsFromBasicAuth(ctx echo.Context) (identitydomain.BasicCredentials, error) {
	username, password, ok := ctx.Request().BasicAuth()
	if !ok {
		return identitydomain.BasicCredentials{}, echo.NewHTTPError(http.StatusForbidden, "User does not have access to this resource.")
	}
	return identitydomain.BasicCredentials{
		Username: username,
		Password: password,
	}, nil
}

func sessionIDFromTrackContext(ctx echo.Context) string {
	cookie, err := ctx.Cookie("opentoggl_session")
	if err == nil {
		return cookie.Value
	}
	return ""
}

func normalizeTrackTimeOfDayFormat(value string) string {
	if strings.TrimSpace(value) == "h:mm a" {
		return "h:mm A"
	}
	return value
}

func emailValue(value *openapi_types.Email) string {
	if value == nil {
		return ""
	}
	return string(*value)
}

func int64PointerFromTrackIntPointer(value *int) *int64 {
	if value == nil {
		return nil
	}
	return lo.ToPtr(int64(*value))
}

func alphaFeaturesFromPublicTrack(values *[]publictrackapi.ModelsAlphaFeature) []identitydomain.AlphaFeature {
	if values == nil {
		return nil
	}

	features := make([]identitydomain.AlphaFeature, 0, len(*values))
	for _, value := range *values {
		features = append(features, identitydomain.AlphaFeature{
			Code:    lo.FromPtr(value.Code),
			Enabled: lo.FromPtr(value.Enabled),
		})
	}
	return features
}
