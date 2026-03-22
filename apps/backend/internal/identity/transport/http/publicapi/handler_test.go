package publicapi

import (
	"context"
	"testing"

	"opentoggl/backend/apps/backend/internal/identity/application"
	"opentoggl/backend/apps/backend/internal/identity/domain"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
	trackingpostgres "opentoggl/backend/apps/backend/internal/tracking/infra/postgres"
)

func TestGetMeReturnsCurrentUserForValidBasicAuth(t *testing.T) {
	handler, _ := newTestHandler(t)

	response := handler.GetMe(context.Background(), domain.BasicCredentials{
		Username: "person@example.com",
		Password: "secret1",
	})

	if response.StatusCode != 200 {
		t.Fatalf("expected get me status 200, got %d", response.StatusCode)
	}

	body, ok := response.Body.(map[string]any)
	if !ok {
		t.Fatalf("expected get me body map, got %T", response.Body)
	}

	if body["email"] != "person@example.com" {
		t.Fatalf("expected get me email, got %#v", body["email"])
	}
}

func TestPutMeMapsProfileValidationErrorsToCompatBody(t *testing.T) {
	handler, _ := newTestHandler(t)

	response := handler.PutMe(context.Background(), domain.BasicCredentials{
		Username: "person@example.com",
		Password: "secret1",
	}, domain.ProfileUpdate{
		Password: "secret2",
	})

	if response.StatusCode != 400 {
		t.Fatalf("expected put me status 400, got %d", response.StatusCode)
	}

	if response.Body != "Current password must be present to change password" {
		t.Fatalf("expected compat validation body, got %#v", response.Body)
	}
}

func TestPreferencesAndResetTokenMapToCompatResponses(t *testing.T) {
	handler, auth := newTestHandler(t)

	preferencesResponse := handler.PostPreferences(context.Background(), domain.BasicCredentials{
		Username: "person@example.com",
		Password: "secret1",
	}, "web", domain.Preferences{
		ToSAcceptNeeded: boolPtr(true),
	})

	if preferencesResponse.StatusCode != 400 {
		t.Fatalf("expected preferences status 400, got %d", preferencesResponse.StatusCode)
	}

	if preferencesResponse.Body != "Cannot set value for ToSAcceptNeeded" {
		t.Fatalf("expected compat preferences body, got %#v", preferencesResponse.Body)
	}

	resetResponse := handler.PostResetToken(context.Background(), domain.BasicCredentials{
		Username: "person@example.com",
		Password: "secret1",
	})

	if resetResponse.StatusCode != 200 {
		t.Fatalf("expected reset token status 200, got %d", resetResponse.StatusCode)
	}

	token, ok := resetResponse.Body.(string)
	if !ok || token == "" {
		t.Fatalf("expected reset token body string, got %#v", resetResponse.Body)
	}

	if err := handler.service.Deactivate(context.Background(), auth.User.ID); err != nil {
		t.Fatalf("expected deactivation to succeed: %v", err)
	}

	blockedResponse := handler.PostResetToken(context.Background(), domain.BasicCredentials{
		Username: "person@example.com",
		Password: "secret1",
	})

	if blockedResponse.StatusCode != 403 {
		t.Fatalf("expected deactivated reset token status 403, got %d", blockedResponse.StatusCode)
	}

	if blockedResponse.Body != "User does not have access to this resource." {
		t.Fatalf("expected compat forbidden body, got %#v", blockedResponse.Body)
	}
}

func TestGetLoggedUsesSessionState(t *testing.T) {
	handler, auth := newTestHandler(t)

	response := handler.GetLogged(context.Background(), auth.SessionID)
	if response.StatusCode != 200 {
		t.Fatalf("expected logged status 200, got %d", response.StatusCode)
	}

	if response.Body != nil {
		t.Fatalf("expected logged body to be empty, got %#v", response.Body)
	}
}

func newTestHandler(t *testing.T) (*Handler, application.AuthenticatedSession) {
	t.Helper()

	database := pgtest.Open(t)

	service := application.NewService(application.Config{
		Users:              identitypostgres.NewUserRepository(database.Pool),
		Sessions:           identitypostgres.NewSessionRepository(database.Pool),
		JobRecorder:        identitypostgres.NewJobRecorder(database.Pool),
		RunningTimerLookup: trackingpostgres.NewRunningTimerLookup(database.Pool),
		IDs:                identitypostgres.NewSequence(database.Pool),
		KnownAlphaFeatures: []string{"calendar-redesign"},
	})

	auth, err := service.Register(context.Background(), application.RegisterInput{
		Email:    "person@example.com",
		FullName: "Test Person",
		Password: "secret1",
	})
	if err != nil {
		t.Fatalf("expected register to succeed: %v", err)
	}

	return NewHandler(service), auth
}

func boolPtr(value bool) *bool {
	return &value
}
