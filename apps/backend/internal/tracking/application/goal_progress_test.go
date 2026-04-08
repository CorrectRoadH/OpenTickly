package application_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
	tenantpostgres "opentoggl/backend/apps/backend/internal/tenant/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"
)

// TestGoalProgressReflectsTrackedTimeEntries verifies that ListGoals and GetGoal
// populate CurrentRecurrenceTrackedSeconds by summing time entry durations that
// fall within the goal's current recurrence window and match the goal's filter
// criteria (project IDs, tag IDs, task IDs).
func TestGoalProgressReflectsTrackedTimeEntries(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedGoalProgressWorkspace(t, ctx, database, "goal-progress")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// Create a project for filtering
	project, err := catalogService.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Goal Target Project",
	})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}

	// Create a daily goal that tracks time on this project
	today := time.Now().UTC().Truncate(24 * time.Hour)
	goal, err := trackingService.CreateGoal(ctx, trackingapplication.CreateGoalCommand{
		WorkspaceID:   workspaceID,
		UserID:        userID,
		CreatorUserID: userID,
		Name:          "Daily dev goal",
		Comparison:    "more_than",
		Recurrence:    "daily",
		Icon:          "💻",
		TargetSeconds: 7200, // 2 hours
		StartDate:     today,
		ProjectIDs:    []int64{project.ID},
	})
	if err != nil {
		t.Fatalf("create goal: %v", err)
	}

	// Create a time entry today on the target project (1 hour)
	entryStart := today.Add(9 * time.Hour) // 9 AM today
	entryStop := today.Add(10 * time.Hour) // 10 AM today
	_, err = trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "Working on goal project",
		Start:       entryStart,
		Stop:        &entryStop,
		ProjectID:   &project.ID,
		CreatedWith: "goal-progress-test",
	})
	if err != nil {
		t.Fatalf("create time entry: %v", err)
	}

	// Create a time entry today on a DIFFERENT project (should NOT count)
	otherProject, err := catalogService.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Other Project",
	})
	if err != nil {
		t.Fatalf("create other project: %v", err)
	}
	_, err = trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "Working on other project",
		Start:       today.Add(11 * time.Hour),
		Stop:        timePtr(today.Add(12 * time.Hour)),
		ProjectID:   &otherProject.ID,
		CreatedWith: "goal-progress-test",
	})
	if err != nil {
		t.Fatalf("create unrelated time entry: %v", err)
	}

	// Verify ListGoals returns progress
	active := true
	goals, err := trackingService.ListGoals(ctx, workspaceID, trackingapplication.ListGoalsFilter{
		UserID: userID,
		Active: &active,
	})
	if err != nil {
		t.Fatalf("list goals: %v", err)
	}
	if len(goals) != 1 {
		t.Fatalf("expected 1 goal, got %d", len(goals))
	}
	if goals[0].CurrentRecurrenceTrackedSeconds != 3600 {
		t.Fatalf("expected 3600 tracked seconds from ListGoals, got %d", goals[0].CurrentRecurrenceTrackedSeconds)
	}

	// Verify GetGoal also returns progress
	fetched, err := trackingService.GetGoal(ctx, workspaceID, userID, goal.ID)
	if err != nil {
		t.Fatalf("get goal: %v", err)
	}
	if fetched.CurrentRecurrenceTrackedSeconds != 3600 {
		t.Fatalf("expected 3600 tracked seconds from GetGoal, got %d", fetched.CurrentRecurrenceTrackedSeconds)
	}
}

// TestGoalProgressWithNoFiltersTracksAllEntries verifies that a goal with no
// project/tag/task filters sums ALL time entries for the user in the recurrence window.
func TestGoalProgressWithNoFiltersTracksAllEntries(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedGoalProgressWorkspace(t, ctx, database, "goal-no-filter")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	today := time.Now().UTC().Truncate(24 * time.Hour)
	_, err := trackingService.CreateGoal(ctx, trackingapplication.CreateGoalCommand{
		WorkspaceID:   workspaceID,
		UserID:        userID,
		CreatorUserID: userID,
		Name:          "Track everything",
		Comparison:    "more_than",
		Recurrence:    "daily",
		TargetSeconds: 3600,
		StartDate:     today,
	})
	if err != nil {
		t.Fatalf("create goal: %v", err)
	}

	// Create two time entries today (30min + 45min = 4500 seconds)
	_, err = trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "Entry 1",
		Start:       today.Add(8 * time.Hour),
		Stop:        timePtr(today.Add(8*time.Hour + 30*time.Minute)),
		CreatedWith: "goal-progress-test",
	})
	if err != nil {
		t.Fatalf("create entry 1: %v", err)
	}
	_, err = trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "Entry 2",
		Start:       today.Add(10 * time.Hour),
		Stop:        timePtr(today.Add(10*time.Hour + 45*time.Minute)),
		CreatedWith: "goal-progress-test",
	})
	if err != nil {
		t.Fatalf("create entry 2: %v", err)
	}

	active := true
	goals, err := trackingService.ListGoals(ctx, workspaceID, trackingapplication.ListGoalsFilter{
		UserID: userID,
		Active: &active,
	})
	if err != nil {
		t.Fatalf("list goals: %v", err)
	}
	if len(goals) != 1 {
		t.Fatalf("expected 1 goal, got %d", len(goals))
	}
	if goals[0].CurrentRecurrenceTrackedSeconds != 4500 {
		t.Fatalf("expected 4500 tracked seconds, got %d", goals[0].CurrentRecurrenceTrackedSeconds)
	}
}

func timePtr(t time.Time) *time.Time { return &t }

func seedGoalProgressWorkspace(t *testing.T, ctx context.Context, database *pgtest.Database, prefix string) (int64, int64) {
	t.Helper()

	tenantStore := tenantpostgres.NewStore(database.Pool)
	_, workspace, err := tenantStore.CreateOrganization(
		ctx,
		"Goal Progress Org",
		"Goal Progress Workspace",
		tenantdomain.DefaultWorkspaceSettings(),
	)
	if err != nil {
		t.Fatalf("create tenant state: %v", err)
	}

	userID := int64(time.Now().UnixNano() % 1000000000)
	uniqueEmail := fmt.Sprintf("%s-%d@example.com", prefix, userID)
	uniqueAPIToken := fmt.Sprintf("token-%s-%d", prefix, userID)

	user, err := identitydomain.RegisterUser(identitydomain.RegisterParams{
		ID:       userID,
		Email:    uniqueEmail,
		FullName: "Goal User",
		Password: "secret1",
		APIToken: uniqueAPIToken,
	})
	if err != nil {
		t.Fatalf("register user: %v", err)
	}
	if err := identitypostgres.NewUserRepository(database.Pool).Save(ctx, user); err != nil {
		t.Fatalf("save user: %v", err)
	}

	return int64(workspace.ID()), userID
}
