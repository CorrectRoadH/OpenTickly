package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"opentoggl/backend/apps/backend/internal/identity/application"
	"opentoggl/backend/apps/backend/internal/identity/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
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
			preferences_date_format,
			preferences_time_of_day_format,
			preferences_alpha_features
		) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
			preferences_date_format = excluded.preferences_date_format,
			preferences_time_of_day_format = excluded.preferences_time_of_day_format,
			preferences_alpha_features = excluded.preferences_alpha_features
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
		user.Preferences().DateFormat,
		user.Preferences().TimeOfDayFormat,
		alphaFeatures,
	)
	if err != nil {
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
			preferences_date_format,
			preferences_time_of_day_format,
			preferences_alpha_features
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
			preferences_date_format,
			preferences_time_of_day_format,
			preferences_alpha_features
		from identity_users
		where email = lower(trim($1))
	`, email)

	user, err := scanUser(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrInvalidCredentials
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
			preferences_date_format,
			preferences_time_of_day_format,
			preferences_alpha_features
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

func scanUser(row rowScanner) (*domain.User, error) {
	var (
		id                        int64
		email                     string
		fullName                  string
		passwordHash              string
		apiToken                  string
		timezone                  string
		beginningOfWeek           int
		countryID                 int64
		defaultWorkspaceID        int64
		state                     string
		preferencesDateFormat     string
		preferencesTimeOfDay      string
		preferencesAlphaFeatures  []byte
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
		&preferencesDateFormat,
		&preferencesTimeOfDay,
		&preferencesAlphaFeatures,
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
		ID:           id,
		Email:        email,
		FullName:     fullName,
		Password:     "persisted-secret",
		PasswordHash: passwordHash,
		APIToken:     apiToken,
	})
	if err != nil {
		return nil, fmt.Errorf("rebuild identity user %d: %w", id, err)
	}

	if err := user.UpdateProfile(domain.ProfileUpdate{
		Timezone:           timezone,
		BeginningOfWeek:    intPtr(beginningOfWeek),
		CountryID:          int64Ptr(countryID),
		DefaultWorkspaceID: int64Ptr(defaultWorkspaceID),
	}); err != nil {
		return nil, fmt.Errorf("hydrate profile for identity user %d: %w", id, err)
	}

	if err := user.UpdatePreferences(domain.Preferences{
		DateFormat:      preferencesDateFormat,
		TimeOfDayFormat: preferencesTimeOfDay,
		AlphaFeatures:   alphaFeatures,
	}); err != nil {
		return nil, fmt.Errorf("hydrate preferences for identity user %d: %w", id, err)
	}

	switch domain.UserState(state) {
	case domain.UserStateActive:
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

func intPtr(value int) *int {
	return &value
}

func int64Ptr(value int64) *int64 {
	return &value
}
