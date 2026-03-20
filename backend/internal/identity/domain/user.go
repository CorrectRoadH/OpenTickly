package domain

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
)

var (
	ErrCurrentPasswordInvalid    = errors.New("current password is not valid")
	ErrCurrentPasswordRequired   = errors.New("current password must be present to change password")
	ErrInvalidCredentials        = errors.New("invalid credentials")
	ErrInvalidDateFormat         = errors.New("value in date_format is invalid")
	ErrInvalidEmail              = errors.New("invalid email")
	ErrInvalidFullName           = errors.New("invalid fullname")
	ErrInvalidPassword           = errors.New("password should be at least 6 characters")
	ErrInvalidTimeOfDayFormat    = errors.New("value in timeofday_format is invalid")
	ErrPreferencesFieldProtected = errors.New("cannot set value for ToSAcceptNeeded")
	ErrUserDeactivated           = errors.New("user is deactivated")
	ErrUserDeleted               = errors.New("user is deleted")
)

type UserState string

const (
	UserStateActive      UserState = "active"
	UserStateDeactivated UserState = "deactivated"
	UserStateDeleted     UserState = "deleted"
)

type RegisterParams struct {
	ID           int64
	Email        string
	FullName     string
	Password     string
	PasswordHash string
	APIToken     string
}

type BasicCredentials struct {
	Username string
	Password string
}

type ProfileUpdate struct {
	CurrentPassword    string
	Password           string
	Email              string
	FullName           string
	Timezone           string
	BeginningOfWeek    *int
	CountryID          *int64
	DefaultWorkspaceID *int64
}

type AlphaFeature struct {
	Code    string
	Enabled bool
}

type Preferences struct {
	DateFormat      string
	TimeOfDayFormat string
	AlphaFeatures   []AlphaFeature
	ToSAcceptNeeded *bool
}

type User struct {
	id                 int64
	email              string
	fullName           string
	passwordHash       string
	apiToken           string
	timezone           string
	beginningOfWeek    int
	countryID          int64
	defaultWorkspaceID int64
	state              UserState
	preferences        Preferences
}

func RegisterUser(params RegisterParams) (*User, error) {
	if params.ID <= 0 {
		return nil, ErrInvalidCredentials
	}
	if !strings.Contains(params.Email, "@") {
		return nil, ErrInvalidEmail
	}
	if strings.TrimSpace(params.FullName) == "" {
		return nil, ErrInvalidFullName
	}
	if len(params.Password) < 6 {
		return nil, ErrInvalidPassword
	}
	if params.PasswordHash == "" {
		params.PasswordHash = hashSecret(params.Password)
	}

	return &User{
		id:           params.ID,
		email:        strings.ToLower(strings.TrimSpace(params.Email)),
		fullName:     strings.TrimSpace(params.FullName),
		passwordHash: params.PasswordHash,
		apiToken:     params.APIToken,
		timezone:     "UTC",
		state:        UserStateActive,
		preferences: Preferences{
			DateFormat:      "YYYY-MM-DD",
			TimeOfDayFormat: "h:mm A",
		},
	}, nil
}

func (user *User) ID() int64 {
	return user.id
}

func (user *User) Email() string {
	return user.email
}

func (user *User) FullName() string {
	return user.fullName
}

func (user *User) State() UserState {
	return user.state
}

func (user *User) Preferences() Preferences {
	return user.preferences
}

func (user *User) APIToken() string {
	return user.apiToken
}

func (user *User) Timezone() string {
	return user.timezone
}

func (user *User) BeginningOfWeek() int {
	return user.beginningOfWeek
}

func (user *User) CountryID() int64 {
	return user.countryID
}

func (user *User) DefaultWorkspaceID() int64 {
	return user.defaultWorkspaceID
}

func (user *User) HasPassword() bool {
	return user.passwordHash != ""
}

func (user *User) CanAuthenticate() bool {
	return user.state == UserStateActive
}

func (user *User) CanWriteBusinessData() bool {
	return user.state == UserStateActive
}

func (user *User) MatchesPassword(password string) bool {
	return user.passwordHash == hashSecret(password)
}

func (user *User) MatchesAPIToken(token string) bool {
	return user.apiToken != "" && user.apiToken == token
}

// AuthenticateBasic keeps Toggl's two supported Basic Auth shapes explicit:
// email:password for normal login and api_token:api_token for token auth.
func (user *User) AuthenticateBasic(credentials BasicCredentials) error {
	if err := user.ensureAuthenticatable(); err != nil {
		return err
	}

	if strings.EqualFold(strings.TrimSpace(credentials.Username), user.email) &&
		user.MatchesPassword(credentials.Password) {
		return nil
	}

	if credentials.Password == "api_token" && user.MatchesAPIToken(credentials.Username) {
		return nil
	}

	return ErrInvalidCredentials
}

func (user *User) UpdateProfile(update ProfileUpdate) error {
	if err := user.ensureMutable(); err != nil {
		return err
	}

	if update.Password != "" {
		if update.CurrentPassword == "" {
			return ErrCurrentPasswordRequired
		}
		if !user.MatchesPassword(update.CurrentPassword) {
			return ErrCurrentPasswordInvalid
		}
		if len(update.Password) < 6 {
			return ErrInvalidPassword
		}
		user.passwordHash = hashSecret(update.Password)
	}

	if update.Email != "" {
		if !strings.Contains(update.Email, "@") {
			return ErrInvalidEmail
		}
		user.email = strings.ToLower(strings.TrimSpace(update.Email))
	}

	if update.FullName != "" {
		if strings.TrimSpace(update.FullName) == "" {
			return ErrInvalidFullName
		}
		user.fullName = strings.TrimSpace(update.FullName)
	}

	if update.Timezone != "" {
		user.timezone = update.Timezone
	}

	if update.BeginningOfWeek != nil {
		user.beginningOfWeek = *update.BeginningOfWeek
	}

	if update.CountryID != nil {
		user.countryID = *update.CountryID
	}

	if update.DefaultWorkspaceID != nil {
		user.defaultWorkspaceID = *update.DefaultWorkspaceID
	}

	return nil
}

func (user *User) UpdatePreferences(preferences Preferences) error {
	if err := user.ensureMutable(); err != nil {
		return err
	}
	if preferences.ToSAcceptNeeded != nil {
		return ErrPreferencesFieldProtected
	}
	if preferences.DateFormat != "" && preferences.DateFormat != "YYYY-MM-DD" {
		return ErrInvalidDateFormat
	}
	if preferences.TimeOfDayFormat != "" && !isSupportedTimeOfDayFormat(preferences.TimeOfDayFormat) {
		return ErrInvalidTimeOfDayFormat
	}

	if preferences.DateFormat != "" {
		user.preferences.DateFormat = preferences.DateFormat
	}
	if preferences.TimeOfDayFormat != "" {
		user.preferences.TimeOfDayFormat = preferences.TimeOfDayFormat
	}
	if preferences.AlphaFeatures != nil {
		user.preferences.AlphaFeatures = append([]AlphaFeature(nil), preferences.AlphaFeatures...)
	}

	return nil
}

func (user *User) RotateAPIToken(token string) error {
	if err := user.ensureMutable(); err != nil {
		return err
	}
	user.apiToken = token
	return nil
}

func (user *User) Deactivate() error {
	if user.state == UserStateDeleted {
		return ErrUserDeleted
	}
	user.state = UserStateDeactivated
	return nil
}

func (user *User) Delete() error {
	user.state = UserStateDeleted
	return nil
}

func (user *User) ensureAuthenticatable() error {
	switch user.state {
	case UserStateDeactivated:
		return ErrUserDeactivated
	case UserStateDeleted:
		return ErrUserDeleted
	default:
		return nil
	}
}

func (user *User) ensureMutable() error {
	return user.ensureAuthenticatable()
}

func hashSecret(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func isSupportedTimeOfDayFormat(value string) bool {
	switch value {
	case "h:mm A", "HH:mm", "H:MM":
		return true
	default:
		return false
	}
}
