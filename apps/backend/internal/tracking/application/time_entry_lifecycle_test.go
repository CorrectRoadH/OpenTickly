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

// TestCreateStoppedTimeEntryPersistsFact verifies VAL-ENTRY-001:
// Creating a stopped time entry with explicit time information saves one canonical
// entry whose readback preserves the submitted description, workspace ownership,
// selected project/task/tag associations, and self-consistent time fields.
func TestCreateStoppedTimeEntryPersistsFact(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "entry-lifecycle")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// Create a project for associations
	project, err := catalogService.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Entry Lifecycle Project",
	})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}

	start := time.Date(2026, 3, 23, 10, 0, 0, 0, time.UTC)
	stop := time.Date(2026, 3, 23, 11, 30, 0, 0, time.UTC)
	description := "Writing documentation for tracking module"

	created, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: description,
		Start:       start,
		Stop:        &stop,
		ProjectID:   &project.ID,
		Billable:    true,
		CreatedWith: "entry-lifecycle-test",
	})
	if err != nil {
		t.Fatalf("create stopped time entry: %v", err)
	}

	// Verify ID is assigned
	if created.ID == 0 {
		t.Fatalf("expected non-zero entry ID after creation")
	}

	// Verify time fields are preserved
	if !created.Start.Equal(start) {
		t.Fatalf("expected start %s, got %s", start, created.Start)
	}
	if created.Stop == nil || !created.Stop.Equal(stop) {
		t.Fatalf("expected stop %s, got %#v", stop, created.Stop)
	}

	// Verify duration is self-consistent
	expectedDuration := int(stop.Sub(start).Seconds())
	if created.Duration != expectedDuration {
		t.Fatalf("expected duration %d seconds, got %d", expectedDuration, created.Duration)
	}

	// Verify description is preserved
	if created.Description != description {
		t.Fatalf("expected description %q, got %q", description, created.Description)
	}

	// Verify project association
	if created.ProjectID == nil || *created.ProjectID != project.ID {
		t.Fatalf("expected project ID %d, got %#v", project.ID, created.ProjectID)
	}

	// Verify workspace and user ownership
	if created.WorkspaceID != workspaceID {
		t.Fatalf("expected workspace ID %d, got %d", workspaceID, created.WorkspaceID)
	}
	if created.UserID != userID {
		t.Fatalf("expected user ID %d, got %d", userID, created.UserID)
	}

	// Direct readback by ID must match
	readback, err := trackingService.GetTimeEntry(ctx, workspaceID, userID, created.ID)
	if err != nil {
		t.Fatalf("get time entry by ID: %v", err)
	}
	if readback.ID != created.ID {
		t.Fatalf("expected readback ID %d, got %d", created.ID, readback.ID)
	}
	if readback.Description != description {
		t.Fatalf("expected readback description %q, got %q", description, readback.Description)
	}
	if readback.Duration != expectedDuration {
		t.Fatalf("expected readback duration %d, got %d", expectedDuration, readback.Duration)
	}
}

// TestUpdateStoppedTimeEntryUpdatesCanonicalFact verifies VAL-ENTRY-002:
// Editing an existing stopped time entry and saving it changes the canonical
// stored fact. Reopening or directly re-reading the entry returns the updated values.
func TestUpdateStoppedTimeEntryUpdatesCanonicalFact(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "update-entry")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	start := time.Date(2026, 3, 23, 10, 0, 0, 0, time.UTC)
	stop := time.Date(2026, 3, 23, 10, 30, 0, 0, time.UTC)
	entry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "Original description",
		Start:       start,
		Stop:        &stop,
		CreatedWith: "update-entry-test",
	})
	if err != nil {
		t.Fatalf("create time entry: %v", err)
	}

	// Update the time range
	newStart := time.Date(2026, 3, 23, 9, 45, 0, 0, time.UTC)
	newStop := time.Date(2026, 3, 23, 11, 0, 0, 0, time.UTC)
	newDescription := "Updated description with more detail"

	updated, err := trackingService.UpdateTimeEntry(ctx, trackingapplication.UpdateTimeEntryCommand{
		WorkspaceID:   workspaceID,
		TimeEntryID:   entry.ID,
		UserID:        userID,
		Description:   &newDescription,
		Start:         &newStart,
		Stop:          &newStop,
	})
	if err != nil {
		t.Fatalf("update time entry: %v", err)
	}

	// Verify updated fields
	if !updated.Start.Equal(newStart) {
		t.Fatalf("expected updated start %s, got %s", newStart, updated.Start)
	}
	if updated.Stop == nil || !updated.Stop.Equal(newStop) {
		t.Fatalf("expected updated stop %s, got %#v", newStop, updated.Stop)
	}
	if updated.Description != newDescription {
		t.Fatalf("expected updated description %q, got %q", newDescription, updated.Description)
	}

	// Verify duration is self-consistent after update
	expectedDuration := int(newStop.Sub(newStart).Seconds())
	if updated.Duration != expectedDuration {
		t.Fatalf("expected updated duration %d, got %d", expectedDuration, updated.Duration)
	}

	// Direct readback after update must return updated values
	readback, err := trackingService.GetTimeEntry(ctx, workspaceID, userID, entry.ID)
	if err != nil {
		t.Fatalf("get time entry after update: %v", err)
	}
	if !readback.Start.Equal(newStart) {
		t.Fatalf("expected readback start %s, got %s", newStart, readback.Start)
	}
	if readback.Stop == nil || !readback.Stop.Equal(newStop) {
		t.Fatalf("expected readback stop %s, got %#v", newStop, readback.Stop)
	}
	if readback.Duration != expectedDuration {
		t.Fatalf("expected readback duration %d, got %d", expectedDuration, readback.Duration)
	}
}

// TestInvalidTimeRangeIsRejectedWithoutMutation verifies VAL-ENTRY-003:
// If a user submits an invalid start/stop/duration combination such as
// stop < start, the system rejects the save with a fixed failure result
// and preserves the prior valid state.
func TestInvalidTimeRangeIsRejectedWithoutMutation(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "invalid-range")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// Create a valid entry first
	start := time.Date(2026, 3, 23, 10, 0, 0, 0, time.UTC)
	stop := time.Date(2026, 3, 23, 10, 30, 0, 0, time.UTC)
	entry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "Valid entry",
		Start:       start,
		Stop:        &stop,
		CreatedWith: "invalid-range-test",
	})
	if err != nil {
		t.Fatalf("create valid time entry: %v", err)
	}
	originalDuration := entry.Duration

	// Attempt to update with stop before start - should fail
	invalidStop := time.Date(2026, 3, 23, 9, 0, 0, 0, time.UTC) // before start
	_, err = trackingService.UpdateTimeEntry(ctx, trackingapplication.UpdateTimeEntryCommand{
		WorkspaceID: workspaceID,
		TimeEntryID: entry.ID,
		UserID:      userID,
		Start:       &start,
		Stop:        &invalidStop,
	})
	if err == nil {
		t.Fatalf("expected error when stop is before start, got nil")
	}
	if err != trackingapplication.ErrInvalidTimeRange {
		t.Fatalf("expected ErrInvalidTimeRange, got %v", err)
	}

	// Verify prior state is preserved
	readback, err := trackingService.GetTimeEntry(ctx, workspaceID, userID, entry.ID)
	if err != nil {
		t.Fatalf("get time entry after failed update: %v", err)
	}
	if !readback.Start.Equal(start) {
		t.Fatalf("expected preserved start %s, got %s", start, readback.Start)
	}
	if readback.Stop == nil || !readback.Stop.Equal(stop) {
		t.Fatalf("expected preserved stop %s, got %#v", stop, readback.Stop)
	}
	if readback.Duration != originalDuration {
		t.Fatalf("expected preserved duration %d, got %d", originalDuration, readback.Duration)
	}
}

// TestGetCurrentTimeEntryReturnsNullWhenIdle verifies VAL-ENTRY-004:
// When no timer is running, GetCurrentTimeEntry succeeds with an empty view
// (ID == 0), and the timer UI treats that exact transport result as the
// idle state rather than as a 404 or generic failure condition.
func TestGetCurrentTimeEntryReturnsNullWhenIdle(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	_, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "idle-current")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// No running entry exists - should return empty view
	entry, err := trackingService.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		t.Fatalf("expected no error when no running entry, got %v", err)
	}
	if entry.ID != 0 {
		t.Fatalf("expected empty entry with ID 0 when idle, got ID %d", entry.ID)
	}
}

// TestStartPlusDurationCreatesStoppedEntry verifies VAL-ENTRY-005:
// Creating a time entry with start plus a non-negative duration and no
// explicit stop materializes a stopped entry instead of a running timer.
// The readback includes a computed stop that is consistent with start + duration.
func TestStartPlusDurationCreatesStoppedEntry(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "duration-entry")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	start := time.Date(2026, 3, 23, 14, 0, 0, 0, time.UTC)
	duration := 3600 // 1 hour in seconds

	// Create entry with start + duration, no explicit stop
	entry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "Duration-based entry",
		Start:       start,
		Duration:    &duration,
		CreatedWith: "duration-entry-test",
	})
	if err != nil {
		t.Fatalf("create time entry with duration: %v", err)
	}

	// Must have a stop - it's a stopped entry, not running
	if entry.Stop == nil {
		t.Fatalf("expected computed stop for duration-based entry, got nil")
	}

	// Stop must equal start + duration
	expectedStop := start.Add(time.Duration(duration) * time.Second)
	if !entry.Stop.Equal(expectedStop) {
		t.Fatalf("expected computed stop %s, got %s", expectedStop, *entry.Stop)
	}

	// Duration must match
	if entry.Duration != duration {
		t.Fatalf("expected duration %d, got %d", duration, entry.Duration)
	}

	// Entry must NOT appear as current running timer
	current, err := trackingService.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		t.Fatalf("get current time entry: %v", err)
	}
	if current.ID == entry.ID {
		t.Fatalf("expected duration-based entry to NOT appear as current running timer, but it did")
	}

	// Direct readback by ID must show stopped entry
	readback, err := trackingService.GetTimeEntry(ctx, workspaceID, userID, entry.ID)
	if err != nil {
		t.Fatalf("get time entry by ID: %v", err)
	}
	if readback.Stop == nil {
		t.Fatalf("expected readback stop to be set, got nil")
	}
	if !readback.Stop.Equal(expectedStop) {
		t.Fatalf("expected readback stop %s, got %s", expectedStop, *readback.Stop)
	}
}

// seedTrackingWorkspaceWithUniqueEmail creates a workspace and user with a unique email
// to avoid conflicts in parallel test execution.
func seedTrackingWorkspaceWithUniqueEmail(t *testing.T, ctx context.Context, database *pgtest.Database, prefix string) (int64, int64) {
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

	// Use unique user ID, email, and API token based on timestamp to avoid conflicts
	userID := int64(time.Now().UnixNano() % 1000000000)
	uniqueEmail := fmt.Sprintf("%s-%d@example.com", prefix, userID)
	uniqueAPIToken := fmt.Sprintf("token-%s-%d", prefix, userID)

	user, err := identitydomain.RegisterUser(identitydomain.RegisterParams{
		ID:       userID,
		Email:    uniqueEmail,
		FullName: "Tracking User",
		Password: "secret1",
		APIToken: uniqueAPIToken,
	})
	if err != nil {
		t.Fatalf("register tracking user: %v", err)
	}
	if err := identitypostgres.NewUserRepository(database.Pool).Save(ctx, user); err != nil {
		t.Fatalf("save tracking user: %v", err)
	}

	return int64(workspace.ID()), userID
}
