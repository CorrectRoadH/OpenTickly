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

	"github.com/samber/lo"
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
	if !lo.FromPtr(preferences.CollapseTimeEntries) || !lo.FromPtr(preferences.ShowTimeInTitle) {
		t.Fatalf("expected expanded boolean preferences to persist, got %#v", preferences)
	}
	if preferences.DurationFormat != "improved" || preferences.ManualEntryMode != "timer" {
		t.Fatalf("expected string preferences to persist, got %#v", preferences)
	}
	if currentAfterPreferences, err := service.ResolveCurrentUser(ctx, registered.SessionID); err != nil {
		t.Fatalf("resolve current user after preferences: %v", err)
	} else {
		if currentAfterPreferences.SendProductEmails {
			t.Fatalf("expected send product emails to persist through preferences update, got %#v", currentAfterPreferences)
		}
		if currentAfterPreferences.SendWeeklyReport {
			t.Fatalf("expected send weekly report to persist through preferences update, got %#v", currentAfterPreferences)
		}
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

func TestServicePersistsAccountPreferenceActions(t *testing.T) {
	database := pgtest.Open(t)
	service := newPostgresTestService(database)
	ctx := context.Background()

	auth, err := service.Register(ctx, application.RegisterInput{
		Email:    "person@example.com",
		FullName: "Test Person",
		Password: "secret1",
	})
	if err != nil {
		t.Fatalf("register: %v", err)
	}

	current, err := service.ResolveCurrentUser(ctx, auth.SessionID)
	if err != nil {
		t.Fatalf("resolve current user: %v", err)
	}
	if !current.ToSAcceptNeeded {
		t.Fatalf("expected new user to require ToS acceptance, got %#v", current)
	}
	if !current.SendProductEmails {
		t.Fatalf("expected product emails enabled by default, got %#v", current)
	}
	if !current.SendWeeklyReport {
		t.Fatalf("expected weekly reports enabled by default, got %#v", current)
	}
	if current.ProductEmailsDisableCode == "" {
		t.Fatalf("expected product email disable code to be generated, got %#v", current)
	}
	if current.WeeklyReportDisableCode == "" {
		t.Fatalf("expected weekly report disable code to be generated, got %#v", current)
	}

	if err := service.AcceptTOS(ctx, auth.User.ID); err != nil {
		t.Fatalf("accept tos: %v", err)
	}
	if err := service.DisableProductEmailsByCode(ctx, current.ProductEmailsDisableCode); err != nil {
		t.Fatalf("disable product emails: %v", err)
	}
	if err := service.DisableWeeklyReportByCode(ctx, current.WeeklyReportDisableCode); err != nil {
		t.Fatalf("disable weekly report: %v", err)
	}

	updated, err := service.ResolveCurrentUser(ctx, auth.SessionID)
	if err != nil {
		t.Fatalf("resolve updated current user: %v", err)
	}
	if updated.ToSAcceptNeeded {
		t.Fatalf("expected tos flag cleared after acceptance, got %#v", updated)
	}
	if updated.SendProductEmails {
		t.Fatalf("expected product emails disabled, got %#v", updated)
	}
	if updated.SendWeeklyReport {
		t.Fatalf("expected weekly report disabled, got %#v", updated)
	}
}

func TestServiceIssuesDesktopLoginTokensAsSessions(t *testing.T) {
	database := pgtest.Open(t)
	service := newPostgresTestService(database)
	ctx := context.Background()

	auth, err := service.Register(ctx, application.RegisterInput{
		Email:    "desktop@example.com",
		FullName: "Desktop User",
		Password: "secret1",
	})
	if err != nil {
		t.Fatalf("register: %v", err)
	}

	token, err := service.CreateDesktopLoginToken(ctx, auth.User.ID)
	if err != nil {
		t.Fatalf("create desktop login token: %v", err)
	}
	if token == "" {
		t.Fatal("expected desktop login token to be generated")
	}

	current, err := service.ResolveCurrentUser(ctx, token)
	if err != nil {
		t.Fatalf("resolve desktop login token session: %v", err)
	}
	if current.ID != auth.User.ID {
		t.Fatalf("expected desktop login token to resolve user %d, got %d", auth.User.ID, current.ID)
	}
}

type postgresTestDependencies struct {
	Users        *identitypostgres.UserRepository
	Sessions     *identitypostgres.SessionRepository
	PushServices *identitypostgres.PushServiceRepository
	JobRecorder  *identitypostgres.JobRecorder
	TimerState   *trackingpostgres.RunningTimerLookup
	IDs          *identitypostgres.Sequence
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
