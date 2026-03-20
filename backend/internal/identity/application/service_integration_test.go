package application_test

import (
	"context"
	"errors"
	"testing"

	"opentoggl/backend/backend/internal/identity/application"
	"opentoggl/backend/backend/internal/identity/domain"
	"opentoggl/backend/backend/internal/identity/infra/memory"
)

func TestRegisterLoginLogoutAndResolveCurrentUser(t *testing.T) {
	service := newTestService()

	registered, err := service.Register(context.Background(), application.RegisterInput{
		Email:    "person@example.com",
		FullName: "Test Person",
		Password: "secret1",
	})
	if err != nil {
		t.Fatalf("expected register to succeed: %v", err)
	}

	if registered.SessionID == "" {
		t.Fatal("expected register to create a session")
	}

	current, err := service.ResolveCurrentUser(context.Background(), registered.SessionID)
	if err != nil {
		t.Fatalf("expected current session lookup to succeed: %v", err)
	}

	if current.Email != "person@example.com" {
		t.Fatalf("expected current user email, got %q", current.Email)
	}

	loggedIn, err := service.LoginBasic(context.Background(), domain.BasicCredentials{
		Username: "person@example.com",
		Password: "secret1",
	})
	if err != nil {
		t.Fatalf("expected login to succeed: %v", err)
	}

	if err := service.Logout(context.Background(), loggedIn.SessionID); err != nil {
		t.Fatalf("expected logout to succeed: %v", err)
	}

	if _, err := service.ResolveCurrentUser(context.Background(), loggedIn.SessionID); !errors.Is(err, application.ErrSessionNotFound) {
		t.Fatalf("expected logged out session to be unavailable, got %v", err)
	}
}

func TestProfilePreferencesAndAPITokenFlows(t *testing.T) {
	service := newTestService()

	auth, err := service.Register(context.Background(), application.RegisterInput{
		Email:    "person@example.com",
		FullName: "Test Person",
		Password: "secret1",
	})
	if err != nil {
		t.Fatalf("expected register to succeed: %v", err)
	}

	profile, err := service.UpdateProfile(context.Background(), auth.User.ID, domain.ProfileUpdate{
		CurrentPassword: "secret1",
		Password:        "secret2",
		Email:           "renamed@example.com",
		FullName:        "Renamed Person",
		Timezone:        "Asia/Shanghai",
	})
	if err != nil {
		t.Fatalf("expected profile update to succeed: %v", err)
	}

	if profile.Email != "renamed@example.com" {
		t.Fatalf("expected updated email, got %q", profile.Email)
	}

	if err := service.UpdatePreferences(context.Background(), auth.User.ID, "web", domain.Preferences{
		DateFormat:      "YYYY-MM-DD",
		TimeOfDayFormat: "h:mm A",
		AlphaFeatures: []domain.AlphaFeature{
			{Code: "calendar-redesign", Enabled: true},
		},
	}); err != nil {
		t.Fatalf("expected preferences update to succeed: %v", err)
	}

	preferences, err := service.GetPreferences(context.Background(), auth.User.ID, "web")
	if err != nil {
		t.Fatalf("expected preference lookup to succeed: %v", err)
	}

	if len(preferences.AlphaFeatures) != 1 {
		t.Fatalf("expected saved alpha features, got %d", len(preferences.AlphaFeatures))
	}

	token, err := service.ResetAPIToken(context.Background(), auth.User.ID)
	if err != nil {
		t.Fatalf("expected api token reset to succeed: %v", err)
	}

	tokenSession, err := service.LoginBasic(context.Background(), domain.BasicCredentials{
		Username: token,
		Password: "api_token",
	})
	if err != nil {
		t.Fatalf("expected token basic auth to succeed after reset: %v", err)
	}

	if tokenSession.User.ID != auth.User.ID {
		t.Fatalf("expected token auth to resolve the same user, got %d", tokenSession.User.ID)
	}
}

func TestDeactivationBlocksAuthAndBusinessWritesAndRecordsStopTimerJob(t *testing.T) {
	deps := newTestDependencies()
	service := application.NewService(deps.Config())

	auth, err := service.Register(context.Background(), application.RegisterInput{
		Email:    "person@example.com",
		FullName: "Test Person",
		Password: "secret1",
	})
	if err != nil {
		t.Fatalf("expected register to succeed: %v", err)
	}

	deps.TimerState.MarkRunning(auth.User.ID)

	if err := service.Deactivate(context.Background(), auth.User.ID); err != nil {
		t.Fatalf("expected deactivation to succeed: %v", err)
	}

	if _, err := service.LoginBasic(context.Background(), domain.BasicCredentials{
		Username: "person@example.com",
		Password: "secret1",
	}); !errors.Is(err, domain.ErrUserDeactivated) {
		t.Fatalf("expected deactivated login to fail, got %v", err)
	}

	if err := service.AuthorizeBusinessWrite(context.Background(), auth.User.ID); !errors.Is(err, domain.ErrUserDeactivated) {
		t.Fatalf("expected deactivated business writes to be blocked, got %v", err)
	}

	jobs := deps.JobRecorder.Recorded()
	if len(jobs) != 1 {
		t.Fatalf("expected one stop-running-timer job, got %d", len(jobs))
	}

	if jobs[0].Name != application.StopRunningTimerJobName {
		t.Fatalf("expected stop-running-timer job name, got %q", jobs[0].Name)
	}

	if jobs[0].UserID != auth.User.ID {
		t.Fatalf("expected stop-running-timer job to target the deactivated user, got %d", jobs[0].UserID)
	}
}

func TestDeactivateRollsBackWhenStopTimerJobRecordingFails(t *testing.T) {
	deps := newTestDependencies()
	service := application.NewService(application.Config{
		Users:              deps.Users,
		Sessions:           deps.Sessions,
		JobRecorder:        failingJobRecorder{err: errors.New("record failed")},
		RunningTimerLookup: deps.TimerState,
		IDs:                deps.IDs,
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

	deps.TimerState.MarkRunning(auth.User.ID)

	if err := service.Deactivate(context.Background(), auth.User.ID); err == nil {
		t.Fatal("expected deactivation to fail when stop-running-timer job recording fails")
	}

	if _, err := service.LoginBasic(context.Background(), domain.BasicCredentials{
		Username: "person@example.com",
		Password: "secret1",
	}); err != nil {
		t.Fatalf("expected failed job handoff to leave the user active, got %v", err)
	}
}

func TestDeactivateRollsBackWhenPersistingTheDeactivatedUserFails(t *testing.T) {
	users := &failOnDeactivatedSaveRepository{
		delegate: memory.NewUserRepository(),
		err:      errors.New("save failed"),
	}
	sessions := memory.NewSessionRepository()
	jobs := memory.NewJobRecorder()
	timers := memory.NewTimerState()
	ids := memory.NewSequence()

	service := application.NewService(application.Config{
		Users:              users,
		Sessions:           sessions,
		JobRecorder:        jobs,
		RunningTimerLookup: timers,
		IDs:                ids,
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

	timers.MarkRunning(auth.User.ID)

	if err := service.Deactivate(context.Background(), auth.User.ID); err == nil {
		t.Fatal("expected deactivation to fail when persisting the deactivated user fails")
	}

	if _, err := service.LoginBasic(context.Background(), domain.BasicCredentials{
		Username: "person@example.com",
		Password: "secret1",
	}); err != nil {
		t.Fatalf("expected failed deactivation persistence to leave the user active, got %v", err)
	}

	if len(jobs.Recorded()) != 0 {
		t.Fatalf("expected failed deactivation persistence to avoid recording jobs, got %d", len(jobs.Recorded()))
	}
}

func newTestService() *application.Service {
	return application.NewService(newTestDependencies().Config())
}

type testDependencies struct {
	Users       *memory.UserRepository
	Sessions    *memory.SessionRepository
	JobRecorder *memory.JobRecorder
	TimerState  *memory.TimerState
	IDs         *memory.Sequence
}

func newTestDependencies() testDependencies {
	return testDependencies{
		Users:       memory.NewUserRepository(),
		Sessions:    memory.NewSessionRepository(),
		JobRecorder: memory.NewJobRecorder(),
		TimerState:  memory.NewTimerState(),
		IDs:         memory.NewSequence(),
	}
}

func (deps testDependencies) Config() application.Config {
	return application.Config{
		Users:              deps.Users,
		Sessions:           deps.Sessions,
		JobRecorder:        deps.JobRecorder,
		RunningTimerLookup: deps.TimerState,
		IDs:                deps.IDs,
		KnownAlphaFeatures: []string{"calendar-redesign"},
	}
}

type failingJobRecorder struct {
	err error
}

func (recorder failingJobRecorder) Record(context.Context, application.JobRecord) error {
	return recorder.err
}

type failOnDeactivatedSaveRepository struct {
	delegate *memory.UserRepository
	err      error
}

func (repo *failOnDeactivatedSaveRepository) Save(ctx context.Context, user *domain.User) error {
	if user.State() == domain.UserStateDeactivated {
		return repo.err
	}
	return repo.delegate.Save(ctx, user)
}

func (repo *failOnDeactivatedSaveRepository) ByID(ctx context.Context, id int64) (*domain.User, error) {
	return repo.delegate.ByID(ctx, id)
}

func (repo *failOnDeactivatedSaveRepository) ByEmail(ctx context.Context, email string) (*domain.User, error) {
	return repo.delegate.ByEmail(ctx, email)
}

func (repo *failOnDeactivatedSaveRepository) ByAPIToken(ctx context.Context, token string) (*domain.User, error) {
	return repo.delegate.ByAPIToken(ctx, token)
}
