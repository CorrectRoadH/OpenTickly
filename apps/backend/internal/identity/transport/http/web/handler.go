package web

import (
	"context"
	"errors"
	"strings"

	"opentoggl/backend/apps/backend/internal/identity/application"
	"opentoggl/backend/apps/backend/internal/identity/domain"
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
	CurrentOrganizationID    *int64
	CurrentWorkspaceID       *int64
	OrganizationSubscription any
	WorkspaceSubscription    any
	Organizations            []any
	Workspaces               []any
	WorkspaceCapabilities    any
	WorkspaceQuota           any
}

type SessionShellProvider interface {
	SessionShell(context.Context, application.UserSnapshot) (SessionShellData, error)
}

type Handler struct {
	service       *application.Service
	shellProvider SessionShellProvider
}

func NewHandler(service *application.Service) *Handler {
	return &Handler{service: service}
}

func NewHandlerWithShell(service *application.Service, shellProvider SessionShellProvider) *Handler {
	return &Handler{
		service:       service,
		shellProvider: shellProvider,
	}
}

func (handler *Handler) Register(ctx context.Context, request RegisterRequest) Response {
	auth, err := handler.service.Register(ctx, application.RegisterInput{
		Email:    request.Email,
		FullName: request.FullName,
		Password: request.Password,
	})
	if err != nil {
		return mapError(err)
	}

	bootstrap, err := handler.sessionBootstrap(ctx, auth.User)
	if err != nil {
		return mapError(err)
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
		return mapError(err)
	}

	bootstrap, err := handler.sessionBootstrap(ctx, auth.User)
	if err != nil {
		return mapError(err)
	}

	return Response{
		StatusCode: 200,
		Body:       bootstrap,
		SessionID:  auth.SessionID,
	}
}

func (handler *Handler) Logout(ctx context.Context, sessionID string) Response {
	if err := handler.service.Logout(ctx, sessionID); err != nil {
		return mapError(err)
	}

	return Response{StatusCode: 204}
}

func (handler *Handler) GetSession(ctx context.Context, sessionID string) Response {
	user, err := handler.service.ResolveCurrentUser(ctx, sessionID)
	if err != nil {
		return mapError(err)
	}

	bootstrap, err := handler.sessionBootstrap(ctx, user)
	if err != nil {
		return mapError(err)
	}

	return Response{
		StatusCode: 200,
		Body:       bootstrap,
	}
}

func (handler *Handler) GetProfile(ctx context.Context, sessionID string) Response {
	user, err := handler.service.ResolveCurrentUser(ctx, sessionID)
	if err != nil {
		return mapError(err)
	}

	return Response{
		StatusCode: 200,
		Body:       profileBody(user),
	}
}

func (handler *Handler) UpdateProfile(ctx context.Context, sessionID string, request ProfileRequest) Response {
	user, err := handler.service.ResolveCurrentUser(ctx, sessionID)
	if err != nil {
		return mapError(err)
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
		return mapError(err)
	}

	return Response{
		StatusCode: 200,
		Body:       profileBody(updated),
	}
}

/*
ResetAPIToken rotates the current user's API token and returns the updated token
using the minimal web shell response shape.
*/
func (handler *Handler) ResetAPIToken(ctx context.Context, sessionID string) Response {
	user, err := handler.service.ResolveCurrentUser(ctx, sessionID)
	if err != nil {
		return mapError(err)
	}

	token, err := handler.service.ResetAPIToken(ctx, user.ID)
	if err != nil {
		return mapError(err)
	}

	return Response{
		StatusCode: 200,
		Body: map[string]any{
			"api_token": token,
		},
	}
}

func (handler *Handler) GetPreferences(ctx context.Context, sessionID string, client string) Response {
	user, err := handler.service.ResolveCurrentUser(ctx, sessionID)
	if err != nil {
		return mapError(err)
	}

	preferences, err := handler.service.GetPreferences(ctx, user.ID, client)
	if err != nil {
		return mapError(err)
	}

	return Response{
		StatusCode: 200,
		Body:       preferencesBody(user, preferences),
	}
}

func (handler *Handler) UpdatePreferences(ctx context.Context, sessionID string, client string, request PreferencesRequest) Response {
	user, err := handler.service.ResolveCurrentUser(ctx, sessionID)
	if err != nil {
		return mapError(err)
	}

	update := domain.Preferences{
		DateFormat:      request.DateFormat,
		TimeOfDayFormat: normalizeTimeOfDayFormat(request.TimeOfDayFormat),
		AlphaFeatures:   request.AlphaFeatures,
	}

	if err := handler.service.UpdatePreferences(ctx, user.ID, client, update); err != nil {
		return mapError(err)
	}

	updatedUser, err := handler.service.ResolveCurrentUser(ctx, sessionID)
	if err != nil {
		return mapError(err)
	}
	preferences, err := handler.service.GetPreferences(ctx, updatedUser.ID, client)
	if err != nil {
		return mapError(err)
	}

	return Response{
		StatusCode: 200,
		Body:       preferencesBody(updatedUser, preferences),
	}
}

func (handler *Handler) sessionBootstrap(
	ctx context.Context,
	user application.UserSnapshot,
) (map[string]any, error) {
	shell := SessionShellData{
		Organizations:         []any{},
		Workspaces:            []any{},
		WorkspaceCapabilities: nil,
		WorkspaceQuota:        nil,
	}
	if handler.shellProvider != nil {
		resolved, err := handler.shellProvider.SessionShell(ctx, user)
		if err != nil {
			return nil, err
		}
		shell = resolved
		if shell.Organizations == nil {
			shell.Organizations = []any{}
		}
		if shell.Workspaces == nil {
			shell.Workspaces = []any{}
		}
	}

	return map[string]any{
		"current_organization_id":   shell.CurrentOrganizationID,
		"current_workspace_id":      shell.CurrentWorkspaceID,
		"organization_subscription": shell.OrganizationSubscription,
		"workspace_subscription":    shell.WorkspaceSubscription,
		"user": map[string]any{
			"id":                   user.ID,
			"email":                user.Email,
			"fullname":             user.FullName,
			"api_token":            user.APIToken,
			"timezone":             user.Timezone,
			"default_workspace_id": user.DefaultWorkspaceID,
			"beginning_of_week":    user.BeginningOfWeek,
			"country_id":           user.CountryID,
			"has_password":         user.HasPassword,
			"2fa_enabled":          user.TwoFactorEnabled,
		},
		"organizations":          shell.Organizations,
		"workspaces":             shell.Workspaces,
		"workspace_capabilities": shell.WorkspaceCapabilities,
		"workspace_quota":        shell.WorkspaceQuota,
	}, nil
}

func profileBody(user application.UserSnapshot) map[string]any {
	return map[string]any{
		"id":                   user.ID,
		"email":                user.Email,
		"fullname":             user.FullName,
		"api_token":            user.APIToken,
		"timezone":             user.Timezone,
		"default_workspace_id": user.DefaultWorkspaceID,
		"beginning_of_week":    user.BeginningOfWeek,
		"country_id":           user.CountryID,
		"has_password":         user.HasPassword,
		"2fa_enabled":          user.TwoFactorEnabled,
	}
}

func preferencesBody(user application.UserSnapshot, preferences domain.Preferences) map[string]any {
	return map[string]any{
		"date_format":         preferences.DateFormat,
		"timeofday_format":    preferences.TimeOfDayFormat,
		"alpha_features":      preferences.AlphaFeatures,
		"duration_format":     "improved",
		"pg_time_zone_name":   user.Timezone,
		"beginningOfWeek":     user.BeginningOfWeek,
		"collapseTimeEntries": false,
		"language_code":       "en-US",
		"hide_sidebar_right":  false,
		"reports_collapse":    false,
		"manualMode":          false,
		"manualEntryMode":     "timer",
	}
}

func mapError(err error) Response {
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
	case errors.Is(err, domain.ErrInvalidCredentials),
		errors.Is(err, domain.ErrUserDeactivated),
		errors.Is(err, domain.ErrUserDeleted):
		return Response{StatusCode: 403, Body: "User does not have access to this resource."}
	default:
		return Response{StatusCode: 500, Body: "Internal Server Error"}
	}
}

func normalizeTimeOfDayFormat(value string) string {
	if strings.TrimSpace(value) == "h:mm a" {
		return "h:mm A"
	}
	return value
}
