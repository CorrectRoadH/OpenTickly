package application_test

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/identity/application"
	"opentoggl/backend/apps/backend/internal/identity/domain"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestLoginOrProvisionSSOProvisionsUnknownEmail(t *testing.T) {
	database := pgtest.Open(t)
	service := newPostgresTestService(database)
	ctx := context.Background()

	email := fmt.Sprintf("sso-new-%d@example.com", time.Now().UnixNano())
	result, err := service.LoginOrProvisionSSO(ctx, application.SSOIdentity{
		Email:    email,
		FullName: "SSO Newcomer",
	})
	if err != nil {
		t.Fatalf("login or provision sso: %v", err)
	}
	if !result.Provisioned {
		t.Fatalf("expected unknown email to be provisioned")
	}
	if result.Session.SessionID == "" {
		t.Fatalf("expected a session to be issued")
	}

	current, err := service.ResolveCurrentUser(ctx, result.Session.SessionID)
	if err != nil {
		t.Fatalf("resolve provisioned session: %v", err)
	}
	if current.Email != email {
		t.Fatalf("expected provisioned user email %s, got %q", email, current.Email)
	}
	if current.FullName != "SSO Newcomer" {
		t.Fatalf("expected provisioned full name, got %q", current.FullName)
	}
}

func TestLoginOrProvisionSSOLinksExistingUserByEmail(t *testing.T) {
	database := pgtest.Open(t)
	service := newPostgresTestService(database)
	ctx := context.Background()

	email := fmt.Sprintf("sso-existing-%d@example.com", time.Now().UnixNano())
	registered, err := service.Register(ctx, application.RegisterInput{
		Email:    email,
		FullName: "Existing Person",
		Password: "secret1",
	})
	if err != nil {
		t.Fatalf("register: %v", err)
	}

	result, err := service.LoginOrProvisionSSO(ctx, application.SSOIdentity{Email: email})
	if err != nil {
		t.Fatalf("login or provision sso: %v", err)
	}
	if result.Provisioned {
		t.Fatalf("expected existing user to be linked, not provisioned")
	}

	current, err := service.ResolveCurrentUser(ctx, result.Session.SessionID)
	if err != nil {
		t.Fatalf("resolve linked session: %v", err)
	}
	if current.ID != registered.Session.User.ID {
		t.Fatalf("expected linked user %d, got %d", registered.Session.User.ID, current.ID)
	}
}

func TestLoginOrProvisionSSORejectsDeactivatedUser(t *testing.T) {
	database := pgtest.Open(t)
	service := newPostgresTestService(database)
	ctx := context.Background()

	email := fmt.Sprintf("sso-deactivated-%d@example.com", time.Now().UnixNano())
	registered, err := service.Register(ctx, application.RegisterInput{
		Email:    email,
		FullName: "Deactivated Person",
		Password: "secret1",
	})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if err := service.Deactivate(ctx, registered.Session.User.ID); err != nil {
		t.Fatalf("deactivate: %v", err)
	}

	if _, err := service.LoginOrProvisionSSO(ctx, application.SSOIdentity{Email: email}); !errors.Is(err, domain.ErrUserDeactivated) {
		t.Fatalf("expected deactivated SSO login to fail with ErrUserDeactivated, got %v", err)
	}
}

func TestLoginOrProvisionSSORejectsInvalidEmail(t *testing.T) {
	database := pgtest.Open(t)
	service := newPostgresTestService(database)
	ctx := context.Background()

	if _, err := service.LoginOrProvisionSSO(ctx, application.SSOIdentity{Email: "not-an-email"}); !errors.Is(err, domain.ErrInvalidEmail) {
		t.Fatalf("expected invalid email to be rejected, got %v", err)
	}
}
