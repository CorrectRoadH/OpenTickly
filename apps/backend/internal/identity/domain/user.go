package domain

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"strings"
	"time"
)

var (
	ErrCurrentPasswordInvalid    = errors.New("current password is not valid")
	ErrCurrentPasswordRequired   = errors.New("current password must be present to change password")
	ErrInvalidCredentials        = errors.New("invalid credentials")
	ErrInvalidDateFormat         = errors.New("value in date_format is invalid")
	ErrInvalidBeginningOfWeek    = errors.New("value in beginning_of_week is invalid")
	ErrInvalidEmail              = errors.New("invalid email")
	ErrInvalidFullName           = errors.New("invalid fullname")
	ErrInvalidPassword           = errors.New("password must be between 6 and 1024 characters")
	ErrInvalidTimeOfDayFormat    = errors.New("value in timeofday_format is invalid")
	ErrInvalidTimezone           = errors.New("value in timezone is not a valid IANA name")
	ErrPreferencesFieldProtected = errors.New("cannot set value for ToSAcceptNeeded")
	ErrEmailAlreadyRegistered    = errors.New("email is already registered")
	ErrUserNotFound              = errors.New("user not found")
	ErrUserDeactivated           = errors.New("user is deactivated")
	ErrUserDeleted               = errors.New("user is deleted")
	ErrUserPendingVerification   = errors.New("email verification is pending")
)

type UserState string

const (
	UserStateActive              UserState = "active"
	UserStateDeactivated         UserState = "deactivated"
	UserStateDeleted             UserState = "deleted"
	UserStatePendingVerification UserState = "pending_verification"
)

const (
	maxEmailLength    = 254
	maxFullNameLength = 120
	maxPasswordLength = 1024
)

type RegisterParams struct {
	ID                       int64
	Email                    string
	FullName                 string
	Password                 string
	PasswordHash             string
	APIToken                 string
	Timezone                 string
	SendProductEmails        *bool
	SendWeeklyReport         *bool
	ToSAcceptNeeded          *bool
	ProductEmailsDisableCode string
	WeeklyReportDisableCode  string
	AvatarStorageKey         string
	PendingVerification      bool
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
	AnimationOptOut                *bool
	BeginningOfWeek                *int
	CollapseTimeEntries            *bool
	DateFormat                     string
	DurationFormat                 string
	HideSidebarRight               *bool
	IsGoalsViewShown               *bool
	KeyboardShortcutsEnabled       *bool
	LanguageCode                   string
	ManualEntryMode                string
	ManualMode                     *bool
	ProjectShortcutEnabled         *bool
	ReportsCollapse                *bool
	SendAddedToProjectNotification *bool
	SendDailyProjectInvites        *bool
	SendProductEmails              *bool
	SendProductReleaseNotification *bool
	SendTimerNotifications         *bool
	SendWeeklyReport               *bool
	ShowTimeInTitle                *bool
	TagsShortcutEnabled            *bool
	TimeOfDayFormat                string
	AlphaFeatures                  []AlphaFeature
	ToSAcceptNeeded                *bool
}

type User struct {
	id                       int64
	email                    string
	fullName                 string
	passwordHash             string
	apiToken                 string
	timezone                 string
	beginningOfWeek          int
	countryID                int64
	defaultWorkspaceID       int64
	state                    UserState
	sendProductEmails        bool
	sendWeeklyReport         bool
	tosAcceptNeeded          bool
	productEmailsDisableCode string
	weeklyReportDisableCode  string
	preferences              Preferences
	isInstanceAdmin          bool
	avatarStorageKey         string
}

func RegisterUser(params RegisterParams) (*User, error) {
	if params.ID <= 0 {
		return nil, ErrInvalidCredentials
	}
	if !isValidEmail(params.Email) {
		return nil, ErrInvalidEmail
	}
	if !isValidFullName(params.FullName) {
		return nil, ErrInvalidFullName
	}
	if !isValidPassword(params.Password) {
		return nil, ErrInvalidPassword
	}
	if params.PasswordHash == "" {
		params.PasswordHash = hashSecret(params.Password)
	}

	sendProductEmails := true
	if params.SendProductEmails != nil {
		sendProductEmails = *params.SendProductEmails
	}
	sendWeeklyReport := true
	if params.SendWeeklyReport != nil {
		sendWeeklyReport = *params.SendWeeklyReport
	}
	tosAcceptNeeded := true
	if params.ToSAcceptNeeded != nil {
		tosAcceptNeeded = *params.ToSAcceptNeeded
	}
	productEmailsDisableCode := params.ProductEmailsDisableCode
	if productEmailsDisableCode == "" {
		productEmailsDisableCode = notificationCode("product-emails", params.APIToken)
	}
	weeklyReportDisableCode := params.WeeklyReportDisableCode
	if weeklyReportDisableCode == "" {
		weeklyReportDisableCode = notificationCode("weekly-report", params.APIToken)
	}

	initialState := UserStateActive
	if params.PendingVerification {
		initialState = UserStatePendingVerification
	}

	timezone := "UTC"
	if params.Timezone != "" {
		if _, err := time.LoadLocation(params.Timezone); err != nil {
			return nil, ErrInvalidTimezone
		}
		timezone = params.Timezone
	}

	return &User{
		id:                       params.ID,
		email:                    strings.ToLower(strings.TrimSpace(params.Email)),
		fullName:                 strings.TrimSpace(params.FullName),
		passwordHash:             params.PasswordHash,
		apiToken:                 params.APIToken,
		timezone:                 timezone,
		beginningOfWeek:          1,
		state:                    initialState,
		sendProductEmails:        sendProductEmails,
		sendWeeklyReport:         sendWeeklyReport,
		tosAcceptNeeded:          tosAcceptNeeded,
		productEmailsDisableCode: productEmailsDisableCode,
		weeklyReportDisableCode:  weeklyReportDisableCode,
		avatarStorageKey:         params.AvatarStorageKey,
		preferences: Preferences{
			AnimationOptOut:                boolPref(false),
			BeginningOfWeek:                intPref(1),
			DateFormat:                     "YYYY-MM-DD",
			DurationFormat:                 "improved",
			LanguageCode:                   "en-US",
			ManualEntryMode:                "timer",
			TimeOfDayFormat:                "h:mm A",
			CollapseTimeEntries:            boolPref(true),
			HideSidebarRight:               boolPref(false),
			IsGoalsViewShown:               boolPref(true),
			KeyboardShortcutsEnabled:       boolPref(true),
			ManualMode:                     boolPref(false),
			ProjectShortcutEnabled:         boolPref(false),
			ReportsCollapse:                boolPref(false),
			SendAddedToProjectNotification: boolPref(true),
			SendDailyProjectInvites:        boolPref(true),
			SendProductEmails:              boolPref(sendProductEmails),
			SendProductReleaseNotification: boolPref(true),
			SendTimerNotifications:         boolPref(true),
			SendWeeklyReport:               boolPref(sendWeeklyReport),
			ShowTimeInTitle:                boolPref(true),
			TagsShortcutEnabled:            boolPref(false),
		},
	}, nil
}

func (user *User) ID() int64 {
	return user.id
}

func (user *User) Email() string {
	return user.email
}

func (user *User) Username() string {
	username, _, _ := strings.Cut(user.email, "@")
	return username
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

func (user *User) SendProductEmails() bool {
	return user.sendProductEmails
}

func (user *User) SendWeeklyReport() bool {
	return user.sendWeeklyReport
}

func (user *User) ToSAcceptNeeded() bool {
	return user.tosAcceptNeeded
}

func (user *User) ProductEmailsDisableCode() string {
	return user.productEmailsDisableCode
}

func (user *User) WeeklyReportDisableCode() string {
	return user.weeklyReportDisableCode
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

func (user *User) IsInstanceAdmin() bool {
	return user.isInstanceAdmin
}

func (user *User) PromoteToInstanceAdmin() {
	user.isInstanceAdmin = true
}

func (user *User) AvatarStorageKey() string {
	return user.avatarStorageKey
}

func (user *User) SetAvatarStorageKey(key string) {
	user.avatarStorageKey = key
}

func (user *User) HasPassword() bool {
	return user.passwordHash != ""
}

func (user *User) PasswordHash() string {
	return user.passwordHash
}

func (user *User) CanAuthenticate() bool {
	return user.state == UserStateActive
}

func (user *User) CanWriteBusinessData() bool {
	return user.state == UserStateActive
}

func (user *User) MatchesPassword(password string) bool {
	return subtle.ConstantTimeCompare([]byte(user.passwordHash), []byte(hashSecret(password))) == 1
}

func (user *User) MatchesAPIToken(token string) bool {
	if user.apiToken == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(user.apiToken), []byte(token)) == 1
}

// AuthenticateBasic keeps Toggl's supported Basic Auth shapes explicit:
// email-or-username:password for normal login and api_token:api_token for token auth.
func (user *User) AuthenticateBasic(credentials BasicCredentials) error {
	if err := user.ensureAuthenticatable(); err != nil {
		return err
	}

	username := strings.TrimSpace(credentials.Username)
	if (strings.EqualFold(username, user.email) || strings.EqualFold(username, user.Username())) &&
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
		if !isValidPassword(update.Password) {
			return ErrInvalidPassword
		}
		user.passwordHash = hashSecret(update.Password)
	}

	if update.Email != "" {
		if !isValidEmail(update.Email) {
			return ErrInvalidEmail
		}
		user.email = strings.ToLower(strings.TrimSpace(update.Email))
	}

	if update.FullName != "" {
		if !isValidFullName(update.FullName) {
			return ErrInvalidFullName
		}
		user.fullName = strings.TrimSpace(update.FullName)
	}

	if update.Timezone != "" {
		if _, err := time.LoadLocation(update.Timezone); err != nil {
			return ErrInvalidTimezone
		}
		user.timezone = update.Timezone
	}

	if update.BeginningOfWeek != nil {
		user.beginningOfWeek = *update.BeginningOfWeek
		user.preferences.BeginningOfWeek = intPref(*update.BeginningOfWeek)
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
	if preferences.BeginningOfWeek != nil && (*preferences.BeginningOfWeek < 0 || *preferences.BeginningOfWeek > 6) {
		return ErrInvalidBeginningOfWeek
	}
	if preferences.DateFormat != "" && !isSupportedDateFormat(preferences.DateFormat) {
		return ErrInvalidDateFormat
	}
	if preferences.TimeOfDayFormat != "" && !isSupportedTimeOfDayFormat(preferences.TimeOfDayFormat) {
		return ErrInvalidTimeOfDayFormat
	}

	if preferences.AnimationOptOut != nil {
		user.preferences.AnimationOptOut = boolPref(*preferences.AnimationOptOut)
	}
	if preferences.BeginningOfWeek != nil {
		user.beginningOfWeek = *preferences.BeginningOfWeek
		user.preferences.BeginningOfWeek = intPref(*preferences.BeginningOfWeek)
	}
	if preferences.DateFormat != "" {
		user.preferences.DateFormat = preferences.DateFormat
	}
	if preferences.DurationFormat != "" {
		user.preferences.DurationFormat = preferences.DurationFormat
	}
	if preferences.LanguageCode != "" {
		user.preferences.LanguageCode = preferences.LanguageCode
	}
	if preferences.ManualEntryMode != "" {
		user.preferences.ManualEntryMode = preferences.ManualEntryMode
	}
	if preferences.TimeOfDayFormat != "" {
		user.preferences.TimeOfDayFormat = preferences.TimeOfDayFormat
	}
	if preferences.CollapseTimeEntries != nil {
		user.preferences.CollapseTimeEntries = boolPref(*preferences.CollapseTimeEntries)
	}
	if preferences.HideSidebarRight != nil {
		user.preferences.HideSidebarRight = boolPref(*preferences.HideSidebarRight)
	}
	if preferences.IsGoalsViewShown != nil {
		user.preferences.IsGoalsViewShown = boolPref(*preferences.IsGoalsViewShown)
	}
	if preferences.KeyboardShortcutsEnabled != nil {
		user.preferences.KeyboardShortcutsEnabled = boolPref(*preferences.KeyboardShortcutsEnabled)
	}
	if preferences.ManualMode != nil {
		user.preferences.ManualMode = boolPref(*preferences.ManualMode)
	}
	if preferences.ProjectShortcutEnabled != nil {
		user.preferences.ProjectShortcutEnabled = boolPref(*preferences.ProjectShortcutEnabled)
	}
	if preferences.ReportsCollapse != nil {
		user.preferences.ReportsCollapse = boolPref(*preferences.ReportsCollapse)
	}
	if preferences.SendAddedToProjectNotification != nil {
		user.preferences.SendAddedToProjectNotification = boolPref(*preferences.SendAddedToProjectNotification)
	}
	if preferences.SendDailyProjectInvites != nil {
		user.preferences.SendDailyProjectInvites = boolPref(*preferences.SendDailyProjectInvites)
	}
	if preferences.SendProductReleaseNotification != nil {
		user.preferences.SendProductReleaseNotification = boolPref(*preferences.SendProductReleaseNotification)
	}
	if preferences.SendTimerNotifications != nil {
		user.preferences.SendTimerNotifications = boolPref(*preferences.SendTimerNotifications)
	}
	if preferences.ShowTimeInTitle != nil {
		user.preferences.ShowTimeInTitle = boolPref(*preferences.ShowTimeInTitle)
	}
	if preferences.TagsShortcutEnabled != nil {
		user.preferences.TagsShortcutEnabled = boolPref(*preferences.TagsShortcutEnabled)
	}
	if preferences.SendProductEmails != nil {
		user.sendProductEmails = *preferences.SendProductEmails
		user.preferences.SendProductEmails = boolPref(*preferences.SendProductEmails)
	}
	if preferences.SendWeeklyReport != nil {
		user.sendWeeklyReport = *preferences.SendWeeklyReport
		user.preferences.SendWeeklyReport = boolPref(*preferences.SendWeeklyReport)
	}
	if preferences.AlphaFeatures != nil {
		user.preferences.AlphaFeatures = append([]AlphaFeature(nil), preferences.AlphaFeatures...)
	}

	return nil
}

// ResetPassword sets a new password without requiring the current one. Caller
// MUST have verified a valid reset token before invoking.
func (user *User) ResetPassword(newPassword string) error {
	if err := user.ensureMutable(); err != nil {
		return err
	}
	if !isValidPassword(newPassword) {
		return ErrInvalidPassword
	}
	user.passwordHash = hashSecret(newPassword)
	return nil
}

func isValidEmail(email string) bool {
	email = strings.TrimSpace(email)
	return len(email) <= maxEmailLength && strings.Contains(email, "@")
}

func isValidFullName(fullName string) bool {
	fullName = strings.TrimSpace(fullName)
	return fullName != "" && len(fullName) <= maxFullNameLength
}

func isValidPassword(password string) bool {
	return len(password) >= 6 && len(password) <= maxPasswordLength
}

func (user *User) RotateAPIToken(token string) error {
	if err := user.ensureMutable(); err != nil {
		return err
	}
	user.apiToken = token
	user.productEmailsDisableCode = notificationCode("product-emails", token)
	user.weeklyReportDisableCode = notificationCode("weekly-report", token)
	return nil
}

func boolPref(value bool) *bool {
	return &value
}

func intPref(value int) *int {
	return &value
}

func (user *User) AcceptTermsOfService() error {
	if err := user.ensureMutable(); err != nil {
		return err
	}
	user.tosAcceptNeeded = false
	return nil
}

func (user *User) DisableProductEmails() error {
	if err := user.ensureMutable(); err != nil {
		return err
	}
	user.sendProductEmails = false
	return nil
}

func (user *User) DisableWeeklyReport() error {
	if err := user.ensureMutable(); err != nil {
		return err
	}
	user.sendWeeklyReport = false
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
	case UserStatePendingVerification:
		return ErrUserPendingVerification
	default:
		return nil
	}
}

// Activate transitions a user from pending_verification to active.
func (user *User) Activate() error {
	if user.state != UserStatePendingVerification {
		return errors.New("only pending_verification users can be activated")
	}
	user.state = UserStateActive
	return nil
}

func (user *User) ensureMutable() error {
	return user.ensureAuthenticatable()
}

func hashSecret(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func notificationCode(kind string, apiToken string) string {
	return hashSecret(kind + ":" + apiToken)
}

func isSupportedDateFormat(value string) bool {
	switch value {
	case "YYYY-MM-DD", "MM/DD/YYYY", "DD-MM-YYYY", "MM-DD-YYYY", "DD/MM/YYYY", "DD.MM.YYYY":
		return true
	default:
		return false
	}
}

func isSupportedTimeOfDayFormat(value string) bool {
	switch value {
	case "h:mm A", "HH:mm", "H:MM":
		return true
	default:
		return false
	}
}
