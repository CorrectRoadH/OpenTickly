package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"opentoggl/backend/apps/backend/internal/identity/application"
	"opentoggl/backend/apps/backend/internal/identity/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/samber/lo"
)

type UserRepository struct {
	pool *pgxpool.Pool
}

type SessionRepository struct {
	pool *pgxpool.Pool
}

type rowScanner interface {
	Scan(dest ...any) error
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

func NewSessionRepository(pool *pgxpool.Pool) *SessionRepository {
	return &SessionRepository{pool: pool}
}

func (repo *UserRepository) Save(ctx context.Context, user *domain.User) error {
	alphaFeatures, err := json.Marshal(user.Preferences().AlphaFeatures)
	if err != nil {
		return fmt.Errorf("marshal alpha features: %w", err)
	}

	_, err = repo.pool.Exec(ctx, `
		insert into identity_users (
			id,
			email,
			full_name,
			password_hash,
			api_token,
			timezone,
			beginning_of_week,
			country_id,
			default_workspace_id,
			state,
			send_product_emails,
			send_weekly_report,
			tos_accept_needed,
			product_emails_disable_code,
			weekly_report_disable_code,
			preferences_animation_opt_out,
			preferences_collapse_time_entries,
			preferences_date_format,
			preferences_duration_format,
			preferences_hide_sidebar_right,
			preferences_is_goals_view_shown,
			preferences_keyboard_shortcuts_enabled,
			preferences_language_code,
			preferences_manual_entry_mode,
			preferences_manual_mode,
			preferences_project_shortcut_enabled,
			preferences_reports_collapse,
			preferences_send_added_to_project_notification,
			preferences_send_daily_project_invites,
			preferences_send_product_release_notification,
			preferences_send_timer_notifications,
			preferences_show_time_in_title,
			preferences_tags_shortcut_enabled,
			preferences_time_of_day_format,
			preferences_alpha_features,
			is_instance_admin,
			avatar_storage_key
		) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37)
		on conflict (id) do update
		set email = excluded.email,
			full_name = excluded.full_name,
			password_hash = excluded.password_hash,
			api_token = excluded.api_token,
			timezone = excluded.timezone,
			beginning_of_week = excluded.beginning_of_week,
			country_id = excluded.country_id,
			default_workspace_id = excluded.default_workspace_id,
			state = excluded.state,
			send_product_emails = excluded.send_product_emails,
			send_weekly_report = excluded.send_weekly_report,
			tos_accept_needed = excluded.tos_accept_needed,
			product_emails_disable_code = excluded.product_emails_disable_code,
			weekly_report_disable_code = excluded.weekly_report_disable_code,
			preferences_animation_opt_out = excluded.preferences_animation_opt_out,
			preferences_collapse_time_entries = excluded.preferences_collapse_time_entries,
			preferences_date_format = excluded.preferences_date_format,
			preferences_duration_format = excluded.preferences_duration_format,
			preferences_hide_sidebar_right = excluded.preferences_hide_sidebar_right,
			preferences_is_goals_view_shown = excluded.preferences_is_goals_view_shown,
			preferences_keyboard_shortcuts_enabled = excluded.preferences_keyboard_shortcuts_enabled,
			preferences_language_code = excluded.preferences_language_code,
			preferences_manual_entry_mode = excluded.preferences_manual_entry_mode,
			preferences_manual_mode = excluded.preferences_manual_mode,
			preferences_project_shortcut_enabled = excluded.preferences_project_shortcut_enabled,
			preferences_reports_collapse = excluded.preferences_reports_collapse,
			preferences_send_added_to_project_notification = excluded.preferences_send_added_to_project_notification,
			preferences_send_daily_project_invites = excluded.preferences_send_daily_project_invites,
			preferences_send_product_release_notification = excluded.preferences_send_product_release_notification,
			preferences_send_timer_notifications = excluded.preferences_send_timer_notifications,
			preferences_show_time_in_title = excluded.preferences_show_time_in_title,
			preferences_tags_shortcut_enabled = excluded.preferences_tags_shortcut_enabled,
			preferences_time_of_day_format = excluded.preferences_time_of_day_format,
			preferences_alpha_features = excluded.preferences_alpha_features,
			is_instance_admin = excluded.is_instance_admin,
			avatar_storage_key = excluded.avatar_storage_key
	`,
		user.ID(),
		user.Email(),
		user.FullName(),
		user.PasswordHash(),
		user.APIToken(),
		user.Timezone(),
		user.BeginningOfWeek(),
		user.CountryID(),
		user.DefaultWorkspaceID(),
		string(user.State()),
		user.SendProductEmails(),
		user.SendWeeklyReport(),
		user.ToSAcceptNeeded(),
		user.ProductEmailsDisableCode(),
		user.WeeklyReportDisableCode(),
		lo.FromPtrOr(user.Preferences().AnimationOptOut, false),
		lo.FromPtrOr(user.Preferences().CollapseTimeEntries, true),
		user.Preferences().DateFormat,
		user.Preferences().DurationFormat,
		lo.FromPtrOr(user.Preferences().HideSidebarRight, false),
		lo.FromPtrOr(user.Preferences().IsGoalsViewShown, true),
		lo.FromPtrOr(user.Preferences().KeyboardShortcutsEnabled, true),
		user.Preferences().LanguageCode,
		user.Preferences().ManualEntryMode,
		lo.FromPtrOr(user.Preferences().ManualMode, false),
		lo.FromPtrOr(user.Preferences().ProjectShortcutEnabled, false),
		lo.FromPtrOr(user.Preferences().ReportsCollapse, false),
		lo.FromPtrOr(user.Preferences().SendAddedToProjectNotification, true),
		lo.FromPtrOr(user.Preferences().SendDailyProjectInvites, true),
		lo.FromPtrOr(user.Preferences().SendProductReleaseNotification, true),
		lo.FromPtrOr(user.Preferences().SendTimerNotifications, true),
		lo.FromPtrOr(user.Preferences().ShowTimeInTitle, true),
		lo.FromPtrOr(user.Preferences().TagsShortcutEnabled, false),
		user.Preferences().TimeOfDayFormat,
		alphaFeatures,
		user.IsInstanceAdmin(),
		user.AvatarStorageKey(),
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" && pgErr.ConstraintName == "identity_users_email_key" {
			return domain.ErrEmailAlreadyRegistered
		}
		return fmt.Errorf("save identity user %d: %w", user.ID(), err)
	}

	return nil
}

func (repo *UserRepository) ByID(ctx context.Context, id int64) (*domain.User, error) {
	row := repo.pool.QueryRow(ctx, `
		select
			id,
			email,
			full_name,
			password_hash,
			api_token,
			timezone,
			beginning_of_week,
			country_id,
			default_workspace_id,
			state,
			send_product_emails,
			send_weekly_report,
			tos_accept_needed,
			product_emails_disable_code,
			weekly_report_disable_code,
			preferences_animation_opt_out,
			preferences_collapse_time_entries,
			preferences_date_format,
			preferences_duration_format,
			preferences_hide_sidebar_right,
			preferences_is_goals_view_shown,
			preferences_keyboard_shortcuts_enabled,
			preferences_language_code,
			preferences_manual_entry_mode,
			preferences_manual_mode,
			preferences_project_shortcut_enabled,
			preferences_reports_collapse,
			preferences_send_added_to_project_notification,
			preferences_send_daily_project_invites,
			preferences_send_product_release_notification,
			preferences_send_timer_notifications,
			preferences_show_time_in_title,
			preferences_tags_shortcut_enabled,
			preferences_time_of_day_format,
			preferences_alpha_features,
			is_instance_admin,
			avatar_storage_key
		from identity_users
		where id = $1
	`, id)

	user, err := scanUser(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("user %d not found", id)
		}
		return nil, err
	}
	return user, nil
}

func (repo *UserRepository) ByEmail(ctx context.Context, email string) (*domain.User, error) {
	row := repo.pool.QueryRow(ctx, `
		select
			id,
			email,
			full_name,
			password_hash,
			api_token,
			timezone,
			beginning_of_week,
			country_id,
			default_workspace_id,
			state,
			send_product_emails,
			send_weekly_report,
			tos_accept_needed,
			product_emails_disable_code,
			weekly_report_disable_code,
			preferences_animation_opt_out,
			preferences_collapse_time_entries,
			preferences_date_format,
			preferences_duration_format,
			preferences_hide_sidebar_right,
			preferences_is_goals_view_shown,
			preferences_keyboard_shortcuts_enabled,
			preferences_language_code,
			preferences_manual_entry_mode,
			preferences_manual_mode,
			preferences_project_shortcut_enabled,
			preferences_reports_collapse,
			preferences_send_added_to_project_notification,
			preferences_send_daily_project_invites,
			preferences_send_product_release_notification,
			preferences_send_timer_notifications,
			preferences_show_time_in_title,
			preferences_tags_shortcut_enabled,
			preferences_time_of_day_format,
			preferences_alpha_features,
			is_instance_admin,
			avatar_storage_key
		from identity_users
		where email = lower(trim($1))
	`, email)

	user, err := scanUser(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return user, nil
}

func (repo *UserRepository) ByAPIToken(ctx context.Context, token string) (*domain.User, error) {
	row := repo.pool.QueryRow(ctx, `
		select
			id,
			email,
			full_name,
			password_hash,
			api_token,
			timezone,
			beginning_of_week,
			country_id,
			default_workspace_id,
			state,
			send_product_emails,
			send_weekly_report,
			tos_accept_needed,
			product_emails_disable_code,
			weekly_report_disable_code,
			preferences_animation_opt_out,
			preferences_collapse_time_entries,
			preferences_date_format,
			preferences_duration_format,
			preferences_hide_sidebar_right,
			preferences_is_goals_view_shown,
			preferences_keyboard_shortcuts_enabled,
			preferences_language_code,
			preferences_manual_entry_mode,
			preferences_manual_mode,
			preferences_project_shortcut_enabled,
			preferences_reports_collapse,
			preferences_send_added_to_project_notification,
			preferences_send_daily_project_invites,
			preferences_send_product_release_notification,
			preferences_send_timer_notifications,
			preferences_show_time_in_title,
			preferences_tags_shortcut_enabled,
			preferences_time_of_day_format,
			preferences_alpha_features,
			is_instance_admin,
			avatar_storage_key
		from identity_users
		where api_token = $1
	`, token)

	user, err := scanUser(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrInvalidCredentials
		}
		return nil, err
	}
	return user, nil
}

func (repo *UserRepository) ByProductEmailsDisableCode(ctx context.Context, code string) (*domain.User, error) {
	row := repo.pool.QueryRow(ctx, `
		select
			id,
			email,
			full_name,
			password_hash,
			api_token,
			timezone,
			beginning_of_week,
			country_id,
			default_workspace_id,
			state,
			send_product_emails,
			send_weekly_report,
			tos_accept_needed,
			product_emails_disable_code,
			weekly_report_disable_code,
			preferences_animation_opt_out,
			preferences_collapse_time_entries,
			preferences_date_format,
			preferences_duration_format,
			preferences_hide_sidebar_right,
			preferences_is_goals_view_shown,
			preferences_keyboard_shortcuts_enabled,
			preferences_language_code,
			preferences_manual_entry_mode,
			preferences_manual_mode,
			preferences_project_shortcut_enabled,
			preferences_reports_collapse,
			preferences_send_added_to_project_notification,
			preferences_send_daily_project_invites,
			preferences_send_product_release_notification,
			preferences_send_timer_notifications,
			preferences_show_time_in_title,
			preferences_tags_shortcut_enabled,
			preferences_time_of_day_format,
			preferences_alpha_features,
			is_instance_admin,
			avatar_storage_key
		from identity_users
		where product_emails_disable_code = $1
	`, code)

	user, err := scanUser(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrInvalidCredentials
		}
		return nil, err
	}
	return user, nil
}

func (repo *UserRepository) ByWeeklyReportDisableCode(ctx context.Context, code string) (*domain.User, error) {
	row := repo.pool.QueryRow(ctx, `
		select
			id,
			email,
			full_name,
			password_hash,
			api_token,
			timezone,
			beginning_of_week,
			country_id,
			default_workspace_id,
			state,
			send_product_emails,
			send_weekly_report,
			tos_accept_needed,
			product_emails_disable_code,
			weekly_report_disable_code,
			preferences_animation_opt_out,
			preferences_collapse_time_entries,
			preferences_date_format,
			preferences_duration_format,
			preferences_hide_sidebar_right,
			preferences_is_goals_view_shown,
			preferences_keyboard_shortcuts_enabled,
			preferences_language_code,
			preferences_manual_entry_mode,
			preferences_manual_mode,
			preferences_project_shortcut_enabled,
			preferences_reports_collapse,
			preferences_send_added_to_project_notification,
			preferences_send_daily_project_invites,
			preferences_send_product_release_notification,
			preferences_send_timer_notifications,
			preferences_show_time_in_title,
			preferences_tags_shortcut_enabled,
			preferences_time_of_day_format,
			preferences_alpha_features,
			is_instance_admin,
			avatar_storage_key
		from identity_users
		where weekly_report_disable_code = $1
	`, code)

	user, err := scanUser(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrInvalidCredentials
		}
		return nil, err
	}
	return user, nil
}

func (repo *SessionRepository) Put(ctx context.Context, session application.Session) error {
	_, err := repo.pool.Exec(ctx, `
		insert into identity_sessions (id, user_id)
		values ($1, $2)
		on conflict (id) do update
		set user_id = excluded.user_id
	`, session.ID, session.UserID)
	if err != nil {
		return fmt.Errorf("save identity session %s: %w", session.ID, err)
	}
	return nil
}

func (repo *SessionRepository) UserIDBySession(ctx context.Context, sessionID string) (int64, error) {
	var userID int64
	err := repo.pool.QueryRow(ctx, `
		select user_id
		from identity_sessions
		where id = $1
	`, sessionID).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, application.ErrSessionNotFound
		}
		return 0, fmt.Errorf("query identity session %s: %w", sessionID, err)
	}
	return userID, nil
}

func (repo *SessionRepository) Delete(ctx context.Context, sessionID string) error {
	_, err := repo.pool.Exec(ctx, `
		delete from identity_sessions
		where id = $1
	`, sessionID)
	if err != nil {
		return fmt.Errorf("delete identity session %s: %w", sessionID, err)
	}
	return nil
}

func (repo *SessionRepository) DeleteByUserID(ctx context.Context, userID int64) error {
	_, err := repo.pool.Exec(ctx, `
		delete from identity_sessions
		where user_id = $1
	`, userID)
	if err != nil {
		return fmt.Errorf("delete identity sessions for user %d: %w", userID, err)
	}
	return nil
}

func scanUser(row rowScanner) (*domain.User, error) {
	var (
		id                                        int64
		email                                     string
		fullName                                  string
		passwordHash                              string
		apiToken                                  string
		timezone                                  string
		beginningOfWeek                           int
		countryID                                 int64
		defaultWorkspaceID                        int64
		state                                     string
		sendProductEmails                         bool
		sendWeeklyReport                          bool
		tosAcceptNeeded                           bool
		productEmailsDisableCode                  string
		weeklyReportDisableCode                   string
		preferencesAnimationOptOut                bool
		preferencesCollapseTimeEntries            bool
		preferencesDateFormat                     string
		preferencesDurationFormat                 string
		preferencesHideSidebarRight               bool
		preferencesIsGoalsViewShown               bool
		preferencesKeyboardShortcutsEnabled       bool
		preferencesLanguageCode                   string
		preferencesManualEntryMode                string
		preferencesManualMode                     bool
		preferencesProjectShortcutEnabled         bool
		preferencesReportsCollapse                bool
		preferencesSendAddedToProjectNotification bool
		preferencesSendDailyProjectInvites        bool
		preferencesSendProductReleaseNotification bool
		preferencesSendTimerNotifications         bool
		preferencesShowTimeInTitle                bool
		preferencesTagsShortcutEnabled            bool
		preferencesTimeOfDay                      string
		preferencesAlphaFeatures                  []byte
		isInstanceAdmin                           bool
		avatarStorageKey                          string
	)

	if err := row.Scan(
		&id,
		&email,
		&fullName,
		&passwordHash,
		&apiToken,
		&timezone,
		&beginningOfWeek,
		&countryID,
		&defaultWorkspaceID,
		&state,
		&sendProductEmails,
		&sendWeeklyReport,
		&tosAcceptNeeded,
		&productEmailsDisableCode,
		&weeklyReportDisableCode,
		&preferencesAnimationOptOut,
		&preferencesCollapseTimeEntries,
		&preferencesDateFormat,
		&preferencesDurationFormat,
		&preferencesHideSidebarRight,
		&preferencesIsGoalsViewShown,
		&preferencesKeyboardShortcutsEnabled,
		&preferencesLanguageCode,
		&preferencesManualEntryMode,
		&preferencesManualMode,
		&preferencesProjectShortcutEnabled,
		&preferencesReportsCollapse,
		&preferencesSendAddedToProjectNotification,
		&preferencesSendDailyProjectInvites,
		&preferencesSendProductReleaseNotification,
		&preferencesSendTimerNotifications,
		&preferencesShowTimeInTitle,
		&preferencesTagsShortcutEnabled,
		&preferencesTimeOfDay,
		&preferencesAlphaFeatures,
		&isInstanceAdmin,
		&avatarStorageKey,
	); err != nil {
		return nil, err
	}

	var alphaFeatures []domain.AlphaFeature
	if len(preferencesAlphaFeatures) != 0 {
		if err := json.Unmarshal(preferencesAlphaFeatures, &alphaFeatures); err != nil {
			return nil, fmt.Errorf("unmarshal alpha features: %w", err)
		}
	}

	user, err := domain.RegisterUser(domain.RegisterParams{
		ID:                       id,
		Email:                    email,
		FullName:                 fullName,
		Password:                 "persisted-secret",
		PasswordHash:             passwordHash,
		APIToken:                 apiToken,
		SendProductEmails:        lo.ToPtr(sendProductEmails),
		SendWeeklyReport:         lo.ToPtr(sendWeeklyReport),
		ToSAcceptNeeded:          lo.ToPtr(tosAcceptNeeded),
		ProductEmailsDisableCode: productEmailsDisableCode,
		WeeklyReportDisableCode:  weeklyReportDisableCode,
		AvatarStorageKey:         avatarStorageKey,
		PendingVerification:      domain.UserState(state) == domain.UserStatePendingVerification,
	})
	if err != nil {
		return nil, fmt.Errorf("rebuild identity user %d: %w", id, err)
	}

	if err := user.UpdateProfile(domain.ProfileUpdate{
		Timezone:           timezone,
		BeginningOfWeek:    lo.ToPtr(beginningOfWeek),
		CountryID:          lo.ToPtr(countryID),
		DefaultWorkspaceID: lo.ToPtr(defaultWorkspaceID),
	}); err != nil {
		return nil, fmt.Errorf("hydrate profile for identity user %d: %w", id, err)
	}

	if err := user.UpdatePreferences(domain.Preferences{
		AnimationOptOut:                lo.ToPtr(preferencesAnimationOptOut),
		BeginningOfWeek:                lo.ToPtr(beginningOfWeek),
		CollapseTimeEntries:            lo.ToPtr(preferencesCollapseTimeEntries),
		DateFormat:                     preferencesDateFormat,
		DurationFormat:                 preferencesDurationFormat,
		HideSidebarRight:               lo.ToPtr(preferencesHideSidebarRight),
		IsGoalsViewShown:               lo.ToPtr(preferencesIsGoalsViewShown),
		KeyboardShortcutsEnabled:       lo.ToPtr(preferencesKeyboardShortcutsEnabled),
		LanguageCode:                   preferencesLanguageCode,
		ManualEntryMode:                preferencesManualEntryMode,
		ManualMode:                     lo.ToPtr(preferencesManualMode),
		ProjectShortcutEnabled:         lo.ToPtr(preferencesProjectShortcutEnabled),
		ReportsCollapse:                lo.ToPtr(preferencesReportsCollapse),
		SendAddedToProjectNotification: lo.ToPtr(preferencesSendAddedToProjectNotification),
		SendDailyProjectInvites:        lo.ToPtr(preferencesSendDailyProjectInvites),
		SendProductEmails:              lo.ToPtr(sendProductEmails),
		SendProductReleaseNotification: lo.ToPtr(preferencesSendProductReleaseNotification),
		SendTimerNotifications:         lo.ToPtr(preferencesSendTimerNotifications),
		SendWeeklyReport:               lo.ToPtr(sendWeeklyReport),
		ShowTimeInTitle:                lo.ToPtr(preferencesShowTimeInTitle),
		TagsShortcutEnabled:            lo.ToPtr(preferencesTagsShortcutEnabled),
		TimeOfDayFormat:                preferencesTimeOfDay,
		AlphaFeatures:                  alphaFeatures,
	}); err != nil {
		return nil, fmt.Errorf("hydrate preferences for identity user %d: %w", id, err)
	}

	if isInstanceAdmin {
		user.PromoteToInstanceAdmin()
	}

	switch domain.UserState(state) {
	case domain.UserStateActive, domain.UserStatePendingVerification:
		return user, nil
	case domain.UserStateDeactivated:
		if err := user.Deactivate(); err != nil {
			return nil, fmt.Errorf("hydrate deactivated identity user %d: %w", id, err)
		}
		return user, nil
	case domain.UserStateDeleted:
		if err := user.Delete(); err != nil {
			return nil, fmt.Errorf("hydrate deleted identity user %d: %w", id, err)
		}
		return user, nil
	default:
		return nil, fmt.Errorf("unsupported identity user state %q", state)
	}
}
