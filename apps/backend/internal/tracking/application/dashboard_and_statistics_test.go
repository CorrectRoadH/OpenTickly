package application_test

import (
	"context"
	"testing"
	"time"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	catalogpostgres "opentoggl/backend/apps/backend/internal/catalog/infra/postgres"
	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	"opentoggl/backend/apps/backend/internal/log"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
	tenantpostgres "opentoggl/backend/apps/backend/internal/tenant/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"
	trackingpostgres "opentoggl/backend/apps/backend/internal/tracking/infra/postgres"

	"github.com/samber/lo"
)

func TestServiceReturnsProjectStatisticsFromTrackedEntries(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceAndUser(t, ctx, database)
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	project, err := catalogService.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Project Stats",
	})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}

	firstStart := time.Date(2026, 3, 1, 9, 0, 0, 0, time.UTC)
	firstStop := firstStart.Add(2 * time.Hour)
	if _, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		ProjectID:   lo.ToPtr(project.ID),
		Description: "First entry",
		Start:       firstStart,
		Stop:        &firstStop,
		CreatedWith: "tracking-test",
	}); err != nil {
		t.Fatalf("create first time entry: %v", err)
	}

	secondStart := time.Date(2026, 3, 3, 14, 30, 0, 0, time.UTC)
	secondStop := secondStart.Add(90 * time.Minute)
	if _, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		ProjectID:   lo.ToPtr(project.ID),
		Description: "Second entry",
		Start:       secondStart,
		Stop:        &secondStop,
		CreatedWith: "tracking-test",
	}); err != nil {
		t.Fatalf("create second time entry: %v", err)
	}

	statistics, err := trackingService.GetProjectStatistics(ctx, workspaceID, project.ID)
	if err != nil {
		t.Fatalf("get project statistics: %v", err)
	}
	if statistics.EarliestTimeEntry == nil || !statistics.EarliestTimeEntry.Equal(firstStart) {
		t.Fatalf("expected earliest time entry %s, got %#v", firstStart, statistics)
	}
	if statistics.LatestTimeEntry == nil || !statistics.LatestTimeEntry.Equal(secondStart) {
		t.Fatalf("expected latest time entry %s, got %#v", secondStart, statistics)
	}
}

func TestServiceBuildsWorkspaceDashboardAggregates(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceAndUser(t, ctx, database)
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	project, err := catalogService.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Dashboard Project",
	})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}

	firstStart := time.Now().UTC().Add(-2 * time.Hour).Truncate(time.Second)
	firstStop := firstStart.Add(45 * time.Minute)
	if _, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		ProjectID:   lo.ToPtr(project.ID),
		Description: "Short block",
		Start:       firstStart,
		Stop:        &firstStop,
		CreatedWith: "tracking-dashboard-test",
	}); err != nil {
		t.Fatalf("create first dashboard time entry: %v", err)
	}

	secondStart := firstStart.Add(70 * time.Minute)
	secondStop := secondStart.Add(90 * time.Minute)
	if _, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		ProjectID:   lo.ToPtr(project.ID),
		Description: "Long block",
		Start:       secondStart,
		Stop:        &secondStop,
		CreatedWith: "tracking-dashboard-test",
	}); err != nil {
		t.Fatalf("create second dashboard time entry: %v", err)
	}

	allActivities, err := trackingService.ListWorkspaceDashboardActivities(ctx, workspaceID, nil)
	if err != nil {
		t.Fatalf("list dashboard activities: %v", err)
	}
	if len(allActivities) != 2 || allActivities[0].Description != "Long block" {
		t.Fatalf("expected latest dashboard activity first, got %#v", allActivities)
	}

	topActivities, err := trackingService.ListWorkspaceTopActivities(ctx, workspaceID, nil)
	if err != nil {
		t.Fatalf("list top dashboard activities: %v", err)
	}
	if len(topActivities) != 2 || topActivities[0].Description != "Long block" {
		t.Fatalf("expected longest dashboard activity first, got %#v", topActivities)
	}

	mostActiveUsers, err := trackingService.ListWorkspaceMostActiveUsers(ctx, workspaceID, nil)
	if err != nil {
		t.Fatalf("list most active users: %v", err)
	}
	if len(mostActiveUsers) != 1 || mostActiveUsers[0].UserID != userID {
		t.Fatalf("expected one most active user %d, got %#v", userID, mostActiveUsers)
	}
	expectedDuration := int(firstStop.Sub(firstStart).Seconds() + secondStop.Sub(secondStart).Seconds())
	if mostActiveUsers[0].Duration != expectedDuration {
		t.Fatalf("expected most active duration %d, got %#v", expectedDuration, mostActiveUsers)
	}
}

func mustNewTrackingCatalogService(t *testing.T, database *pgtest.Database) *catalogapplication.Service {
	t.Helper()

	service, err := catalogapplication.NewService(catalogpostgres.NewStore(database.Pool), log.NopLogger())
	if err != nil {
		t.Fatalf("new tracking catalog service: %v", err)
	}
	return service
}

func mustNewTrackingService(
	t *testing.T,
	database *pgtest.Database,
	catalogService *catalogapplication.Service,
	logger log.Logger,
) *trackingapplication.Service {
	t.Helper()

	tenantStore := tenantpostgres.NewStore(database.Pool)
	settingsLookup := trackingapplication.WorkspaceSettingsFromTenantStore(tenantStore.GetWorkspace)

	service, err := trackingapplication.NewService(
		trackingpostgres.NewStore(database.Pool),
		catalogService,
		logger,
		trackingapplication.WithWorkspaceSettings(settingsLookup),
	)
	if err != nil {
		t.Fatalf("new tracking service: %v", err)
	}
	return service
}

func seedTrackingWorkspaceAndUser(t *testing.T, ctx context.Context, database *pgtest.Database) (int64, int64) {
	t.Helper()

	tenantStore := tenantpostgres.NewStore(database.Pool)
	_, workspace, err := tenantStore.CreateOrganization(
		ctx,
		"Tracking Org",
		"Tracking Workspace",
		tenantdomain.DefaultWorkspaceSettings(),
	)
	if err != nil {
		t.Fatalf("create tracking tenant state: %v", err)
	}

	userID := int64(301)
	user, err := identitydomain.RegisterUser(identitydomain.RegisterParams{
		ID:       userID,
		Email:    "tracking@example.com",
		FullName: "Tracking User",
		Password: "secret1",
		APIToken: "tracking-api-token",
	})
	if err != nil {
		t.Fatalf("register tracking user: %v", err)
	}
	if err := identitypostgres.NewUserRepository(database.Pool).Save(ctx, user); err != nil {
		t.Fatalf("save tracking user: %v", err)
	}

	return int64(workspace.ID()), userID
}
