package domain

import (
	"strings"
	"testing"

	"github.com/samber/lo"
)

func TestRegisterUserSeedsCredentialsAndDefaults(t *testing.T) {
	user, err := RegisterUser(RegisterParams{
		ID:           42,
		Email:        "person@example.com",
		FullName:     "Test Person",
		Password:     "secret1",
		PasswordHash: hashSecret("secret1"),
		APIToken:     "token-1",
	})
	if err != nil {
		t.Fatalf("expected registration params to be accepted: %v", err)
	}

	if user.ID() != 42 {
		t.Fatalf("expected user id 42, got %d", user.ID())
	}

	if !user.CanAuthenticate() {
		t.Fatal("expected freshly registered user to authenticate")
	}

	if !user.CanWriteBusinessData() {
		t.Fatal("expected freshly registered user to write business data")
	}

	if !user.MatchesPassword("secret1") {
		t.Fatal("expected registered password to match")
	}

	if !user.MatchesAPIToken("token-1") {
		t.Fatal("expected api token to match")
	}

	if user.Preferences().DateFormat == "" {
		t.Fatal("expected registration to seed preferences defaults")
	}
}

func TestRegisterUserRejectsOversizedIdentityFields(t *testing.T) {
	cases := []struct {
		name   string
		params RegisterParams
		want   error
	}{
		{
			name: "email",
			params: RegisterParams{
				ID:       51,
				Email:    strings.Repeat("a", 250) + "@example.com",
				FullName: "Test Person",
				Password: "secret1",
				APIToken: "token-51",
			},
			want: ErrInvalidEmail,
		},
		{
			name: "full name",
			params: RegisterParams{
				ID:       52,
				Email:    "person@example.com",
				FullName: strings.Repeat("a", 121),
				Password: "secret1",
				APIToken: "token-52",
			},
			want: ErrInvalidFullName,
		},
		{
			name: "password",
			params: RegisterParams{
				ID:       53,
				Email:    "person@example.com",
				FullName: "Test Person",
				Password: strings.Repeat("a", 1025),
				APIToken: "token-53",
			},
			want: ErrInvalidPassword,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := RegisterUser(tc.params); err != tc.want {
				t.Fatalf("expected %v, got %v", tc.want, err)
			}
		})
	}
}

func TestAuthenticateBasicSupportsPasswordAndAPITokenFlows(t *testing.T) {
	user, err := RegisterUser(RegisterParams{
		ID:           7,
		Email:        "person@example.com",
		FullName:     "Test Person",
		Password:     "secret1",
		PasswordHash: hashSecret("secret1"),
		APIToken:     "token-7",
	})
	if err != nil {
		t.Fatalf("expected registration params to be accepted: %v", err)
	}

	if err := user.AuthenticateBasic(BasicCredentials{
		Username: "person@example.com",
		Password: "secret1",
	}); err != nil {
		t.Fatalf("expected email/password basic auth to succeed: %v", err)
	}

	if err := user.AuthenticateBasic(BasicCredentials{
		Username: "token-7",
		Password: "api_token",
	}); err != nil {
		t.Fatalf("expected api token basic auth to succeed: %v", err)
	}

	if err := user.AuthenticateBasic(BasicCredentials{
		Username: "person@example.com",
		Password: "wrong",
	}); err != ErrInvalidCredentials {
		t.Fatalf("expected wrong password to be rejected, got %v", err)
	}
}

func TestUpdateProfileRequiresCurrentPasswordToChangePassword(t *testing.T) {
	user, err := RegisterUser(RegisterParams{
		ID:           11,
		Email:        "person@example.com",
		FullName:     "Test Person",
		Password:     "secret1",
		PasswordHash: hashSecret("secret1"),
		APIToken:     "token-11",
	})
	if err != nil {
		t.Fatalf("expected registration params to be accepted: %v", err)
	}

	if err := user.UpdateProfile(ProfileUpdate{
		Password: "secret2",
	}); err != ErrCurrentPasswordRequired {
		t.Fatalf("expected password change without current password to fail, got %v", err)
	}

	if err := user.UpdateProfile(ProfileUpdate{
		CurrentPassword: "secret1",
		Password:        "secret2",
		Email:           "next@example.com",
		FullName:        "Renamed Person",
		Timezone:        "Asia/Shanghai",
		BeginningOfWeek: lo.ToPtr(1),
		CountryID:       lo.ToPtr(int64(156)),
	}); err != nil {
		t.Fatalf("expected valid profile update to succeed: %v", err)
	}

	if !user.MatchesPassword("secret2") {
		t.Fatal("expected updated password to replace the previous one")
	}

	if got := user.Email(); got != "next@example.com" {
		t.Fatalf("expected updated email, got %q", got)
	}
}

func TestUpdateProfileRejectsOversizedIdentityFields(t *testing.T) {
	user, err := RegisterUser(RegisterParams{
		ID:           54,
		Email:        "person@example.com",
		FullName:     "Test Person",
		Password:     "secret1",
		PasswordHash: hashSecret("secret1"),
		APIToken:     "token-54",
	})
	if err != nil {
		t.Fatalf("expected registration params to be accepted: %v", err)
	}

	if err := user.UpdateProfile(ProfileUpdate{Email: strings.Repeat("a", 250) + "@example.com"}); err != ErrInvalidEmail {
		t.Fatalf("expected oversized email to be rejected, got %v", err)
	}
	if err := user.UpdateProfile(ProfileUpdate{FullName: strings.Repeat("a", 121)}); err != ErrInvalidFullName {
		t.Fatalf("expected oversized full name to be rejected, got %v", err)
	}
	if err := user.UpdateProfile(ProfileUpdate{CurrentPassword: "secret1", Password: strings.Repeat("a", 1025)}); err != ErrInvalidPassword {
		t.Fatalf("expected oversized password to be rejected, got %v", err)
	}
}

func TestPreferencesRejectProtectedAndInvalidFields(t *testing.T) {
	user, err := RegisterUser(RegisterParams{
		ID:           21,
		Email:        "person@example.com",
		FullName:     "Test Person",
		Password:     "secret1",
		PasswordHash: hashSecret("secret1"),
		APIToken:     "token-21",
	})
	if err != nil {
		t.Fatalf("expected registration params to be accepted: %v", err)
	}

	if err := user.UpdatePreferences(Preferences{
		ToSAcceptNeeded: lo.ToPtr(true),
	}); err != ErrPreferencesFieldProtected {
		t.Fatalf("expected protected preference field to be rejected, got %v", err)
	}

	if err := user.UpdatePreferences(Preferences{
		DateFormat: "YYYY/MM/DD",
	}); err != ErrInvalidDateFormat {
		t.Fatalf("expected invalid date format to be rejected, got %v", err)
	}

	if err := user.UpdatePreferences(Preferences{
		CollapseTimeEntries:            lo.ToPtr(true),
		DateFormat:                     "YYYY-MM-DD",
		DurationFormat:                 "improved",
		HideSidebarRight:               lo.ToPtr(false),
		IsGoalsViewShown:               lo.ToPtr(true),
		KeyboardShortcutsEnabled:       lo.ToPtr(true),
		LanguageCode:                   "en-US",
		ManualEntryMode:                "timer",
		ManualMode:                     lo.ToPtr(false),
		ProjectShortcutEnabled:         lo.ToPtr(false),
		ReportsCollapse:                lo.ToPtr(true),
		SendAddedToProjectNotification: lo.ToPtr(true),
		SendDailyProjectInvites:        lo.ToPtr(true),
		SendProductEmails:              lo.ToPtr(false),
		SendProductReleaseNotification: lo.ToPtr(true),
		SendTimerNotifications:         lo.ToPtr(true),
		SendWeeklyReport:               lo.ToPtr(false),
		ShowTimeInTitle:                lo.ToPtr(true),
		TagsShortcutEnabled:            lo.ToPtr(false),
		TimeOfDayFormat:                "h:mm A",
		AlphaFeatures: []AlphaFeature{
			{Code: "calendar-redesign", Enabled: true},
		},
	}); err != nil {
		t.Fatalf("expected valid preference update to succeed: %v", err)
	}

	preferences := user.Preferences()
	if !lo.FromPtr(preferences.CollapseTimeEntries) {
		t.Fatalf("expected collapse time entries preference to persist, got %#v", preferences)
	}
	if preferences.DurationFormat != "improved" {
		t.Fatalf("expected duration format to persist, got %#v", preferences.DurationFormat)
	}
	if preferences.LanguageCode != "en-US" {
		t.Fatalf("expected language code to persist, got %#v", preferences.LanguageCode)
	}
	if !lo.FromPtr(preferences.SendTimerNotifications) {
		t.Fatalf("expected timer notifications preference to persist, got %#v", preferences)
	}
	if !lo.FromPtr(preferences.ShowTimeInTitle) {
		t.Fatalf("expected show time in title preference to persist, got %#v", preferences)
	}
	if user.SendProductEmails() {
		t.Fatalf("expected user-level product email flag to update, got %#v", user.SendProductEmails())
	}
	if user.SendWeeklyReport() {
		t.Fatalf("expected user-level weekly report flag to update, got %#v", user.SendWeeklyReport())
	}
}

func TestRegisterUserValidatesTimezone(t *testing.T) {
	if _, err := RegisterUser(RegisterParams{
		ID:           91,
		Email:        "person@example.com",
		FullName:     "Test Person",
		Password:     "secret1",
		PasswordHash: hashSecret("secret1"),
		APIToken:     "token-91",
		Timezone:     "Not/A_Zone",
	}); err != ErrInvalidTimezone {
		t.Fatalf("expected invalid timezone to be rejected, got %v", err)
	}

	user, err := RegisterUser(RegisterParams{
		ID:           92,
		Email:        "person@example.com",
		FullName:     "Test Person",
		Password:     "secret1",
		PasswordHash: hashSecret("secret1"),
		APIToken:     "token-92",
		Timezone:     "Asia/Shanghai",
	})
	if err != nil {
		t.Fatalf("expected valid timezone to be accepted: %v", err)
	}
	if user.Timezone() != "Asia/Shanghai" {
		t.Fatalf("expected Asia/Shanghai, got %q", user.Timezone())
	}
}

func TestUpdateProfileRejectsInvalidTimezone(t *testing.T) {
	user, err := RegisterUser(RegisterParams{
		ID:           93,
		Email:        "person@example.com",
		FullName:     "Test Person",
		Password:     "secret1",
		PasswordHash: hashSecret("secret1"),
		APIToken:     "token-93",
	})
	if err != nil {
		t.Fatalf("expected registration params to be accepted: %v", err)
	}

	if err := user.UpdateProfile(ProfileUpdate{Timezone: "Not/A_Zone"}); err != ErrInvalidTimezone {
		t.Fatalf("expected invalid timezone to be rejected, got %v", err)
	}
	if user.Timezone() != "UTC" {
		t.Fatalf("expected timezone to stay UTC after rejected update, got %q", user.Timezone())
	}
}

func TestDeactivatedAndDeletedUsersStayDistinct(t *testing.T) {
	user, err := RegisterUser(RegisterParams{
		ID:           31,
		Email:        "person@example.com",
		FullName:     "Test Person",
		Password:     "secret1",
		PasswordHash: hashSecret("secret1"),
		APIToken:     "token-31",
	})
	if err != nil {
		t.Fatalf("expected registration params to be accepted: %v", err)
	}

	if err := user.Deactivate(); err != nil {
		t.Fatalf("expected deactivation to succeed: %v", err)
	}

	if user.State() != UserStateDeactivated {
		t.Fatalf("expected deactivated state, got %q", user.State())
	}

	if user.CanAuthenticate() {
		t.Fatal("expected deactivated user auth to be blocked")
	}

	if user.CanWriteBusinessData() {
		t.Fatal("expected deactivated user writes to be blocked")
	}

	if err := user.AuthenticateBasic(BasicCredentials{
		Username: "person@example.com",
		Password: "secret1",
	}); err != ErrUserDeactivated {
		t.Fatalf("expected deactivated basic auth to fail with deactivated error, got %v", err)
	}

	if err := user.Delete(); err != nil {
		t.Fatalf("expected delete to succeed from deactivated state: %v", err)
	}

	if user.State() != UserStateDeleted {
		t.Fatalf("expected deleted state, got %q", user.State())
	}

	if err := user.Deactivate(); err != ErrUserDeleted {
		t.Fatalf("expected deleted user to reject deactivation, got %v", err)
	}
}
