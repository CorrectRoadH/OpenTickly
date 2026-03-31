package web

import (
	"context"
	"errors"
	"log/slog"
	"strings"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	"opentoggl/backend/apps/backend/internal/identity/application"
	"opentoggl/backend/apps/backend/internal/identity/domain"

	openapi_types "github.com/oapi-codegen/runtime/types"
)

type Response struct {
	StatusCode int
	Body       any
	SessionID  string
}

type RegisterRequest struct {
	Email    string
	FullName string
	Password string
}

type LoginRequest struct {
	Email    string
	Password string
}

type ProfileRequest struct {
	CurrentPassword    string `json:"current_password"`
	Password           string `json:"password"`
	Email              string `json:"email"`
	FullName           string `json:"fullname"`
	Timezone           string `json:"timezone"`
	BeginningOfWeek    *int   `json:"beginning_of_week"`
	CountryID          *int64 `json:"country_id"`
	DefaultWorkspaceID *int64 `json:"default_workspace_id"`
}

type PreferencesRequest struct {
	DateFormat      string                `json:"date_format"`
	TimeOfDayFormat string                `json:"timeofday_format"`
	AlphaFeatures   []domain.AlphaFeature `json:"alpha_features"`
}

type SessionShellData struct {
	CurrentOrganizationID    *int
	CurrentWorkspaceID       *int
	OrganizationSubscription webapi.SubscriptionView
	WorkspaceSubscription    webapi.SubscriptionView
	Organizations            []webapi.OrganizationSettings
	Workspaces               []webapi.WorkspaceSettings
	WorkspaceCapabilities    webapi.CapabilitySnapshot
	WorkspaceQuota           webapi.QuotaWindow
}

type PreferencesResponse struct {
	AlphaFeatures       []domain.AlphaFeature `json:"alpha_features"`
	BeginningOfWeek     int                   `json:"beginningOfWeek"`
	CollapseTimeEntries bool                  `json:"collapseTimeEntries"`
	DateFormat          string                `json:"date_format"`
	DurationFormat      string                `json:"duration_format"`
	HideSidebarRight    bool                  `json:"hide_sidebar_right"`
	LanguageCode        string                `json:"language_code"`
	ManualEntryMode     string                `json:"manualEntryMode"`
	ManualMode          bool                  `json:"manualMode"`
	PgTimeZoneName      string                `json:"pg_time_zone_name"`
	ReportsCollapse     bool                  `json:"reports_collapse"`
	TimeOfDayFormat     string                `json:"timeofday_format"`
}

type SessionShellProvider interface {
	SessionShell(context.Context, application.UserSnapshot) (SessionShellData, error)
}

type Handler struct {
	service       *application.Service
	shellProvider SessionShellProvider
	logger        *slog.Logger
}

func NewHandler(service *application.Service) *Handler {
	return &Handler{
		service: service,
		logger:  slog.Default(),
	}
}

func NewHandlerWithShell(service *application.Service, shellProvider SessionShellProvider) *Handler {
	return &Handler{
		service:       service,
		shellProvider: shellProvider,
		logger:        slog.Default(),
	}
}

func (handler *Handler) Register(ctx context.Context, request RegisterRequest) Response {
	auth, err := handler.service.Register(ctx, application.RegisterInput{
		Email:    request.Email,
		FullName: request.FullName,
		Password: request.Password,
	})
	if err != nil {
		return handler.mapError(ctx, "register", err)
	}

	bootstrap, err := handler.sessionBootstrap(ctx, auth.User)
	if err != nil {
		return handler.mapError(ctx, "register", err)
	}

	return Response{
		StatusCode: 201,
		Body:       bootstrap,
		SessionID:  auth.SessionID,
	}
}

func (handler *Handler) Login(ctx context.Context, request LoginRequest) Response {
	auth, err := handler.service.LoginBasic(ctx, domain.BasicCredentials{
		Username: request.Email,
		Password: request.Password,
	})
	if err != nil {
		return handler.mapError(ctx, "login", err)
	}

	bootstrap, err := handler.sessionBootstrap(ctx, auth.User)
	if err != nil {
		return handler.mapError(ctx, "login", err)
	}

	return Response{
		StatusCode: 200,
		Body:       bootstrap,
		SessionID:  auth.SessionID,
	}
}

func (handler *Handler) Logout(ctx context.Context, sessionID string) Response {
	if err := handler.service.Logout(ctx, sessionID); err != nil {
		return handler.mapError(ctx, "logout", err)
	}

	return Response{StatusCode: 204}
}

func (handler *Handler) GetSession(ctx context.Context, sessionID string) Response {
	user, err := handler.service.ResolveCurrentUser(ctx, sessionID)
	if err != nil {
		return handler.mapError(ctx, "get_session", err)
	}

	bootstrap, err := handler.sessionBootstrap(ctx, user)
	if err != nil {
		return handler.mapError(ctx, "get_session", err)
	}

	return Response{
		StatusCode: 200,
		Body:       bootstrap,
	}
}

func (handler *Handler) GetProfile(ctx context.Context, sessionID string) Response {
	user, err := handler.service.ResolveCurrentUser(ctx, sessionID)
	if err != nil {
		return handler.mapError(ctx, "get_profile", err)
	}

	return Response{
		StatusCode: 200,
		Body:       profileBody(user, user.DefaultWorkspaceID),
	}
}

func (handler *Handler) UpdateProfile(ctx context.Context, sessionID string, request ProfileRequest) Response {
	user, err := handler.service.ResolveCurrentUser(ctx, sessionID)
	if err != nil {
		return handler.mapError(ctx, "update_profile", err)
	}

	updated, err := handler.service.UpdateProfile(ctx, user.ID, domain.ProfileUpdate{
		CurrentPassword:    request.CurrentPassword,
		Password:           request.Password,
		Email:              request.Email,
		FullName:           request.FullName,
		Timezone:           request.Timezone,
		BeginningOfWeek:    request.BeginningOfWeek,
		CountryID:          request.CountryID,
		DefaultWorkspaceID: request.DefaultWorkspaceID,
	})
	if err != nil {
		return handler.mapError(ctx, "update_profile", err)
	}

	return Response{
		StatusCode: 200,
		Body:       profileBody(updated, updated.DefaultWorkspaceID),
	}
}

/*
ResetAPIToken rotates the current user's API token and returns the updated token
using the minimal web shell response shape.
*/
func (handler *Handler) ResetAPIToken(ctx context.Context, sessionID string) Response {
	user, err := handler.service.ResolveCurrentUser(ctx, sessionID)
	if err != nil {
		return handler.mapError(ctx, "reset_api_token", err)
	}

	token, err := handler.service.ResetAPIToken(ctx, user.ID)
	if err != nil {
		return handler.mapError(ctx, "reset_api_token", err)
	}

	return Response{
		StatusCode: 200,
		Body:       webapi.CurrentUserAPIToken{ApiToken: token},
	}
}

func (handler *Handler) GetPreferences(ctx context.Context, sessionID string, client string) Response {
	user, err := handler.service.ResolveCurrentUser(ctx, sessionID)
	if err != nil {
		return handler.mapError(ctx, "get_preferences", err)
	}

	preferences, err := handler.service.GetPreferences(ctx, user.ID, client)
	if err != nil {
		return handler.mapError(ctx, "get_preferences", err)
	}

	return Response{
		StatusCode: 200,
		Body:       preferencesBody(user, preferences),
	}
}

func (handler *Handler) UpdatePreferences(ctx context.Context, sessionID string, client string, request PreferencesRequest) Response {
	user, err := handler.service.ResolveCurrentUser(ctx, sessionID)
	if err != nil {
		return handler.mapError(ctx, "update_preferences", err)
	}

	update := domain.Preferences{
		DateFormat:      request.DateFormat,
		TimeOfDayFormat: normalizeTimeOfDayFormat(request.TimeOfDayFormat),
		AlphaFeatures:   request.AlphaFeatures,
	}

	if err := handler.service.UpdatePreferences(ctx, user.ID, client, update); err != nil {
		return handler.mapError(ctx, "update_preferences", err)
	}

	updatedUser, err := handler.service.ResolveCurrentUser(ctx, sessionID)
	if err != nil {
		return handler.mapError(ctx, "update_preferences", err)
	}
	preferences, err := handler.service.GetPreferences(ctx, updatedUser.ID, client)
	if err != nil {
		return handler.mapError(ctx, "update_preferences", err)
	}

	return Response{
		StatusCode: 200,
		Body:       preferencesBody(updatedUser, preferences),
	}
}

func (handler *Handler) sessionBootstrap(
	ctx context.Context,
	user application.UserSnapshot,
) (webapi.SessionBootstrap, error) {
	shell := SessionShellData{
		Organizations: []webapi.OrganizationSettings{},
		Workspaces:    []webapi.WorkspaceSettings{},
	}
	if handler.shellProvider != nil {
		resolved, err := handler.shellProvider.SessionShell(ctx, user)
		if err != nil {
			return webapi.SessionBootstrap{}, err
		}
		shell = resolved
		if shell.Organizations == nil {
			shell.Organizations = []webapi.OrganizationSettings{}
		}
		if shell.Workspaces == nil {
			shell.Workspaces = []webapi.WorkspaceSettings{}
		}
	}

	defaultWorkspaceID := user.DefaultWorkspaceID
	if defaultWorkspaceID <= 0 && shell.CurrentWorkspaceID != nil {
		defaultWorkspaceID = int64(*shell.CurrentWorkspaceID)
	}

	return webapi.SessionBootstrap{
		CurrentOrganizationId:    shell.CurrentOrganizationID,
		CurrentWorkspaceId:       shell.CurrentWorkspaceID,
		OrganizationSubscription: shell.OrganizationSubscription,
		User:                     profileBody(user, defaultWorkspaceID),
		WorkspaceSubscription:    shell.WorkspaceSubscription,
		Organizations:            shell.Organizations,
		Workspaces:               shell.Workspaces,
		WorkspaceCapabilities:    shell.WorkspaceCapabilities,
		WorkspaceQuota:           shell.WorkspaceQuota,
	}, nil
}

func profileBody(user application.UserSnapshot, defaultWorkspaceID int64) webapi.CurrentUserProfile {
	return webapi.CurrentUserProfile{
		N2faEnabled:        user.TwoFactorEnabled,
		ApiToken:           user.APIToken,
		BeginningOfWeek:    user.BeginningOfWeek,
		CountryId:          int(user.CountryID),
		DefaultWorkspaceId: int(defaultWorkspaceID),
		Email:              openapi_types.Email(user.Email),
		Fullname:           user.FullName,
		HasPassword:        user.HasPassword,
		Id:                 int(user.ID),
		ImageUrl:           webAvatarURL(user.AvatarStorageKey),
		Timezone:           user.Timezone,
	}
}

func preferencesBody(user application.UserSnapshot, preferences domain.Preferences) PreferencesResponse {
	return PreferencesResponse{
		AlphaFeatures:       preferences.AlphaFeatures,
		BeginningOfWeek:     user.BeginningOfWeek,
		CollapseTimeEntries: false,
		DateFormat:          preferences.DateFormat,
		DurationFormat:      "improved",
		HideSidebarRight:    false,
		LanguageCode:        preferences.LanguageCode,
		ManualEntryMode:     "timer",
		ManualMode:          false,
		PgTimeZoneName:      user.Timezone,
		ReportsCollapse:     false,
		TimeOfDayFormat:     preferences.TimeOfDayFormat,
	}
}

func (handler *Handler) mapError(ctx context.Context, operation string, err error) Response {
	switch {
	case errors.Is(err, domain.ErrInvalidEmail),
		errors.Is(err, domain.ErrInvalidFullName),
		errors.Is(err, domain.ErrInvalidPassword),
		errors.Is(err, domain.ErrCurrentPasswordRequired),
		errors.Is(err, domain.ErrCurrentPasswordInvalid),
		errors.Is(err, domain.ErrInvalidDateFormat),
		errors.Is(err, domain.ErrInvalidTimeOfDayFormat),
		errors.Is(err, domain.ErrPreferencesFieldProtected),
		errors.Is(err, application.ErrUnknownAlphaFeature),
		errors.Is(err, application.ErrUnknownPreferencesClient):
		return Response{StatusCode: 400, Body: err.Error()}
	case errors.Is(err, application.ErrSessionNotFound):
		return Response{StatusCode: 401, Body: "Unauthorized"}
	case errors.Is(err, application.ErrRegistrationClosed):
		return Response{StatusCode: 403, Body: "Registration is currently closed."}
	case errors.Is(err, domain.ErrInvalidCredentials),
		errors.Is(err, domain.ErrUserDeactivated),
		errors.Is(err, domain.ErrUserDeleted):
		return Response{StatusCode: 403, Body: "User does not have access to this resource."}
	default:
		logger := handler.logger
		if logger == nil {
			logger = slog.Default()
		}
		logger.ErrorContext(ctx, "identity web handler error", "operation", operation, "error", err.Error())
		return Response{StatusCode: 500, Body: "Internal Server Error"}
	}
}

func normalizeTimeOfDayFormat(value string) string {
	if strings.TrimSpace(value) == "h:mm a" {
		return "h:mm A"
	}
	return value
}

func webAvatarURL(storageKey string) *string {
	if storageKey == "" {
		return nil
	}
	url := "https://cdn.example.com/" + storageKey
	return &url
}
