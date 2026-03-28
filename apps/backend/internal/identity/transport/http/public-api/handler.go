package publicapi

import (
	"context"
	"errors"
	"time"

	"opentoggl/backend/apps/backend/internal/identity/application"
	"opentoggl/backend/apps/backend/internal/identity/domain"
)

type Response struct {
	StatusCode int
	Body       any
}

type currentUserResponse struct {
	Id                 int64   `json:"id"`
	Email              string  `json:"email"`
	Fullname           string  `json:"fullname"`
	ImageURL           *string `json:"image_url"`
	ApiToken           string  `json:"api_token"`
	Timezone           string  `json:"timezone"`
	DefaultWorkspaceID int64   `json:"default_workspace_id"`
	BeginningOfWeek    int     `json:"beginning_of_week"`
	CountryID          int64   `json:"country_id"`
	HasPassword        bool    `json:"has_password"`
	TwoFactorEnabled   bool    `json:"2fa_enabled"`
	// Toggl compat: created_at/updated_at require schema migration (identity_users table).
	// at is returned as current server time to match Toggl response shape.
	CreatedAt *string `json:"created_at,omitempty"`
	UpdatedAt *string `json:"updated_at,omitempty"`
	At        string  `json:"at"`
}

type preferencesResponse struct {
	AlphaFeatures                  []domain.AlphaFeature `json:"alpha_features"`
	AnimationOptOut                bool                  `json:"animation_opt_out"`
	BeginningOfWeek                int                   `json:"beginningOfWeek"`
	CollapseTimeEntries            bool                  `json:"collapseTimeEntries"`
	DateFormat                     string                `json:"date_format"`
	DurationFormat                 string                `json:"duration_format"`
	HideSidebarRight               bool                  `json:"hide_sidebar_right"`
	IsGoalsViewShown               bool                  `json:"is_goals_view_shown"`
	KeyboardShortcutsEnabled       bool                  `json:"keyboard_shortcuts_enabled"`
	LanguageCode                   string                `json:"language_code"`
	ManualEntryMode                string                `json:"manualEntryMode"`
	ManualMode                     bool                  `json:"manualMode"`
	ProjectShortcutEnabled         bool                  `json:"project_shortcut_enabled"`
	ReportsCollapse                bool                  `json:"reports_collapse"`
	SendAddedToProjectNotification bool                  `json:"send_added_to_project_notification"`
	SendDailyProjectInvites        bool                  `json:"send_daily_project_invites"`
	SendProductEmails              bool                  `json:"send_product_emails"`
	SendProductReleaseNotification bool                  `json:"send_product_release_notification"`
	SendTimerNotifications         bool                  `json:"send_timer_notifications"`
	SendWeeklyReport               bool                  `json:"send_weekly_report"`
	ShowTimeInTitle                bool                  `json:"showTimeInTitle"`
	TagsShortcutEnabled            bool                  `json:"tags_shortcut_enabled"`
	TimeOfDayFormat                string                `json:"timeofday_format"`
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
		Body:       currentUserBody(user),
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
		Body:       currentUserBody(updated),
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
		Body:       preferencesBody(preferences),
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
	case errors.Is(err, domain.ErrPushServiceTokenRequired):
		return Response{StatusCode: 400, Body: "Field 'fcm_registration_token' is required"}
	case errors.Is(err, domain.ErrInvalidCredentials),
		errors.Is(err, domain.ErrUserDeactivated),
		errors.Is(err, domain.ErrUserDeleted),
		errors.Is(err, application.ErrSessionNotFound):
		return Response{StatusCode: 403, Body: "User does not have access to this resource."}
	default:
		return Response{StatusCode: 500, Body: "Internal Server Error"}
	}
}

func currentUserBody(user application.UserSnapshot) currentUserResponse {
	return currentUserResponse{
		Id:                 user.ID,
		Email:              user.Email,
		Fullname:           user.FullName,
		ImageURL:           nil,
		ApiToken:           user.APIToken,
		Timezone:           user.Timezone,
		DefaultWorkspaceID: user.DefaultWorkspaceID,
		BeginningOfWeek:    user.BeginningOfWeek,
		CountryID:          user.CountryID,
		HasPassword:        user.HasPassword,
		TwoFactorEnabled:   user.TwoFactorEnabled,
		At:                 time.Now().UTC().Format(time.RFC3339),
	}
}

func preferencesBody(preferences domain.Preferences) preferencesResponse {
	return preferencesResponse{
		AlphaFeatures:                  preferences.AlphaFeatures,
		AnimationOptOut:                preferencesBoolean(preferences.AnimationOptOut, false),
		BeginningOfWeek:                preferencesInt(preferences.BeginningOfWeek, 1),
		CollapseTimeEntries:            preferencesBoolean(preferences.CollapseTimeEntries, true),
		DateFormat:                     preferences.DateFormat,
		DurationFormat:                 preferences.DurationFormat,
		HideSidebarRight:               preferencesBoolean(preferences.HideSidebarRight, false),
		IsGoalsViewShown:               preferencesBoolean(preferences.IsGoalsViewShown, true),
		KeyboardShortcutsEnabled:       preferencesBoolean(preferences.KeyboardShortcutsEnabled, true),
		LanguageCode:                   preferences.LanguageCode,
		ManualEntryMode:                preferences.ManualEntryMode,
		ManualMode:                     preferencesBoolean(preferences.ManualMode, false),
		ProjectShortcutEnabled:         preferencesBoolean(preferences.ProjectShortcutEnabled, false),
		ReportsCollapse:                preferencesBoolean(preferences.ReportsCollapse, false),
		SendAddedToProjectNotification: preferencesBoolean(preferences.SendAddedToProjectNotification, true),
		SendDailyProjectInvites:        preferencesBoolean(preferences.SendDailyProjectInvites, true),
		SendProductEmails:              preferencesBoolean(preferences.SendProductEmails, true),
		SendProductReleaseNotification: preferencesBoolean(preferences.SendProductReleaseNotification, true),
		SendTimerNotifications:         preferencesBoolean(preferences.SendTimerNotifications, true),
		SendWeeklyReport:               preferencesBoolean(preferences.SendWeeklyReport, true),
		ShowTimeInTitle:                preferencesBoolean(preferences.ShowTimeInTitle, true),
		TagsShortcutEnabled:            preferencesBoolean(preferences.TagsShortcutEnabled, false),
		TimeOfDayFormat:                preferences.TimeOfDayFormat,
	}
}

func preferencesBoolean(value *bool, fallback bool) bool {
	if value == nil {
		return fallback
	}
	return *value
}

func preferencesInt(value *int, fallback int) int {
	if value == nil {
		return fallback
	}
	return *value
}
