package web

import (
	"context"
	"testing"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	"opentoggl/backend/apps/backend/internal/identity/application"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
	trackingpostgres "opentoggl/backend/apps/backend/internal/tracking/infra/postgres"
)

func TestRegisterReturnsSessionBootstrap(t *testing.T) {
	handler := newTestHandler(t)

	response := handler.Register(context.Background(), RegisterRequest{
		Email:    "person@example.com",
		FullName: "Test Person",
		Password: "secret1",
	})

	if response.StatusCode != 201 {
		t.Fatalf("expected register status 201, got %d", response.StatusCode)
	}
	if response.SessionID == "" {
		t.Fatal("expected register to return a session id")
	}

	body, ok := response.Body.(webapi.SessionBootstrap)
	if !ok {
		t.Fatalf("expected register body SessionBootstrap, got %T", response.Body)
	}
	if string(body.User.Email) != "person@example.com" {
		t.Fatalf("expected registered user email, got %q", body.User.Email)
	}
}

func TestLoginLogoutAndSessionLookupsUseSessionTransportState(t *testing.T) {
	handler := newTestHandler(t)

	registered := handler.Register(context.Background(), RegisterRequest{
		Email:    "person@example.com",
		FullName: "Test Person",
		Password: "secret1",
	})
	if registered.StatusCode != 201 {
		t.Fatalf("expected register status 201, got %d", registered.StatusCode)
	}

	loginResponse := handler.Login(context.Background(), LoginRequest{
		Email:    "person@example.com",
		Password: "secret1",
	})
	if loginResponse.StatusCode != 200 {
		t.Fatalf("expected login status 200, got %d", loginResponse.StatusCode)
	}
	if loginResponse.SessionID == "" {
		t.Fatal("expected login to return a session id")
	}

	body, ok := loginResponse.Body.(webapi.SessionBootstrap)
	if !ok {
		t.Fatalf("expected login body SessionBootstrap, got %T", loginResponse.Body)
	}
	if string(body.User.Email) != "person@example.com" {
		t.Fatalf("expected login user email, got %q", body.User.Email)
	}
}

func TestGetSessionAndLogoutUseSessionTransportState(t *testing.T) {
	handler := newTestHandler(t)

	auth, err := handler.service.Register(context.Background(), application.RegisterInput{
		Email:    "person@example.com",
		FullName: "Test Person",
		Password: "secret1",
	})
	if err != nil {
		t.Fatalf("expected register to succeed: %v", err)
	}

	sessionResponse := handler.GetSession(context.Background(), auth.SessionID)
	if sessionResponse.StatusCode != 200 {
		t.Fatalf("expected session lookup status 200, got %d", sessionResponse.StatusCode)
	}

	logoutResponse := handler.Logout(context.Background(), auth.SessionID)
	if logoutResponse.StatusCode != 204 {
		t.Fatalf("expected logout status 204, got %d", logoutResponse.StatusCode)
	}

	loggedOutSession := handler.GetSession(context.Background(), auth.SessionID)
	if loggedOutSession.StatusCode != 401 {
		t.Fatalf("expected logged out session status 401, got %d", loggedOutSession.StatusCode)
	}
}

func TestGetProfileReturnsCurrentAPIToken(t *testing.T) {
	handler := newTestHandler(t)

	auth, err := handler.service.Register(context.Background(), application.RegisterInput{
		Email:    "person@example.com",
		FullName: "Test Person",
		Password: "secret1",
	})
	if err != nil {
		t.Fatalf("expected register to succeed: %v", err)
	}

	response := handler.GetProfile(context.Background(), auth.SessionID)
	if response.StatusCode != 200 {
		t.Fatalf("expected profile status 200, got %d", response.StatusCode)
	}

	body, ok := response.Body.(webapi.CurrentUserProfile)
	if !ok {
		t.Fatalf("expected profile body CurrentUserProfile, got %T", response.Body)
	}
	if body.ApiToken == "" {
		t.Fatalf("expected profile api_token string, got %#v", body.ApiToken)
	}
}

func TestResetAPITokenReturnsNewCurrentUserToken(t *testing.T) {
	handler := newTestHandler(t)

	auth, err := handler.service.Register(context.Background(), application.RegisterInput{
		Email:    "person@example.com",
		FullName: "Test Person",
		Password: "secret1",
	})
	if err != nil {
		t.Fatalf("expected register to succeed: %v", err)
	}

	profile := handler.GetProfile(context.Background(), auth.SessionID)
	profileBody, ok := profile.Body.(webapi.CurrentUserProfile)
	if !ok {
		t.Fatalf("expected profile body CurrentUserProfile, got %T", profile.Body)
	}
	originalToken := profileBody.ApiToken
	if originalToken == "" {
		t.Fatalf("expected original profile api_token, got %#v", profileBody.ApiToken)
	}

	reset := handler.ResetAPIToken(context.Background(), auth.SessionID)
	if reset.StatusCode != 200 {
		t.Fatalf("expected reset token status 200, got %d", reset.StatusCode)
	}

	resetBody, ok := reset.Body.(webapi.CurrentUserAPIToken)
	if !ok {
		t.Fatalf("expected reset body CurrentUserAPIToken, got %T", reset.Body)
	}
	rotatedToken := resetBody.ApiToken
	if rotatedToken == "" {
		t.Fatalf("expected rotated api_token string, got %#v", resetBody.ApiToken)
	}
	if rotatedToken == originalToken {
		t.Fatalf("expected rotated token to change, kept %q", rotatedToken)
	}

	updatedProfile := handler.GetProfile(context.Background(), auth.SessionID)
	updatedProfileBody, ok := updatedProfile.Body.(webapi.CurrentUserProfile)
	if !ok {
		t.Fatalf("expected updated profile body CurrentUserProfile, got %T", updatedProfile.Body)
	}
	if updatedProfileBody.ApiToken != rotatedToken {
		t.Fatalf(
			"expected updated profile api_token %q, got %#v",
			rotatedToken,
			updatedProfileBody.ApiToken,
		)
	}
}

func TestLoginMapsInvalidCredentialsToForbidden(t *testing.T) {
	handler := newTestHandler(t)
	handler.Register(context.Background(), RegisterRequest{
		Email:    "person@example.com",
		FullName: "Test Person",
		Password: "secret1",
	})

	response := handler.Login(context.Background(), LoginRequest{
		Email:    "person@example.com",
		Password: "wrong-secret",
	})

	if response.StatusCode != 403 {
		t.Fatalf("expected invalid login status 403, got %d", response.StatusCode)
	}

	if response.Body != "User does not have access to this resource." {
		t.Fatalf("expected forbidden login body, got %#v", response.Body)
	}
}

func newTestHandler(t *testing.T) *Handler {
	database := pgtest.Open(t)
	service := application.NewService(application.Config{
		Users:              identitypostgres.NewUserRepository(database.Pool),
		Sessions:           identitypostgres.NewSessionRepository(database.Pool),
		PushServices:       identitypostgres.NewPushServiceRepository(database.Pool),
		JobRecorder:        identitypostgres.NewJobRecorder(database.Pool),
		RunningTimerLookup: trackingpostgres.NewRunningTimerLookup(database.Pool),
		IDs:                identitypostgres.NewSequence(database.Pool),
		KnownAlphaFeatures: []string{"calendar-redesign"},
	})

	return NewHandler(service)
}
