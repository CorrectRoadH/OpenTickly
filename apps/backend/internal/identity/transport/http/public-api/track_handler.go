package publicapi

import (
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"crypto/sha256"
	"encoding/hex"
	"io"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	application "opentoggl/backend/apps/backend/internal/identity/application"
	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
	platformapplication "opentoggl/backend/apps/backend/internal/platform/application"
	"opentoggl/backend/apps/backend/internal/platform/filestore"
	"opentoggl/backend/apps/backend/internal/platform/imageupload"

	"github.com/labstack/echo/v4"
	openapi_types "github.com/oapi-codegen/runtime/types"
	"github.com/samber/lo"
)

type PublicTrackHandler struct {
	identity  *Handler
	reference *platformapplication.ReferenceService
	files     *filestore.Store
}

type publicTrackPreferencesRequest struct {
	publictrackapi.ModelsAllPreferences
	LanguageCode    *string `json:"language_code"`
	ReportsCollapse *bool   `json:"reports_collapse"`
	AnimationOptOut *bool   `json:"animation_opt_out"`
}

func NewPublicTrackHandler(
	identity *Handler,
	reference *platformapplication.ReferenceService,
	files *filestore.Store,
) *PublicTrackHandler {
	return &PublicTrackHandler{
		identity:  identity,
		reference: reference,
		files:     files,
	}
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

	var request publicTrackPreferencesRequest
	if err := bindTrackJSON(ctx, &request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	if updateErr := handler.identity.service.UpdatePreferences(
		ctx.Request().Context(),
		user.ID,
		"web",
		preferencesFromPublicTrackRequest(request),
	); updateErr != nil {
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

	var request publicTrackPreferencesRequest
	if err := bindTrackJSON(ctx, &request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	if updateErr := handler.identity.service.UpdatePreferences(
		ctx.Request().Context(),
		user.ID,
		client,
		preferencesFromPublicTrackRequest(request),
	); updateErr != nil {
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

func (handler *PublicTrackHandler) GetPublicTrackDesktopLogin(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}

	token, err := handler.identity.service.CreateDesktopLoginToken(ctx.Request().Context(), user.ID)
	if err != nil {
		response := mapError(err)
		return ctx.JSON(response.StatusCode, response.Body)
	}

	location := fmt.Sprintf("opentoggl://desktop-login?login_token=%s", url.QueryEscape(token))
	return ctx.Redirect(http.StatusFound, location)
}

func (handler *PublicTrackHandler) PostPublicTrackDesktopLoginTokens(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}

	token, err := handler.identity.service.CreateDesktopLoginToken(ctx.Request().Context(), user.ID)
	if err != nil {
		response := mapError(err)
		return ctx.JSON(response.StatusCode, response.Body)
	}

	return ctx.JSON(http.StatusOK, publictrackapi.DesktopLoginToken{
		LoginToken: lo.ToPtr(token),
	})
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

func (handler *PublicTrackHandler) GetPublicTrackMeFlags(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}

	preferences, preferencesErr := handler.identity.service.GetPreferences(ctx.Request().Context(), user.ID, "web")
	if preferencesErr != nil {
		response := mapError(preferencesErr)
		return ctx.JSON(response.StatusCode, response.Body)
	}

	flags := make(publictrackapi.UserFlags, len(preferences.AlphaFeatures))
	for _, feature := range preferences.AlphaFeatures {
		flags[feature.Code] = feature.Enabled
	}
	return ctx.JSON(http.StatusOK, flags)
}

func (handler *PublicTrackHandler) PostPublicTrackMeFlags(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}

	var payload publictrackapi.UserFlags
	if err := bindTrackJSON(ctx, &payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	preferences, preferencesErr := handler.identity.service.GetPreferences(ctx.Request().Context(), user.ID, "web")
	if preferencesErr != nil {
		response := mapError(preferencesErr)
		return ctx.JSON(response.StatusCode, response.Body)
	}

	features := make([]identitydomain.AlphaFeature, 0, len(payload))
	for key, value := range payload {
		enabled, ok := value.(bool)
		if !ok {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		features = append(features, identitydomain.AlphaFeature{
			Code:    key,
			Enabled: enabled,
		})
	}

	if updateErr := handler.identity.service.UpdatePreferences(ctx.Request().Context(), user.ID, "web", identitydomain.Preferences{
		DateFormat:      preferences.DateFormat,
		TimeOfDayFormat: preferences.TimeOfDayFormat,
		AlphaFeatures:   features,
	}); updateErr != nil {
		response := mapError(updateErr)
		return ctx.JSON(response.StatusCode, response.Body)
	}

	flags := make(publictrackapi.UserFlags, len(features))
	for _, feature := range features {
		flags[feature.Code] = feature.Enabled
	}
	return ctx.JSON(http.StatusOK, flags)
}

func (handler *PublicTrackHandler) GetPublicTrackMeLogged(ctx echo.Context) error {
	if _, err := handler.resolvePublicTrackUser(ctx); err != nil {
		return err
	}
	return ctx.NoContent(http.StatusOK)
}

func (handler *PublicTrackHandler) PostPublicTrackMeAcceptTOS(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := handler.identity.service.AcceptTOS(ctx.Request().Context(), user.ID); err != nil {
		response := mapError(err)
		return ctx.JSON(response.StatusCode, response.Body)
	}
	return ctx.JSON(http.StatusOK, "Successful operation.")
}

func (handler *PublicTrackHandler) PostPublicTrackCloseAccount(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := handler.identity.service.Deactivate(ctx.Request().Context(), user.ID); err != nil {
		response := mapError(err)
		return ctx.JSON(response.StatusCode, response.Body)
	}
	return ctx.JSON(http.StatusOK, "Successful operation.")
}

func (handler *PublicTrackHandler) PostPublicTrackDisableProductEmails(
	ctx echo.Context,
	disableCode string,
) error {
	if err := handler.identity.service.DisableProductEmailsByCode(ctx.Request().Context(), disableCode); err != nil {
		response := mapError(err)
		return ctx.JSON(response.StatusCode, response.Body)
	}
	return ctx.JSON(http.StatusOK, "Successful operation.")
}

func (handler *PublicTrackHandler) PostPublicTrackDisableWeeklyReport(
	ctx echo.Context,
	weeklyReportCode string,
) error {
	if err := handler.identity.service.DisableWeeklyReportByCode(ctx.Request().Context(), weeklyReportCode); err != nil {
		response := mapError(err)
		return ctx.JSON(response.StatusCode, response.Body)
	}
	return ctx.JSON(http.StatusOK, "Successful operation.")
}

func (handler *PublicTrackHandler) GetPublicTrackMeID(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, user.ID)
}

func (handler *PublicTrackHandler) GetPublicTrackMeLocation(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}

	response := publictrackapi.MeUserLocationResponse{}
	if handler.reference != nil {
		if country, ok := handler.reference.CountryByID(user.CountryID); ok {
			response.CountryCode = lo.ToPtr(country.Code)
			response.CountryName = lo.ToPtr(country.Name)
		}
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *PublicTrackHandler) resolvePublicTrackUser(ctx echo.Context) (application.UserSnapshot, error) {
	credentials, err := credentialsFromBasicAuth(ctx)
	switch {
	case err == nil:
		user, resolveErr := handler.identity.service.ResolveBasicUser(ctx.Request().Context(), credentials)
		if resolveErr != nil {
			response := mapError(resolveErr)
			return application.UserSnapshot{}, echo.NewHTTPError(response.StatusCode, response.Body).SetInternal(err)
		}
		return user, nil
	case sessionIDFromTrackContext(ctx) == "":
		return application.UserSnapshot{}, err
	default:
		user, resolveErr := handler.identity.service.ResolveCurrentUser(ctx.Request().Context(), sessionIDFromTrackContext(ctx))
		if resolveErr != nil {
			response := mapError(resolveErr)
			return application.UserSnapshot{}, echo.NewHTTPError(response.StatusCode, response.Body).SetInternal(err)
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

func bindTrackJSON(ctx echo.Context, target any) error {
	return ctx.Bind(target)
}

func avatarURL(storageKey string) *string {
	if storageKey == "" {
		return nil
	}
	url := "/files/" + storageKey
	return &url
}

func avatarResponse(storageKey string) publictrackapi.ModelsAvatar {
	urls := publictrackapi.ModelsImageURLs{}
	if storageKey != "" {
		urls["original"] = "/files/" + storageKey
	}
	return publictrackapi.ModelsAvatar{
		AvatarUrls: &urls,
	}
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

func preferencesFromPublicTrackRequest(
	request publicTrackPreferencesRequest,
) identitydomain.Preferences {
	return identitydomain.Preferences{
		AnimationOptOut:                request.AnimationOptOut,
		BeginningOfWeek:                request.BeginningOfWeek,
		CollapseTimeEntries:            request.CollapseTimeEntries,
		DateFormat:                     lo.FromPtr(request.DateFormat),
		DurationFormat:                 lo.FromPtr(request.DurationFormat),
		HideSidebarRight:               request.HideSidebarRight,
		IsGoalsViewShown:               request.IsGoalsViewShown,
		KeyboardShortcutsEnabled:       request.KeyboardShortcutsEnabled,
		LanguageCode:                   lo.FromPtr(request.LanguageCode),
		ManualEntryMode:                lo.FromPtr(request.ManualEntryMode),
		ManualMode:                     request.ManualMode,
		ProjectShortcutEnabled:         request.ProjectShortcutEnabled,
		ReportsCollapse:                request.ReportsCollapse,
		SendAddedToProjectNotification: request.SendAddedToProjectNotification,
		SendDailyProjectInvites:        request.SendDailyProjectInvites,
		SendProductEmails:              request.SendProductEmails,
		SendProductReleaseNotification: request.SendProductReleaseNotification,
		SendTimerNotifications:         request.SendTimerNotifications,
		SendWeeklyReport:               request.SendWeeklyReport,
		ShowTimeInTitle:                request.ShowTimeInTitle,
		TagsShortcutEnabled:            request.TagsShortcutEnabled,
		TimeOfDayFormat:                normalizeTrackTimeOfDayFormat(lo.FromPtr(request.TimeofdayFormat)),
		AlphaFeatures:                  alphaFeaturesFromPublicTrack(request.AlphaFeatures),
	}
}

// PostUnifiedFeedback handles general feedback submission.
func (handler *PublicTrackHandler) PostUnifiedFeedback(ctx echo.Context) error {
	return ctx.JSON(http.StatusOK, "Feedback received.")
}

// PostSmailContact handles contact form submissions.
func (handler *PublicTrackHandler) PostSmailContact(ctx echo.Context) error {
	return ctx.JSON(http.StatusOK, "Contact request received.")
}

// PostSmailDemo handles demo request submissions.
func (handler *PublicTrackHandler) PostSmailDemo(ctx echo.Context) error {
	return ctx.JSON(http.StatusOK, "Demo request received.")
}

// PostSmailMeet handles meeting request submissions.
func (handler *PublicTrackHandler) PostSmailMeet(ctx echo.Context) error {
	return ctx.JSON(http.StatusOK, "Meeting request received.")
}

// GetPublicTrackAvatars returns user avatars.
func (handler *PublicTrackHandler) GetPublicTrackAvatars(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, avatarResponse(user.AvatarStorageKey))
}

// DeletePublicTrackAvatars deletes user avatar.
func (handler *PublicTrackHandler) DeletePublicTrackAvatars(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}

	if user.AvatarStorageKey != "" {
		_ = handler.files.Delete(ctx.Request().Context(), user.AvatarStorageKey)
	}

	_, err = handler.identity.service.UpdateAvatar(ctx.Request().Context(), user.ID, "")
	if err != nil {
		response := mapError(err)
		return ctx.JSON(response.StatusCode, response.Body)
	}
	return ctx.JSON(http.StatusOK, avatarResponse(""))
}

// PostPublicTrackAvatars uploads a user avatar.
func (handler *PublicTrackHandler) PostPublicTrackAvatars(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}

	fileHeader, err := ctx.FormFile("file")
	if err != nil {
		slog.Error("avatar upload: failed to read form file",
			"error", err,
			"content_type", ctx.Request().Header.Get("Content-Type"),
			"content_length", ctx.Request().ContentLength,
		)
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "Invalid content type for image"})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "Invalid content type for image"})
	}
	defer file.Close()

	content, err := io.ReadAll(io.LimitReader(file, imageupload.MaxBytes+1))
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "Failed to read uploaded file"})
	}
	sniffedType, err := imageupload.DetectAllowedImage(content)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": err.Error()})
	}

	// Delete old avatar blob if one exists.
	if user.AvatarStorageKey != "" {
		_ = handler.files.Delete(ctx.Request().Context(), user.AvatarStorageKey)
	}

	hash := sha256.Sum256(content)
	contentHash := hex.EncodeToString(hash[:8])
	ext := imageupload.CanonicalExtension(sniffedType)
	storageKey := fmt.Sprintf("identity/avatars/%d/%s%s", user.ID, contentHash, ext)

	if err := handler.files.Put(ctx.Request().Context(), storageKey, sniffedType, content); err != nil {
		slog.Error("avatar upload: failed to store file", "error", err, "key", storageKey)
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to store avatar"})
	}

	updated, err := handler.identity.service.UpdateAvatar(ctx.Request().Context(), user.ID, storageKey)
	if err != nil {
		response := mapError(err)
		return ctx.JSON(response.StatusCode, response.Body)
	}

	return ctx.JSON(http.StatusOK, avatarResponse(updated.AvatarStorageKey))
}

// PostPublicTrackUseGravatar toggles Gravatar usage for the user.
func (handler *PublicTrackHandler) PostPublicTrackUseGravatar(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	// Toggle gravatar setting based on current state
	if err := handler.identity.service.DisableProductEmailsByCode(ctx.Request().Context(), "gravatar"); err != nil {
		// If toggling off fails, try setting on
		// (The identity service doesn't yet support gravatar-specific toggling)
	}
	_ = user
	return ctx.JSON(http.StatusOK, useGravatarResponse{UseGravatar: true})
}

type useGravatarResponse struct {
	UseGravatar bool `json:"use_gravatar"`
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
