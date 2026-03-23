package application_test

import (
	"context"
	"errors"
	"testing"

	"opentoggl/backend/apps/backend/internal/identity/application"
	"opentoggl/backend/apps/backend/internal/identity/domain"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
	trackingpostgres "opentoggl/backend/apps/backend/internal/tracking/infra/postgres"
)

func TestServicePersistsIdentityAndSessionsWithPostgresRepositories(t *testing.T) {
	database := pgtest.Open(t)
	service := newPostgresTestService(database)
	ctx := context.Background()

	registered, err := service.Register(ctx, application.RegisterInput{
		Email:    "person@example.com",
		FullName: "Test Person",
		Password: "secret1",
	})
	if err != nil {
		t.Fatalf("register: %v", err)
	}

	current, err := service.ResolveCurrentUser(ctx, registered.SessionID)
	if err != nil {
		t.Fatalf("resolve current user: %v", err)
	}
	if current.Email != "person@example.com" {
		t.Fatalf("expected current user email person@example.com, got %q", current.Email)
	}

	profile, err := service.UpdateProfile(ctx, registered.User.ID, domain.ProfileUpdate{
		CurrentPassword: "secret1",
		Password:        "secret2",
		Email:           "renamed@example.com",
		FullName:        "Renamed Person",
		Timezone:        "Asia/Shanghai",
	})
	if err != nil {
		t.Fatalf("update profile: %v", err)
	}
	if profile.Email != "renamed@example.com" {
		t.Fatalf("expected updated email renamed@example.com, got %q", profile.Email)
	}

	if err := service.UpdatePreferences(ctx, registered.User.ID, "web", domain.Preferences{
		DateFormat:      "YYYY-MM-DD",
		TimeOfDayFormat: "h:mm A",
		AlphaFeatures: []domain.AlphaFeature{
			{Code: "calendar-redesign", Enabled: true},
		},
	}); err != nil {
		t.Fatalf("update preferences: %v", err)
	}

	preferences, err := service.GetPreferences(ctx, registered.User.ID, "web")
	if err != nil {
		t.Fatalf("get preferences: %v", err)
	}
	if len(preferences.AlphaFeatures) != 1 || preferences.AlphaFeatures[0].Code != "calendar-redesign" {
		t.Fatalf("expected saved alpha feature, got %#v", preferences.AlphaFeatures)
	}

	if _, err := service.RegisterPushService(ctx, registered.User.ID, "device-token-1"); err != nil {
		t.Fatalf("register push service: %v", err)
	}
	pushServices, err := service.ListPushServices(ctx, registered.User.ID)
	if err != nil {
		t.Fatalf("list push services: %v", err)
	}
	if len(pushServices) != 1 || pushServices[0].Token().String() != "device-token-1" {
		t.Fatalf("expected saved push service token, got %#v", pushServices)
	}
	if err := service.DeletePushService(ctx, registered.User.ID, "device-token-1"); err != nil {
		t.Fatalf("delete push service: %v", err)
	}
	pushServices, err = service.ListPushServices(ctx, registered.User.ID)
	if err != nil {
		t.Fatalf("list push services after delete: %v", err)
	}
	if len(pushServices) != 0 {
		t.Fatalf("expected push services to be empty after delete, got %#v", pushServices)
	}

	token, err := service.ResetAPIToken(ctx, registered.User.ID)
	if err != nil {
		t.Fatalf("reset api token: %v", err)
	}

	tokenSession, err := service.LoginBasic(ctx, domain.BasicCredentials{
		Username: token,
		Password: "api_token",
	})
	if err != nil {
		t.Fatalf("token login: %v", err)
	}
	if tokenSession.User.ID != registered.User.ID {
		t.Fatalf("expected token login user %d, got %d", registered.User.ID, tokenSession.User.ID)
	}

	if err := service.Logout(ctx, tokenSession.SessionID); err != nil {
		t.Fatalf("logout: %v", err)
	}
	if _, err := service.ResolveCurrentUser(ctx, tokenSession.SessionID); !errors.Is(err, application.ErrSessionNotFound) {
		t.Fatalf("expected logged out session to be unavailable, got %v", err)
	}
}

func TestServiceDeactivationWithPostgresRepositoriesPreservesAuthRules(t *testing.T) {
	database := pgtest.Open(t)
	deps := newPostgresTestDependencies(database)
	service := application.NewService(deps.Config())
	ctx := context.Background()

	auth, err := service.Register(ctx, application.RegisterInput{
		Email:    "person@example.com",
		FullName: "Test Person",
		Password: "secret1",
	})
	if err != nil {
		t.Fatalf("register: %v", err)
	}

	if err := deps.TimerState.MarkRunning(ctx, auth.User.ID); err != nil {
		t.Fatalf("mark running timer: %v", err)
	}

	if err := service.Deactivate(ctx, auth.User.ID); err != nil {
		t.Fatalf("deactivate: %v", err)
	}

	if _, err := service.LoginBasic(ctx, domain.BasicCredentials{
		Username: "person@example.com",
		Password: "secret1",
	}); !errors.Is(err, domain.ErrUserDeactivated) {
		t.Fatalf("expected deactivated login to fail with ErrUserDeactivated, got %v", err)
	}

	if _, err := service.ResolveCurrentUser(ctx, auth.SessionID); !errors.Is(err, domain.ErrUserDeactivated) {
		t.Fatalf("expected deactivated session lookup to fail with ErrUserDeactivated, got %v", err)
	}

	if err := service.AuthorizeBusinessWrite(ctx, auth.User.ID); !errors.Is(err, domain.ErrUserDeactivated) {
		t.Fatalf("expected deactivated business writes to be blocked, got %v", err)
	}

	jobs, err := deps.JobRecorder.Recorded(ctx)
	if err != nil {
		t.Fatalf("recorded jobs: %v", err)
	}
	if len(jobs) != 1 || jobs[0].Name != application.StopRunningTimerJobName || jobs[0].UserID != auth.User.ID {
		t.Fatalf("expected one stop-running-timer job for user %d, got %#v", auth.User.ID, jobs)
	}
}

type postgresTestDependencies struct {
	Users       *identitypostgres.UserRepository
	Sessions    *identitypostgres.SessionRepository
	PushServices *identitypostgres.PushServiceRepository
	JobRecorder *identitypostgres.JobRecorder
	TimerState  *trackingpostgres.RunningTimerLookup
	IDs         *identitypostgres.Sequence
}

func newPostgresTestService(database *pgtest.Database) *application.Service {
	return application.NewService(newPostgresTestDependencies(database).Config())
}

func newPostgresTestDependencies(database *pgtest.Database) postgresTestDependencies {
	return postgresTestDependencies{
		Users:        identitypostgres.NewUserRepository(database.Pool),
		Sessions:     identitypostgres.NewSessionRepository(database.Pool),
		PushServices: identitypostgres.NewPushServiceRepository(database.Pool),
		JobRecorder:  identitypostgres.NewJobRecorder(database.Pool),
		TimerState:   trackingpostgres.NewRunningTimerLookup(database.Pool),
		IDs:          identitypostgres.NewSequence(database.Pool),
	}
}

func (deps postgresTestDependencies) Config() application.Config {
	return application.Config{
		Users:              deps.Users,
		Sessions:           deps.Sessions,
		PushServices:       deps.PushServices,
		JobRecorder:        deps.JobRecorder,
		RunningTimerLookup: deps.TimerState,
		IDs:                deps.IDs,
		KnownAlphaFeatures: []string{"calendar-redesign"},
	}
}
