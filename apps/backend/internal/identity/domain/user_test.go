package domain

import "testing"

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
		BeginningOfWeek: intPtr(1),
		CountryID:       int64Ptr(156),
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
		ToSAcceptNeeded: boolPtr(true),
	}); err != ErrPreferencesFieldProtected {
		t.Fatalf("expected protected preference field to be rejected, got %v", err)
	}

	if err := user.UpdatePreferences(Preferences{
		DateFormat: "MM/DD/YYYY",
	}); err != ErrInvalidDateFormat {
		t.Fatalf("expected invalid date format to be rejected, got %v", err)
	}

	if err := user.UpdatePreferences(Preferences{
		DateFormat:      "YYYY-MM-DD",
		TimeOfDayFormat: "H:MM",
		AlphaFeatures: []AlphaFeature{
			{Code: "calendar-redesign", Enabled: true},
		},
	}); err != nil {
		t.Fatalf("expected valid preference update to succeed: %v", err)
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

func intPtr(value int) *int {
	return &value
}

func int64Ptr(value int64) *int64 {
	return &value
}

func boolPtr(value bool) *bool {
	return &value
}
