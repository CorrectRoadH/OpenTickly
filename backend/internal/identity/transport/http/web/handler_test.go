package web

import (
	"context"
	"testing"

	"opentoggl/backend/backend/internal/identity/application"
	"opentoggl/backend/backend/internal/identity/infra/memory"
)

func TestRegisterReturnsSessionBootstrap(t *testing.T) {
	handler := newTestHandler()

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

	body, ok := response.Body.(map[string]any)
	if !ok {
		t.Fatalf("expected register body map, got %T", response.Body)
	}

	user, ok := body["user"].(map[string]any)
	if !ok {
		t.Fatalf("expected register user payload, got %#v", body["user"])
	}

	if user["email"] != "person@example.com" {
		t.Fatalf("expected registered user email, got %#v", user["email"])
	}
}

func TestLoginLogoutAndSessionLookupsUseSessionTransportState(t *testing.T) {
	handler := newTestHandler()

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

	body, ok := loginResponse.Body.(map[string]any)
	if !ok {
		t.Fatalf("expected login body map, got %T", loginResponse.Body)
	}

	user, ok := body["user"].(map[string]any)
	if !ok {
		t.Fatalf("expected login user payload, got %#v", body["user"])
	}

	if user["email"] != "person@example.com" {
		t.Fatalf("expected login user email, got %#v", user["email"])
	}
}

func TestGetSessionAndLogoutUseSessionTransportState(t *testing.T) {
	handler := newTestHandler()

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

func TestLoginMapsInvalidCredentialsToForbidden(t *testing.T) {
	handler := newTestHandler()
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

func newTestHandler() *Handler {
	service := application.NewService(application.Config{
		Users:              memory.NewUserRepository(),
		Sessions:           memory.NewSessionRepository(),
		JobRecorder:        memory.NewJobRecorder(),
		RunningTimerLookup: memory.NewTimerState(),
		IDs:                memory.NewSequence(),
		KnownAlphaFeatures: []string{"calendar-redesign"},
	})

	return NewHandler(service)
}
